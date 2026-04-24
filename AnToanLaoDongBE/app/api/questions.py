import math
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response

from app.api.deps import require_staff
from app.models.enums import (
    QuestionType, DifficultyLevel, TrainingGroup, ApprovalStatus,
)
from app.models.user import User
from app.schemas.question_schemas import (
    QuestionCreate, QuestionAIGenerate, QuestionUpdate,
    QuestionResponse, QuestionListResponse, BulkApproveRequest,
)
from app.schemas.common import StatusResponse, StatusUpdateRequest
from app.utils.pagination import PaginatedResponse
from app.services import question_service

router = APIRouter(prefix="/questions", tags=["Question Bank"])


@router.post("", response_model=QuestionResponse)
async def create_question(data: QuestionCreate):
    question = await question_service.create_question(data)
    return QuestionResponse(id=str(question.id), **question.model_dump(exclude={"id"}))


@router.post("/import")
async def import_questions(
    file: UploadFile = File(...),
    user: User = Depends(require_staff()),
):
    """Bulk-import questions from an .xlsx file. See question_import_service for columns."""
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Only .xlsx files are accepted")
    from app.services.question_import_service import import_questions_from_xlsx
    content = await file.read()
    result = await import_questions_from_xlsx(content, default_creator=str(user.id))
    return result


@router.get("/import-template")
async def download_question_import_template():
    """Download the .xlsx template for question import."""
    from app.utils.import_templates import build_question_import_template
    content = build_question_import_template()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="template-nhap-cau-hoi.xlsx"'},
    )


@router.post("/ai-generate", response_model=list[QuestionResponse])
async def ai_generate_questions(data: QuestionAIGenerate):
    """AI generates questions from approved documents/courses. Created as DRAFT."""
    try:
        questions = await question_service.ai_generate_questions(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return [
        QuestionResponse(id=str(q.id), **q.model_dump(exclude={"id"}))
        for q in questions
    ]


@router.get("", response_model=PaginatedResponse[QuestionListResponse])
async def list_questions(
    question_type: Optional[QuestionType] = None,
    difficulty: Optional[DifficultyLevel] = None,
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    training_group: Optional[TrainingGroup] = None,
    topic_tag: Optional[str] = None,
    status: Optional[ApprovalStatus] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    skip = (page - 1) * page_size
    questions, total = await question_service.get_questions(
        question_type=question_type, difficulty=difficulty,
        occupation=occupation, skill_level=skill_level,
        training_group=training_group, topic_tag=topic_tag,
        status=status, skip=skip, limit=page_size,
    )
    return PaginatedResponse(
        items=[
            QuestionListResponse(id=str(q.id), **q.model_dump(
                include={"content", "question_type", "difficulty", "occupation",
                         "skill_level", "training_group", "topic_tags",
                         "ai_generated", "status", "created_at"}
            ))
            for q in questions
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/topic-tags", response_model=list[str])
async def get_topic_tags():
    """Lấy danh sách topic_tags duy nhất từ tất cả câu hỏi."""
    tags = await question_service.get_unique_topic_tags()
    return tags


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(question_id: str):
    question = await question_service.get_question(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return QuestionResponse(id=str(question.id), **question.model_dump(exclude={"id"}))


@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(question_id: str, data: QuestionUpdate):
    question = await question_service.update_question(question_id, data)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return QuestionResponse(id=str(question.id), **question.model_dump(exclude={"id"}))


@router.patch("/{question_id}/status", response_model=QuestionResponse)
async def update_question_status(question_id: str, data: StatusUpdateRequest):
    try:
        status = ApprovalStatus(data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")
    question = await question_service.update_question_status(
        question_id, status, data.reviewed_by, data.review_notes,
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return QuestionResponse(id=str(question.id), **question.model_dump(exclude={"id"}))


@router.post("/bulk-approve", response_model=StatusResponse)
async def bulk_approve_questions(data: BulkApproveRequest):
    count = await question_service.bulk_approve_questions(data.question_ids, data.reviewed_by)
    return StatusResponse(success=True, message=f"Approved {count} questions")


@router.delete("/{question_id}", response_model=StatusResponse)
async def delete_question(question_id: str):
    success = await question_service.delete_question(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return StatusResponse(success=True, message="Question deleted")
