"""In-app notification (thông báo)."""
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


class NotificationType(str, Enum):
    EXAM_SCHEDULED = "exam_scheduled"
    EXAM_RESULT = "exam_result"
    CERTIFICATE_ISSUED = "certificate_issued"
    NEW_COURSE = "new_course"
    NEW_DOCUMENT = "new_document"
    GENERAL = "general"


class Notification(Document):
    user_id: str           # recipient
    type: NotificationType = NotificationType.GENERAL
    title: str
    body: Optional[str] = None
    link: Optional[str] = None     # frontend route to open

    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "notifications"
        indexes = [
            "user_id",
            "is_read",
            "created_at",
        ]
