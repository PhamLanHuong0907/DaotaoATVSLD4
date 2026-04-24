"""Track per-user learning progress on individual lessons of a course."""
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


class LessonStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class LessonProgress(Document):
    user_id: str
    course_id: str
    lesson_order: int

    status: LessonStatus = LessonStatus.NOT_STARTED
    time_spent_seconds: int = 0
    last_position_seconds: int = 0  # for video lessons

    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_viewed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "lesson_progress"
        indexes = [
            "user_id",
            "course_id",
            [("user_id", 1), ("course_id", 1), ("lesson_order", 1)],
        ]
