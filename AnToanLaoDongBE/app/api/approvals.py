"""Aggregated inbox of items waiting for review/approval.

Pulls together TrainingDocument, Course, ExamTemplate, Question that are
in PENDING_REVIEW status, so admins/officers see one list to act on.
"""
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import require_staff
from app.models.enums import ApprovalStatus
from app.models.user import User

router = APIRouter(prefix="/approvals", tags=["Approvals"])


PendingType = Literal["document", "course", "exam_template", "question", "exam_room"]


class PendingItem(BaseModel):
    id: str
    type: PendingType
    title: str
    created_by: str
    created_at: datetime
    occupation: Optional[str] = None
    skill_level: Optional[int] = None


class ApprovalSummary(BaseModel):
    total: int
    by_type: dict[str, int]
    items: list[PendingItem]


@router.get("/inbox", response_model=ApprovalSummary)
async def inbox(
    type: Optional[PendingType] = None,
    _: User = Depends(require_staff()),
):
    """Return all items currently in PENDING_REVIEW status, optionally filtered by type."""
    from app.models.document import TrainingDocument
    from app.models.course import Course
    from app.models.exam_template import ExamTemplate
    from app.models.question import Question

    items: list[PendingItem] = []
    by_type: dict[str, int] = {}

    if type in (None, "document"):
        docs = await TrainingDocument.find(
            TrainingDocument.status == ApprovalStatus.PENDING_REVIEW
        ).sort("-created_at").to_list()
        by_type["document"] = len(docs)
        for d in docs:
            items.append(PendingItem(
                id=str(d.id),
                type="document",
                title=d.title,
                created_by=d.uploaded_by,
                created_at=d.created_at,
                occupation=d.occupations[0] if d.occupations else None,
                skill_level=d.skill_levels[0] if d.skill_levels else None,
            ))

    if type in (None, "course"):
        courses = await Course.find(
            Course.status == ApprovalStatus.PENDING_REVIEW
        ).sort("-created_at").to_list()
        by_type["course"] = len(courses)
        for c in courses:
            items.append(PendingItem(
                id=str(c.id),
                type="course",
                title=c.title,
                created_by=c.created_by,
                created_at=c.created_at,
                occupation=c.occupation,
                skill_level=c.skill_level,
            ))

    if type in (None, "exam_template"):
        templates = await ExamTemplate.find(
            ExamTemplate.status == ApprovalStatus.PENDING_REVIEW
        ).sort("-created_at").to_list()
        by_type["exam_template"] = len(templates)
        for t in templates:
            items.append(PendingItem(
                id=str(t.id),
                type="exam_template",
                title=t.name,
                created_by=t.created_by,
                created_at=t.created_at,
                occupation=t.occupation,
                skill_level=t.skill_level,
            ))

    if type in (None, "question"):
        questions = await Question.find(
            Question.status == ApprovalStatus.PENDING_REVIEW
        ).sort("-created_at").to_list()
        by_type["question"] = len(questions)
        for q in questions:
            items.append(PendingItem(
                id=str(q.id),
                type="question",
                title=q.content[:100],
                created_by=q.created_by,
                created_at=q.created_at,
                occupation=q.occupation,
                skill_level=q.skill_level,
            ))

    if type in (None, "exam_room"):
        from app.models.exam_room import ExamRoom
        from datetime import timezone, timedelta
        vn_tz = timezone(timedelta(hours=7))
        rooms = await ExamRoom.find(
            ExamRoom.approval_status == ApprovalStatus.PENDING_REVIEW
        ).sort("-created_at").to_list()
        by_type["exam_room"] = len(rooms)
        for r in rooms:
            items.append(PendingItem(
                id=str(r.id),
                type="exam_room",
                title=r.name,
                created_by=r.created_by,
                created_at=r.created_at,
                occupation=f"Lịch thi: {r.scheduled_start.astimezone(vn_tz).strftime('%d/%m/%Y %H:%M')}",
                skill_level=None,
            ))

    items.sort(key=lambda i: i.created_at, reverse=True)
    return ApprovalSummary(
        total=sum(by_type.values()),
        by_type=by_type,
        items=items,
    )


class ApproveRequest(BaseModel):
    review_notes: Optional[str] = None


@router.post("/{type}/{item_id}/approve")
async def approve_item(
    type: PendingType,
    item_id: str,
    data: ApproveRequest,
    user: User = Depends(require_staff()),
):
    return await _set_status(type, item_id, ApprovalStatus.APPROVED, str(user.id), data.review_notes)


@router.post("/{type}/{item_id}/reject")
async def reject_item(
    type: PendingType,
    item_id: str,
    data: ApproveRequest,
    user: User = Depends(require_staff()),
):
    return await _set_status(type, item_id, ApprovalStatus.REJECTED, str(user.id), data.review_notes)


async def _set_status(
    type: PendingType,
    item_id: str,
    status: ApprovalStatus,
    reviewer_id: str,
    notes: Optional[str],
):
    from datetime import timezone
    from beanie import PydanticObjectId
    from fastapi import HTTPException

    if type == "document":
        from app.services import document_service
        doc = await document_service.update_document_status(item_id, status, reviewer_id, notes)
        if not doc:
            raise HTTPException(404, "Document not found")
        return {"id": str(doc.id), "status": doc.status}

    if type == "course":
        from app.services import course_service
        c = await course_service.update_course_status(item_id, status, reviewer_id, notes)
        if not c:
            raise HTTPException(404, "Course not found")
        return {"id": str(c.id), "status": c.status}

    if type == "exam_template":
        from app.services import exam_service
        t = await exam_service.update_template_status(item_id, status, reviewer_id)
        if not t:
            raise HTTPException(404, "Exam template not found")
        return {"id": str(t.id), "status": t.status}

    if type == "question":
        from app.models.question import Question
        q = await Question.get(PydanticObjectId(item_id))
        if not q:
            raise HTTPException(404, "Question not found")
        q.status = status
        q.reviewed_by = reviewer_id
        if notes:
            q.review_notes = notes
        if status == ApprovalStatus.APPROVED:
            q.approved_at = datetime.now(timezone.utc)
        q.updated_at = datetime.now(timezone.utc)
        await q.save()
        return {"id": str(q.id), "status": q.status}

    if type == "exam_room":
        from app.services import exam_period_service
        # Note: exam room uses approval_status rather than status
        r = await exam_period_service.update_room_approval(item_id, status, reviewer_id, notes)
        if not r:
            raise HTTPException(404, "Exam room not found")
        return {"id": str(r.id), "status": r.approval_status}

    raise HTTPException(400, f"Unknown type: {type}")
