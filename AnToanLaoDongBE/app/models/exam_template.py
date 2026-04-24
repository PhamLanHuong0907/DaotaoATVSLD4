from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from app.models.enums import (
    ExamType, TrainingGroup, DifficultyLevel, QuestionType, ApprovalStatus,
)


class QuestionDistribution(BaseModel):
    topic_tag: Optional[str] = None
    question_type: Optional[QuestionType] = None
    difficulty: Optional[DifficultyLevel] = None
    count: int


class ExamTemplate(Document):
    name: str
    exam_type: ExamType
    training_group: TrainingGroup
    occupation: Optional[str] = None
    skill_level: Optional[int] = None

    total_questions: int
    duration_minutes: int
    passing_score: float

    distributions: list[QuestionDistribution] = []

    # Classification thresholds (on scale of 10)
    excellent_threshold: float = 9.0
    good_threshold: float = 7.0
    average_threshold: float = 5.0

    status: ApprovalStatus = ApprovalStatus.DRAFT
    created_by: str
    reviewed_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "exam_templates"
        indexes = ["exam_type", "occupation", "skill_level", "status"]
