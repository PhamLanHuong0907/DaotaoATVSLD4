from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from app.models.enums import (
    QuestionType, DifficultyLevel, TrainingGroup, ApprovalStatus,
)


class AnswerOption(BaseModel):
    label: str
    text: str
    is_correct: bool


class Question(Document):
    content: str
    question_type: QuestionType
    difficulty: DifficultyLevel

    # Multiple choice
    options: list[AnswerOption] = []

    # True/false
    correct_answer_bool: Optional[bool] = None

    # Scenario-based
    scenario_description: Optional[str] = None
    expected_key_points: list[str] = []

    # Explanation for tutoring
    explanation: Optional[str] = None

    # Classification
    occupation: str
    skill_level: int
    training_group: TrainingGroup
    topic_tags: list[str] = []

    # Source
    source_document_ids: list[str] = []
    source_course_id: Optional[str] = None

    # AI metadata
    ai_generated: bool = False
    ai_model: Optional[str] = None

    # Approval
    status: ApprovalStatus = ApprovalStatus.DRAFT
    created_by: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    approved_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "questions"
        indexes = [
            "question_type",
            "difficulty",
            "occupation",
            "skill_level",
            "training_group",
            "topic_tags",
            "status",
        ]
