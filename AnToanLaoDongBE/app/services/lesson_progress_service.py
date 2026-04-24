"""Lesson progress tracking."""
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.models.lesson_progress import LessonProgress, LessonStatus
from app.models.course import Course


async def _get_or_create(user_id: str, course_id: str, lesson_order: int) -> LessonProgress:
    existing = await LessonProgress.find_one({
        "user_id": user_id,
        "course_id": course_id,
        "lesson_order": lesson_order,
    })
    if existing:
        return existing
    p = LessonProgress(user_id=user_id, course_id=course_id, lesson_order=lesson_order)
    await p.insert()
    return p


async def mark_viewed(
    user_id: str,
    course_id: str,
    lesson_order: int,
    add_seconds: int = 0,
    last_position_seconds: Optional[int] = None,
) -> LessonProgress:
    p = await _get_or_create(user_id, course_id, lesson_order)
    now = datetime.now(timezone.utc)
    if p.status == LessonStatus.NOT_STARTED:
        p.status = LessonStatus.IN_PROGRESS
        p.started_at = now
    p.time_spent_seconds += max(0, add_seconds)
    if last_position_seconds is not None:
        p.last_position_seconds = last_position_seconds
    p.last_viewed_at = now
    p.updated_at = now
    await p.save()
    return p


async def mark_completed(user_id: str, course_id: str, lesson_order: int) -> LessonProgress:
    p = await _get_or_create(user_id, course_id, lesson_order)
    was_already_complete = p.status == LessonStatus.COMPLETED
    now = datetime.now(timezone.utc)
    p.status = LessonStatus.COMPLETED
    if not p.started_at:
        p.started_at = now
    p.completed_at = now
    p.last_viewed_at = now
    p.updated_at = now
    await p.save()

    # Gamification: award points + check course completion
    if not was_already_complete:
        try:
            from app.services.gamification_service import on_lesson_completed, on_course_completed
            await on_lesson_completed(user_id)
            summary = await get_course_summary(user_id, course_id)
            if summary["is_course_complete"]:
                summaries = await list_user_summaries(user_id)
                total_done = sum(1 for s in summaries if s["is_course_complete"])
                await on_course_completed(user_id, total_done)
        except Exception:
            pass

    return p


async def list_for_user_course(user_id: str, course_id: str) -> list[LessonProgress]:
    return await LessonProgress.find({
        "user_id": user_id,
        "course_id": course_id,
    }).to_list()


async def get_course_summary(user_id: str, course_id: str) -> dict:
    course = await Course.get(PydanticObjectId(course_id))
    total_lessons = len(course.lessons) if course else 0

    items = await list_for_user_course(user_id, course_id)
    completed = sum(1 for p in items if p.status == LessonStatus.COMPLETED)
    in_progress = sum(1 for p in items if p.status == LessonStatus.IN_PROGRESS)
    total_time = sum(p.time_spent_seconds for p in items)

    percent = round(completed / total_lessons * 100, 1) if total_lessons else 0.0
    last_lesson = None
    if items:
        latest = max(items, key=lambda p: p.last_viewed_at)
        last_lesson = latest.lesson_order

    return {
        "course_id": course_id,
        "total_lessons": total_lessons,
        "completed": completed,
        "in_progress": in_progress,
        "percent": percent,
        "time_spent_seconds": total_time,
        "last_viewed_lesson_order": last_lesson,
        "is_course_complete": total_lessons > 0 and completed >= total_lessons,
    }


async def list_user_summaries(user_id: str) -> list[dict]:
    """All courses the user has touched, with summary."""
    items = await LessonProgress.find({"user_id": user_id}).to_list()
    by_course: dict[str, list[LessonProgress]] = {}
    for p in items:
        by_course.setdefault(p.course_id, []).append(p)

    summaries: list[dict] = []
    for course_id in by_course:
        summaries.append(await get_course_summary(user_id, course_id))
    return summaries


async def list_course_user_progress(course_id: str) -> list[dict]:
    """For admin: every user who has progress on a given course."""
    from app.models.user import User
    items = await LessonProgress.find({"course_id": course_id}).to_list()
    by_user: dict[str, list[LessonProgress]] = {}
    for p in items:
        by_user.setdefault(p.user_id, []).append(p)

    course = await Course.get(PydanticObjectId(course_id))
    total_lessons = len(course.lessons) if course else 0

    out: list[dict] = []
    for user_id, lessons in by_user.items():
        completed = sum(1 for p in lessons if p.status == LessonStatus.COMPLETED)
        try:
            user = await User.get(PydanticObjectId(user_id))
        except Exception:
            user = None
        out.append({
            "user_id": user_id,
            "full_name": user.full_name if user else "",
            "employee_id": user.employee_id if user else "",
            "completed": completed,
            "total_lessons": total_lessons,
            "percent": round(completed / total_lessons * 100, 1) if total_lessons else 0,
            "time_spent_seconds": sum(p.time_spent_seconds for p in lessons),
            "last_viewed_at": max(p.last_viewed_at for p in lessons),
        })
    out.sort(key=lambda x: x["percent"], reverse=True)
    return out
