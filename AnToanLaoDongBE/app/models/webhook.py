"""Outbound webhooks — admin can register URLs to receive event notifications."""
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


class WebhookEvent(str, Enum):
    EXAM_SUBMITTED = "exam.submitted"
    EXAM_PASSED = "exam.passed"
    CERTIFICATE_ISSUED = "certificate.issued"
    EXAM_ROOM_CREATED = "exam_room.created"
    USER_CREATED = "user.created"


class Webhook(Document):
    name: str
    url: str
    events: list[WebhookEvent] = []
    secret: Optional[str] = None  # used to sign payloads (HMAC)
    is_active: bool = True

    last_triggered_at: Optional[datetime] = None
    last_status_code: Optional[int] = None
    last_error: Optional[str] = None
    success_count: int = 0
    failure_count: int = 0

    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "webhooks"
        indexes = ["events", "is_active"]
