import math
import os
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from app.models.enums import ExamType, ApprovalStatus, ExamKind
from app.utils.exam_pdf import generate_exam_paper_pdf, generate_exam_variants_zip
from app.schemas.exam_schemas import (
    ExamTemplateCreate, ExamTemplateUpdate, ExamTemplateResponse,
    ExamGenerateRequest, ExamResponse, ExamDetailResponse, ExamQuestionDetail,
    ExamTakeResponse,
    ExamSubmitRequest, SubmissionResponse, SubmissionListResponse,
)
from app.schemas.common import StatusResponse, StatusUpdateRequest
from app.utils.pagination import PaginatedResponse
from app.services import exam_service
from app.models.exam_period import ExamPeriod

router = APIRouter(prefix="/exams", tags=["Exams"])


# --- Template Endpoints ---

@router.post("/templates", response_model=ExamTemplateResponse)
async def create_template(data: ExamTemplateCreate):
    template = await exam_service.create_template(data)
    return ExamTemplateResponse(id=str(template.id), **template.model_dump(exclude={"id"}))


@router.get("/templates", response_model=PaginatedResponse[ExamTemplateResponse])
async def list_templates(
    exam_type: Optional[ExamType] = None,
    status: Optional[ApprovalStatus] = None,
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    skip = (page - 1) * page_size
    templates, total = await exam_service.get_templates(
        exam_type=exam_type, status=status,
        occupation=occupation, skill_level=skill_level,
        search=search, skip=skip, limit=page_size,
    )
    return PaginatedResponse(
        items=[ExamTemplateResponse(id=str(t.id), **t.model_dump(exclude={"id"})) for t in templates],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/templates/{template_id}", response_model=ExamTemplateResponse)
async def get_template(template_id: str):
    template = await exam_service.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return ExamTemplateResponse(id=str(template.id), **template.model_dump(exclude={"id"}))


@router.put("/templates/{template_id}", response_model=ExamTemplateResponse)
async def update_template(template_id: str, data: ExamTemplateUpdate):
    template = await exam_service.update_template(template_id, data)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return ExamTemplateResponse(id=str(template.id), **template.model_dump(exclude={"id"}))


@router.patch("/templates/{template_id}/status", response_model=ExamTemplateResponse)
async def update_template_status(template_id: str, data: StatusUpdateRequest):
    try:
        status = ApprovalStatus(data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")
    template = await exam_service.update_template_status(template_id, status, data.reviewed_by)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return ExamTemplateResponse(id=str(template.id), **template.model_dump(exclude={"id"}))


@router.delete("/templates/{template_id}", response_model=StatusResponse)
async def delete_template(template_id: str):
    success = await exam_service.delete_template(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return StatusResponse(success=True, message="Template deleted")


# --- Exam Endpoints ---

@router.post("/generate", response_model=ExamResponse)
async def generate_exam(data: ExamGenerateRequest):
    """Generate exam from approved template by selecting questions from bank."""
    try:
        exam = await exam_service.generate_exam(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ExamResponse(
        id=str(exam.id),
        total_questions=len(exam.questions),
        **exam.model_dump(include={
            "name", "exam_type", "exam_mode", "template_id",
            "occupation", "skill_level", "total_points",
            "duration_minutes", "passing_score", "scheduled_date",
            "is_active", "created_by", "created_at",
        }),
    )


@router.get("", response_model=PaginatedResponse[ExamResponse])
async def list_exams(
    exam_type: Optional[ExamType] = None,
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    exam_period_id: Optional[str] = None,
    exam_kind: Optional[ExamKind] = None,
    is_active: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=500),
):
    skip = (page - 1) * page_size
    exams, total = await exam_service.get_exams(
        exam_type=exam_type, occupation=occupation,
        skill_level=skill_level, exam_period_id=exam_period_id,
        exam_kind=exam_kind,
        is_active=is_active,
        skip=skip, limit=page_size,
    )
    # Enrich with period data
    enriched_items = []
    period_cache = {}

    for e in exams:
        period_name = None
        scheduled_start = None
        scheduled_end = None
        
        period_id = getattr(e, "exam_period_id", None)
        if period_id:
            try:
                # Beanie .get() usually handles string IDs directly
                if str(period_id) not in period_cache:
                    period = await ExamPeriod.get(str(period_id))
                    period_cache[str(period_id)] = period
                
                p = period_cache[str(period_id)]
                if p:
                    period_name = p.name
                    scheduled_start = p.start_date
                    scheduled_end = p.end_date
            except Exception:
                pass

        enriched_items.append(
            ExamResponse(
                id=str(e.id),
                total_questions=len(e.questions),
                exam_period_name=period_name,
                scheduled_start=scheduled_start,
                scheduled_end=scheduled_end,
                exam_kind=getattr(e, "exam_kind", "official"),
                exam_period_id=str(period_id) if period_id else None,
                **e.model_dump(include={
                    "name", "exam_type", "exam_mode", "template_id",
                    "occupation", "skill_level", "total_points",
                    "duration_minutes", "passing_score", "scheduled_date",
                    "is_active", "created_by", "created_at",
                }),
            )
        )

    return PaginatedResponse(
        items=enriched_items,
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/{exam_id}", response_model=ExamDetailResponse)
async def get_exam_detail(exam_id: str):
    """Get full exam detail with questions (admin view)."""
    exam = await exam_service.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    period_name = None
    scheduled_start = None
    scheduled_end = None
    period_id = getattr(exam, "exam_period_id", None)
    if period_id:
        try:
            p = await ExamPeriod.get(str(period_id))
            if p:
                period_name = p.name
                scheduled_start = p.start_date
                scheduled_end = p.end_date
        except Exception:
            pass

    return ExamDetailResponse(
        id=str(exam.id),
        total_questions=len(exam.questions),
        exam_period_name=period_name,
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
        exam_kind=getattr(exam, "exam_kind", "official"),
        exam_period_id=str(period_id) if period_id else None,
        questions=[
            ExamQuestionDetail(
                question_id=q.question_id,
                order=q.order,
                content=q.content,
                question_type=q.question_type,
                options=q.options,
                correct_answer=q.correct_answer,
                points=q.points,
            )
            for q in exam.questions
        ],
        **exam.model_dump(include={
            "name", "exam_type", "exam_mode", "template_id",
            "occupation", "skill_level", "total_points",
            "duration_minutes", "passing_score", "scheduled_date",
            "is_active", "created_by", "created_at",
        }),
    )


@router.get("/{exam_id}/print-pdf")
async def print_exam_pdf(exam_id: str, variant: Optional[str] = None):
    """Export the exam as a printable PDF (candidate paper + answer sheet + answer key).

    Used for offline/onsite exams where paper copies are needed.
    """
    exam = await exam_service.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if not exam.questions:
        raise HTTPException(status_code=400, detail="Exam has no questions")

    path = generate_exam_paper_pdf(exam, variant_label=variant)
    filename = os.path.basename(path)
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{exam_id}/print-variants")
async def print_exam_variants(exam_id: str, count: int = 4):
    """Generate N shuffled variants of an exam and return as a ZIP archive.

    Each variant has a different question order + reshuffled MCQ options
    (with answer keys updated correspondingly). Use for in-person exams to
    reduce cheating.
    """
    if count < 1 or count > 20:
        raise HTTPException(status_code=400, detail="count must be 1-20")
    exam = await exam_service.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if not exam.questions:
        raise HTTPException(status_code=400, detail="Exam has no questions")
    path = generate_exam_variants_zip(exam, count=count)
    filename = os.path.basename(path)
    return FileResponse(
        path,
        media_type="application/zip",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{exam_id}/take", response_model=ExamTakeResponse)
async def take_exam(exam_id: str):
    """Get exam questions for test-taker (without correct answers)."""
    result = await exam_service.get_exam_for_taking(exam_id)
    if not result:
        raise HTTPException(status_code=404, detail="Exam not found or not active")
    return ExamTakeResponse(**result)


@router.post("/{exam_id}/submit", response_model=SubmissionResponse)
async def submit_exam(exam_id: str, data: ExamSubmitRequest):
    """Submit exam answers. Auto-grades and classifies result."""
    try:
        submission = await exam_service.submit_exam(exam_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SubmissionResponse(
        id=str(submission.id),
        answers=[a.model_dump() for a in submission.answers],
        **submission.model_dump(include={
            "exam_id", "user_id", "total_score", "total_correct",
            "total_questions", "classification", "started_at",
            "submitted_at", "graded_at", "created_at",
        }),
    )


@router.get("/{exam_id}/submissions", response_model=PaginatedResponse[SubmissionListResponse])
async def list_exam_submissions(
    exam_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
):
    skip = (page - 1) * page_size
    subs, total = await exam_service.get_exam_submissions(exam_id, skip, page_size)
    return PaginatedResponse(
        items=[
            SubmissionListResponse(id=str(s.id), **s.model_dump(include={
                "exam_id", "user_id", "total_score", "total_correct",
                "total_questions", "classification", "submitted_at",
            }))
            for s in subs
        ],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/submissions/{submission_id}", response_model=SubmissionResponse)
async def get_submission(submission_id: str):
    sub = await exam_service.get_submission(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return SubmissionResponse(
        id=str(sub.id),
        answers=[a.model_dump() for a in sub.answers],
        **sub.model_dump(include={
            "exam_id", "user_id", "total_score", "total_correct",
            "total_questions", "classification", "started_at",
            "submitted_at", "graded_at", "created_at",
        }),
    )


@router.get("/submissions/user/{user_id}", response_model=PaginatedResponse[SubmissionListResponse])
async def list_user_submissions(
    user_id: str,
    exam_kind: Optional[ExamKind] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
):
    skip = (page - 1) * page_size
    subs, total = await exam_service.get_user_submissions(user_id, exam_kind, skip, page_size)
    return PaginatedResponse(
        items=[
            SubmissionListResponse(id=str(s.id), **s.model_dump(include={
                "exam_id", "user_id", "total_score", "total_correct",
                "total_questions", "classification", "submitted_at",
            }))
            for s in subs
        ],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
