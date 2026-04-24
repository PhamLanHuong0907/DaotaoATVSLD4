from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from app.schemas.report_schemas import ReportExportRequest
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/dashboard")
async def get_dashboard():
    """Dashboard summary: active courses, users, pass rate, etc."""
    return await report_service.get_dashboard()


@router.get("/dashboard-extended")
async def get_dashboard_extended():
    """Extended Safetrak-style dashboard payload."""
    return await report_service.get_dashboard_extended()


@router.get("/training-list")
async def get_training_list(
    department_id: Optional[str] = None,
    occupation: Optional[str] = None,
):
    """Training list by department."""
    return await report_service.get_training_list(department_id, occupation)


@router.get("/exam-results")
async def get_exam_results(
    exam_type: Optional[str] = None,
    occupation: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    """Exam results report."""
    return await report_service.get_exam_results(exam_type, occupation, date_from, date_to)


@router.get("/individual/{user_id}")
async def get_individual_record(user_id: str):
    """Individual training record."""
    try:
        return await report_service.get_individual_record(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/statistics")
async def get_statistics(
    group_by: str = Query(default="occupation"),
    department_id: Optional[str] = None,
):
    """Aggregated statistics by occupation, department, etc."""
    return await report_service.get_statistics(group_by, department_id)


@router.get("/by-department")
async def get_by_department():
    """Pass/fail counts grouped by department, with totals."""
    from app.models.exam import ExamSubmission
    from app.models.user import User
    from app.models.department import Department

    # Build user→department lookup
    users = await User.find().to_list()
    user_dept = {str(u.id): u.department_id for u in users}

    # Department metadata
    departments = await Department.find().to_list()
    dept_meta = {str(d.id): {"name": d.name, "code": d.code} for d in departments}

    # Walk submissions
    submissions = await ExamSubmission.find().to_list()
    buckets: dict[str, dict] = {}
    for s in submissions:
        dept_id = user_dept.get(s.user_id) or "_unassigned"
        b = buckets.setdefault(dept_id, {
            "department_id": dept_id,
            "department_name": dept_meta.get(dept_id, {}).get("name", "Chưa gán phòng ban"),
            "department_code": dept_meta.get(dept_id, {}).get("code", ""),
            "total": 0,
            "excellent": 0,
            "good": 0,
            "average": 0,
            "fail": 0,
            "total_score": 0.0,
        })
        b["total"] += 1
        b["total_score"] += s.total_score or 0.0
        if s.classification:
            b[s.classification.value] = b.get(s.classification.value, 0) + 1

    items = []
    for b in buckets.values():
        passed = b["excellent"] + b["good"] + b["average"]
        items.append({
            **b,
            "passed": passed,
            "pass_rate": round(passed / b["total"] * 100, 1) if b["total"] else 0,
            "average_score": round(b["total_score"] / b["total"], 2) if b["total"] else 0,
        })
    items.sort(key=lambda x: x["total"], reverse=True)
    return {"items": items, "total_submissions": sum(i["total"] for i in items)}


@router.post("/export/excel")
async def export_excel(data: ReportExportRequest):
    """Export report to Excel file."""
    try:
        if data.report_type == "training_list":
            filepath = await report_service.export_training_list_excel(
                data.department_id, data.occupation,
            )
        elif data.report_type == "exam_results":
            filepath = await report_service.export_exam_results_excel(
                data.exam_type, data.occupation, data.date_from, data.date_to,
            )
        elif data.report_type == "individual" and data.user_id:
            filepath = await report_service.export_individual_record_excel(data.user_id)
        else:
            raise HTTPException(status_code=400, detail="Invalid report type")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return FileResponse(
        path=filepath,
        filename=filepath.split("/")[-1].split("\\")[-1],
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.post("/export/pdf")
async def export_pdf(data: ReportExportRequest):
    """Export report to PDF file."""
    try:
        filepath = await report_service.export_report_to_pdf(
            report_type=data.report_type,
            department_id=data.department_id,
            user_id=data.user_id,
            occupation=data.occupation,
            exam_type=data.exam_type,
            date_from=data.date_from,
            date_to=data.date_to,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return FileResponse(
        path=filepath,
        filename=filepath.split("/")[-1].split("\\")[-1],
        media_type="application/pdf",
    )
