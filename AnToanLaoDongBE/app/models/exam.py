from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from app.models.enums import ExamType, ExamMode, ExamKind, ResultClassification


class ExamQuestion(BaseModel):
    question_id: str
    order: int
    content: str
    question_type: str
    options: list[dict] = []
    correct_answer: str
    points: float = 1.0


class Exam(Document):
    name: str
    exam_type: ExamType
    exam_mode: ExamMode
    template_id: str

    occupation: str
    skill_level: int

    questions: list[ExamQuestion] = []
    total_points: float = 0.0
    duration_minutes: int
    passing_score: float

    excellent_threshold: float = 9.0
    good_threshold: float = 7.0
    average_threshold: float = 5.0

    scheduled_date: Optional[datetime] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    exam_period_id: Optional[str] = None
    exam_kind: ExamKind = ExamKind.OFFICIAL

    is_active: bool = True
    created_by: str

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "exams"
        indexes = [
            "exam_type",
            "occupation",
            "skill_level",
            "scheduled_date",
            "exam_period_id",
            "exam_kind",
        ]


class AnswerRecord(BaseModel):
    question_id: str
    question_order: int
    selected_answer: Optional[str] = None
    text_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    points_earned: float = 0.0


class ExamSubmission(Document):
    exam_id: str
    user_id: str

    answers: list[AnswerRecord] = []

    total_score: float = 0.0
    total_correct: int = 0
    total_questions: int = 0
    classification: Optional[ResultClassification] = None

    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None
    graded_by: Optional[str] = None
    exam_kind: Optional[ExamKind] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "exam_submissions"
        indexes = ["exam_id", "user_id", "classification", "submitted_at", "exam_kind"]
