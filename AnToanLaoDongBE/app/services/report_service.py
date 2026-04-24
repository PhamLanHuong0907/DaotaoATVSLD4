import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from bson.errors import InvalidId
from beanie import PydanticObjectId

from app.models.user import User
from app.models.department import Department
from app.models.exam import Exam, ExamSubmission
from app.models.course import Course
from app.models.question import Question
from app.models.document import TrainingDocument
from app.models.enums import ApprovalStatus, ResultClassification
from app.utils.excel_export import (
    export_training_list, export_exam_results, export_individual_record,
)
from app.utils.pdf_export import export_report_pdf

logger = logging.getLogger(__name__)


async def _safe_get_user(user_id: str) -> Optional[User]:
    """Safely get a user by ID, returning None for invalid IDs."""
    try:
        return await User.get(PydanticObjectId(user_id))
    except (InvalidId, Exception):
        return None


async def _safe_get_exam(exam_id: str) -> Optional[Exam]:
    """Safely get an exam by ID, returning None for invalid IDs."""
    try:
        return await Exam.get(PydanticObjectId(exam_id))
    except (InvalidId, Exception):
        return None


async def get_dashboard() -> dict:
    """Dashboard summary data."""
    active_courses = await Course.find({"status": ApprovalStatus.APPROVED}).count()
    total_documents = await TrainingDocument.find().count()
    total_questions = await Question.find({"status": ApprovalStatus.APPROVED}).count()
    total_users = await User.find({"is_active": True}).count()
    total_exams = await Exam.find({"is_active": True}).count()
    total_submissions = await ExamSubmission.find().count()

    # Pass rate
    passed = await ExamSubmission.find(
        {"classification": {"$ne": ResultClassification.FAIL}}
    ).count()
    pass_rate = round((passed / total_submissions * 100), 1) if total_submissions > 0 else 0

    return {
        "active_courses": active_courses,
        "total_documents": total_documents,
        "total_questions": total_questions,
        "total_users": total_users,
        "active_exams": total_exams,
        "total_submissions": total_submissions,
        "pass_rate": pass_rate,
    }


def _dist(scores: list[float]) -> list[dict]:
    """5-bucket score distribution (0-2, 2-4, 4-6, 6-8, 8-10)."""
    buckets = [
        ("0-2", 0, 2), ("2-4", 2, 4), ("4-6", 4, 6),
        ("6-8", 6, 8), ("8-10", 8, 10.01),
    ]
    return [
        {"range": label, "count": sum(1 for s in scores if lo <= s < hi)}
        for label, lo, hi in buckets
    ]


async def get_dashboard_extended() -> dict:
    """Safetrak-style extended dashboard payload."""
    from app.models.exam_room import ExamRoom
    from app.models.facility import Facility
    from app.models.certificate import Certificate
    from app.models.lesson_progress import LessonProgress

    base = await get_dashboard()

    now = datetime.now(timezone.utc)
    # ---- 12-month trend ----
    trend = []
    for i in range(11, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (month_start + timedelta(days=32)).replace(day=1)
        subs = await ExamSubmission.find({
            "submitted_at": {"$gte": month_start, "$lt": next_month}
        }).to_list()
        total = len(subs)
        passed = sum(1 for s in subs if s.classification and s.classification != ResultClassification.FAIL)
        trend.append({
            "month": month_start.strftime("%Y-%m"),
            "label": f"T{month_start.month}",
            "submissions": total,
            "pass_rate": round(passed / total * 100, 1) if total else 0,
        })

    # ---- classification breakdown ----
    all_subs = await ExamSubmission.find().to_list()
    breakdown = {"excellent": 0, "good": 0, "average": 0, "fail": 0}
    for s in all_subs:
        if s.classification:
            breakdown[s.classification.value] = breakdown.get(s.classification.value, 0) + 1

    # ---- department compliance ----
    users = await User.find({"is_active": True}).to_list()
    depts = await Department.find().to_list()
    dept_map = {str(d.id): d for d in depts}
    user_dept = {str(u.id): u.department_id for u in users}

    passed_users: dict[str, set] = {}
    for s in all_subs:
        if s.classification and s.classification != ResultClassification.FAIL:
            dept_id = user_dept.get(s.user_id)
            if dept_id:
                passed_users.setdefault(dept_id, set()).add(s.user_id)

    dept_totals: dict[str, int] = {}
    for u in users:
        if u.department_id:
            dept_totals[u.department_id] = dept_totals.get(u.department_id, 0) + 1

    dept_compliance = []
    for did, total in dept_totals.items():
        d = dept_map.get(did)
        if not d:
            continue
        passed = len(passed_users.get(did, set()))
        dept_compliance.append({
            "id": did,
            "code": d.code,
            "name": d.name,
            "total": total,
            "passed_users": passed,
            "compliance": round(passed / total * 100, 1) if total else 0,
        })
    dept_compliance.sort(key=lambda x: x["compliance"], reverse=True)

    # ---- recent activity ----
    recent = await ExamSubmission.find().sort("-submitted_at").limit(10).to_list()
    user_map = {}
    for s in recent:
        if s.user_id not in user_map:
            u = await _safe_get_user(s.user_id)
            user_map[s.user_id] = u
    recent_activity = []
    for s in recent:
        u = user_map.get(s.user_id)
        recent_activity.append({
            "type": "submission",
            "user": u.full_name if u else "",
            "action": f"Nộp bài, điểm {s.total_score}",
            "time": s.submitted_at.isoformat() if s.submitted_at else "",
        })

    # ---- upcoming events (next 30 days) ----
    upcoming = await ExamRoom.find({
        "scheduled_start": {"$gte": now, "$lt": now + timedelta(days=30)}
    }).sort("scheduled_start").limit(10).to_list()
    upcoming_events = []
    for r in upcoming:
        d = dept_map.get(r.department_id)
        upcoming_events.append({
            "id": str(r.id),
            "title": r.name,
            "dept": d.name if d else "",
            "date": r.scheduled_start.isoformat(),
            "urgent": (r.scheduled_start - now).days <= 3,
        })

    # ---- counts ----
    total_departments = await Department.find().count()
    total_facilities = await Facility.find().count()
    total_certificates = await Certificate.find({"revoked": False}).count()

    # ---- exams list with drilldowns ----
    exams = await Exam.find({"is_active": True}).to_list()
    exams_list = []
    for e in exams:
        eid = str(e.id)
        rooms = await ExamRoom.find({"exam_id": eid}).to_list()
        e_subs = [s for s in all_subs if s.exam_id == eid]
        scores = [s.total_score for s in e_subs]
        passed_cnt = sum(1 for s in e_subs if s.classification and s.classification != ResultClassification.FAIL)

        # departments breakdown for this exam
        dept_stats: dict[str, dict] = {}
        for s in e_subs:
            did = user_dept.get(s.user_id)
            if not did:
                continue
            d = dept_map.get(did)
            if not d:
                continue
            ds = dept_stats.setdefault(did, {
                "id": did, "name": d.name,
                "totalCandidates": 0, "passed": 0,
                "_scores": [],
            })
            ds["totalCandidates"] += 1
            ds["_scores"].append(s.total_score)
            if s.classification and s.classification != ResultClassification.FAIL:
                ds["passed"] += 1
        dept_list = []
        for ds in dept_stats.values():
            sc = ds.pop("_scores")
            dept_list.append({
                **ds,
                "averageScore": round(sum(sc) / len(sc), 2) if sc else 0,
                "scoreDistribution": _dist(sc),
            })

        # rooms breakdown
        room_list = []
        for r in rooms:
            r_subs = [s for s in e_subs if any(c.submission_id == str(s.id) for c in r.candidates)]
            r_passed = sum(1 for s in r_subs if s.classification and s.classification != ResultClassification.FAIL)
            room_list.append({
                "id": str(r.id),
                "name": r.name,
                "capacity": r.capacity,
                "candidates": len(r.candidates),
                "passed": r_passed,
            })

        # top candidates
        top = sorted(e_subs, key=lambda s: s.total_score, reverse=True)[:10]
        top_list = []
        for s in top:
            u = user_map.get(s.user_id) or await _safe_get_user(s.user_id)
            user_map[s.user_id] = u
            top_list.append({
                "user_id": s.user_id,
                "name": u.full_name if u else "",
                "employee_id": u.employee_id if u else "",
                "score": s.total_score,
                "classification": s.classification.value if s.classification else "",
            })

        exams_list.append({
            "id": eid,
            "name": e.name,
            "totalCandidates": len(e_subs),
            "passed": passed_cnt,
            "averageScore": round(sum(scores) / len(scores), 2) if scores else 0,
            "scoreDistribution": _dist(scores),
            "rooms": room_list,
            "departments": dept_list,
            "topCandidates": top_list,
        })

    # ---- courses list ----
    courses = await Course.find().to_list()
    courses_list = []
    for c in courses:
        cid = str(c.id)
        progresses = await LessonProgress.find({"course_id": cid}).to_list()
        learners = {p.user_id for p in progresses}
        completed = {p.user_id for p in progresses if (getattr(p, "status", None) and str(p.status.value if hasattr(p.status, "value") else p.status) == "completed")}
        courses_list.append({
            "id": cid,
            "name": getattr(c, "title", getattr(c, "name", "")),
            "status": c.status.value if hasattr(c.status, "value") else str(c.status),
            "lessonCount": len(c.lessons) if c.lessons else 0,
            "learners": len(learners),
            "completed": len(completed),
            "completionRate": round(len(completed) / len(learners) * 100, 1) if learners else 0,
        })

    # ---- course monthly stats ----
    course_monthly_stats = []
    for i in range(11, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (month_start + timedelta(days=32)).replace(day=1)
        progs = await LessonProgress.find({
            "last_viewed_at": {"$gte": month_start, "$lt": next_month}
        }).to_list()
        total = len(progs)
        done = sum(1 for p in progs if (getattr(p, "status", None) and str(p.status.value if hasattr(p.status, "value") else p.status) == "completed"))
        course_monthly_stats.append({
            "month": month_start.strftime("%Y-%m"),
            "completionRate": round(done / total * 100, 1) if total else 0,
            "requiredCourses": total,
        })

    return {
        **base,
        "trend_12_months": trend,
        "classification_breakdown": breakdown,
        "department_compliance": dept_compliance,
        "recent_activity": recent_activity,
        "upcoming_events": upcoming_events,
        "total_departments": total_departments,
        "total_facilities": total_facilities,
        "total_certificates": total_certificates,
        "exams_list": exams_list,
        "courses_list": courses_list,
        "course_monthly_stats": course_monthly_stats,
    }


async def get_training_list(
    department_id: Optional[str] = None,
    occupation: Optional[str] = None,
) -> dict:
    """Training list by department."""
    # Get users
    user_query = {"is_active": True}
    if department_id:
        user_query["department_id"] = department_id
    if occupation:
        user_query["occupation"] = occupation
    users = await User.find(user_query).to_list()

    department_name = ""
    if department_id:
        dept = await Department.get(PydanticObjectId(department_id))
        if dept:
            department_name = dept.name

    items = []
    for user in users:
        # Get latest submission for this user
        latest_sub = await ExamSubmission.find(
            {"user_id": str(user.id)}
        ).sort("-submitted_at").first_or_none()

        exam_name = ""
        score = ""
        classification = ""

        if latest_sub:
            exam = await _safe_get_exam(latest_sub.exam_id)
            exam_name = exam.name if exam else ""
            score = latest_sub.total_score
            classification = latest_sub.classification.value if latest_sub.classification else ""

        items.append({
            "full_name": user.full_name,
            "employee_id": user.employee_id,
            "occupation": user.occupation,
            "skill_level": user.skill_level,
            "exam_name": exam_name,
            "score": score,
            "classification": classification,
        })

    return {
        "department_name": department_name,
        "items": items,
        "total": len(items),
    }


async def get_exam_results(
    exam_type: Optional[str] = None,
    occupation: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> dict:
    """Exam results report."""
    sub_query = {}
    if date_from:
        sub_query["submitted_at"] = {"$gte": datetime.fromisoformat(date_from)}
    if date_to:
        if "submitted_at" in sub_query:
            sub_query["submitted_at"]["$lte"] = datetime.fromisoformat(date_to)
        else:
            sub_query["submitted_at"] = {"$lte": datetime.fromisoformat(date_to)}

    submissions = await ExamSubmission.find(sub_query).sort("-submitted_at").to_list()

    items = []
    for sub in submissions:
        user = await _safe_get_user(sub.user_id)
        exam = await _safe_get_exam(sub.exam_id)

        if exam_type and exam and exam.exam_type.value != exam_type:
            continue
        if occupation and user and user.occupation != occupation:
            continue

        items.append({
            "full_name": user.full_name if user else "",
            "employee_id": user.employee_id if user else "",
            "occupation": user.occupation if user else "",
            "score": sub.total_score,
            "classification": sub.classification.value if sub.classification else "",
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else "",
        })

    return {"items": items, "total": len(items)}


async def get_individual_record(user_id: str) -> dict:
    """Individual training record."""
    user = await _safe_get_user(user_id)
    if not user:
        raise ValueError("User not found")

    submissions = await ExamSubmission.find(
        {"user_id": user_id}
    ).sort("-submitted_at").to_list()

    exam_history = []
    for sub in submissions:
        exam = await _safe_get_exam(sub.exam_id)
        exam_history.append({
            "exam_name": exam.name if exam else "",
            "exam_type": exam.exam_type.value if exam else "",
            "score": sub.total_score,
            "classification": sub.classification.value if sub.classification else "",
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else "",
        })

    return {
        "user": {
            "full_name": user.full_name,
            "employee_id": user.employee_id,
            "occupation": user.occupation,
            "skill_level": user.skill_level,
            "department_id": user.department_id,
        },
        "exam_history": exam_history,
        "total_exams": len(exam_history),
    }


async def get_statistics(
    group_by: str = "occupation",
    department_id: Optional[str] = None,
) -> dict:
    """Aggregated statistics."""
    submissions = await ExamSubmission.find().to_list()

    # Group data
    stats = {}
    for sub in submissions:
        user = await _safe_get_user(sub.user_id)
        if department_id and (not user or user.department_id != department_id):
            continue

        if group_by == "classification":
            key = sub.classification.value if sub.classification else "Không xác định"
        elif user:
            key = getattr(user, group_by, "Không xác định") or "Không xác định"
        else:
            key = "Không xác định"

        if key not in stats:
            stats[key] = {
                "total": 0,
                "passed": 0,
                "total_score": 0.0,
                "excellent": 0,
                "good": 0,
                "average": 0,
                "fail": 0,
            }
        s = stats[key]
        s["total"] += 1
        s["total_score"] += sub.total_score
        if sub.classification:
            s[sub.classification.value] += 1
            if sub.classification != ResultClassification.FAIL:
                s["passed"] += 1

    # Compute averages
    result = []
    for key, s in stats.items():
        result.append({
            "group": key,
            "total": s["total"],
            "passed": s["passed"],
            "pass_rate": round(s["passed"] / s["total"] * 100, 1) if s["total"] > 0 else 0,
            "avg_score": round(s["total_score"] / s["total"], 2) if s["total"] > 0 else 0,
            "excellent": s["excellent"],
            "good": s["good"],
            "average": s["average"],
            "fail": s["fail"],
        })

    return {"group_by": group_by, "statistics": result}


# --- Export functions ---

async def export_training_list_excel(
    department_id: Optional[str] = None,
    occupation: Optional[str] = None,
) -> str:
    data = await get_training_list(department_id, occupation)
    return await export_training_list(data)


async def export_exam_results_excel(
    exam_type: Optional[str] = None,
    occupation: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> str:
    data = await get_exam_results(exam_type, occupation, date_from, date_to)
    return await export_exam_results(data)


async def export_individual_record_excel(user_id: str) -> str:
    data = await get_individual_record(user_id)
    return await export_individual_record(data)


async def export_report_to_pdf(
    report_type: str,
    department_id: Optional[str] = None,
    user_id: Optional[str] = None,
    occupation: Optional[str] = None,
    exam_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> str:
    """Export any report type to PDF."""
    if report_type == "training_list":
        raw = await get_training_list(department_id, occupation)
        pdf_data = {
            "title": "DANH SACH HUAN LUYEN ATVSLD",
            "subtitle": f"Don vi: {raw.get('department_name', 'Tat ca')}",
            "headers": ["STT", "Ho ten", "Ma NV", "Nganh nghe", "Bac tho", "Ky thi", "Diem", "Xep loai"],
            "table_data": [
                [i + 1, it["full_name"], it["employee_id"], it["occupation"],
                 it["skill_level"], it["exam_name"], it["score"], it["classification"]]
                for i, it in enumerate(raw["items"])
            ],
        }
    elif report_type == "exam_results":
        raw = await get_exam_results(exam_type, occupation, date_from, date_to)
        pdf_data = {
            "title": "KET QUA THI ATVSLD",
            "headers": ["STT", "Ho ten", "Ma NV", "Nganh nghe", "Diem", "Xep loai", "Ngay thi"],
            "table_data": [
                [i + 1, it["full_name"], it["employee_id"], it["occupation"],
                 it["score"], it["classification"], it["submitted_at"]]
                for i, it in enumerate(raw["items"])
            ],
        }
    elif report_type == "individual" and user_id:
        raw = await get_individual_record(user_id)
        u = raw["user"]
        pdf_data = {
            "title": "HO SO HUAN LUYEN CA NHAN",
            "subtitle": f"{u['full_name']} - Ma NV: {u['employee_id']} - {u['occupation']} Bac {u['skill_level']}",
            "headers": ["STT", "Ky thi", "Loai thi", "Diem", "Xep loai", "Ngay thi"],
            "table_data": [
                [i + 1, it["exam_name"], it["exam_type"], it["score"],
                 it["classification"], it["submitted_at"]]
                for i, it in enumerate(raw["exam_history"])
            ],
        }
    else:
        pdf_data = {"title": "BAO CAO", "table_data": []}

    return await export_report_pdf(pdf_data, report_type)
