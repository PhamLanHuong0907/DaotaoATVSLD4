from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from app.models.enums import TrainingGroup, ApprovalStatus


class LessonContent(BaseModel):
    order: int
    title: str
    theory: str
    scenario: Optional[str] = None
    safety_notes: Optional[str] = None
    duration_minutes: Optional[int] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None


class Course(Document):
    title: str
    description: Optional[str] = None
    objectives: list[str] = []

    # Classification
    occupation: str
    skill_level: int
    training_group: TrainingGroup

    # Assignment scope (empty list = available to everyone matching occupation/skill)
    assigned_department_ids: list[str] = []
    is_mandatory: bool = False

    # Lessons
    lessons: list[LessonContent] = []

    # Source documents used by AI
    source_document_ids: list[str] = []

    # AI generation metadata
    ai_generated: bool = False
    ai_model: Optional[str] = None
    ai_generated_at: Optional[datetime] = None

    # Approval workflow
    status: ApprovalStatus = ApprovalStatus.DRAFT
    created_by: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    approved_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "courses"
        indexes = ["occupation", "skill_level", "training_group", "status", "assigned_department_ids"]
