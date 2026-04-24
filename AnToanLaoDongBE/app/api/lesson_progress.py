"""Lesson progress endpoints."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user, require_staff
from app.models.lesson_progress import LessonStatus
from app.models.user import User
from app.services import lesson_progress_service as svc

router = APIRouter(prefix="/learning", tags=["Learning Progress"])


class MarkViewedRequest(BaseModel):
    add_seconds: int = 0
    last_position_seconds: Optional[int] = None


class LessonProgressResponse(BaseModel):
    id: str
    user_id: str
    course_id: str
    lesson_order: int
    status: LessonStatus
    time_spent_seconds: int
    last_position_seconds: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_viewed_at: datetime


class CourseSummary(BaseModel):
    course_id: str
    total_lessons: int
    completed: int
    in_progress: int
    percent: float
    time_spent_seconds: int
    last_viewed_lesson_order: Optional[int] = None
    is_course_complete: bool


class UserCourseProgressItem(BaseModel):
    user_id: str
    full_name: str
    employee_id: str
    completed: int
    total_lessons: int
    percent: float
    time_spent_seconds: int
    last_viewed_at: datetime


def _to_response(p) -> LessonProgressResponse:
    return LessonProgressResponse(id=str(p.id), **p.model_dump(exclude={"id", "created_at", "updated_at"}))


@router.post("/courses/{course_id}/lessons/{lesson_order}/viewed", response_model=LessonProgressResponse)
async def mark_viewed(
    course_id: str,
    lesson_order: int,
    data: MarkViewedRequest,
    user: User = Depends(get_current_user),
):
    p = await svc.mark_viewed(
        user_id=str(user.id),
        course_id=course_id,
        lesson_order=lesson_order,
        add_seconds=data.add_seconds,
        last_position_seconds=data.last_position_seconds,
    )
    return _to_response(p)


@router.post("/courses/{course_id}/lessons/{lesson_order}/complete", response_model=LessonProgressResponse)
async def mark_complete(
    course_id: str,
    lesson_order: int,
    user: User = Depends(get_current_user),
):
    p = await svc.mark_completed(
        user_id=str(user.id),
        course_id=course_id,
        lesson_order=lesson_order,
    )
    return _to_response(p)


@router.get("/courses/{course_id}/progress", response_model=list[LessonProgressResponse])
async def get_lessons_progress(
    course_id: str,
    user: User = Depends(get_current_user),
):
    items = await svc.list_for_user_course(str(user.id), course_id)
    return [_to_response(p) for p in items]


@router.get("/courses/{course_id}/summary", response_model=CourseSummary)
async def get_course_summary(
    course_id: str,
    user: User = Depends(get_current_user),
):
    return CourseSummary(**await svc.get_course_summary(str(user.id), course_id))


@router.get("/my-summaries", response_model=list[CourseSummary])
async def my_summaries(user: User = Depends(get_current_user)):
    items = await svc.list_user_summaries(str(user.id))
    return [CourseSummary(**i) for i in items]


@router.get("/courses/{course_id}/users", response_model=list[UserCourseProgressItem])
async def admin_users_progress(
    course_id: str,
    _: User = Depends(require_staff()),
):
    """Admin view: who has been studying this course."""
    items = await svc.list_course_user_progress(course_id)
    return [UserCourseProgressItem(**i) for i in items]
