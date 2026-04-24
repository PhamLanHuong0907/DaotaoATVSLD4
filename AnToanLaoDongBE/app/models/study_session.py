from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StudySession(Document):
    user_id: str
    session_type: str

    exam_submission_id: Optional[str] = None
    question_ids: list[str] = []
    course_id: Optional[str] = None

    messages: list[ChatMessage] = []

    occupation: Optional[str] = None
    skill_level: Optional[int] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "study_sessions"
        indexes = ["user_id", "session_type", "created_at"]
