from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.models.enums import (
    ExamType, ExamMode, ExamKind, TrainingGroup, ApprovalStatus,
    DifficultyLevel, QuestionType, ResultClassification,
)
from app.models.exam_template import QuestionDistribution


# --- Exam Template Schemas ---

class ExamTemplateCreate(BaseModel):
    name: str
    exam_type: ExamType
    training_group: TrainingGroup
    occupation: str
    skill_level: int
    total_questions: int
    duration_minutes: int
    passing_score: float
    distributions: list[QuestionDistribution] = []
    excellent_threshold: float = 9.0
    good_threshold: float = 7.0
    average_threshold: float = 5.0
    created_by: str


class ExamTemplateUpdate(BaseModel):
    name: Optional[str] = None
    total_questions: Optional[int] = None
    duration_minutes: Optional[int] = None
    passing_score: Optional[float] = None
    distributions: Optional[list[QuestionDistribution]] = None
    excellent_threshold: Optional[float] = None
    good_threshold: Optional[float] = None
    average_threshold: Optional[float] = None


class ExamTemplateResponse(BaseModel):
    id: str
    name: str
    exam_type: ExamType
    training_group: TrainingGroup
    occupation: str
    skill_level: int
    total_questions: int
    duration_minutes: int
    passing_score: float
    distributions: list[QuestionDistribution] = []
    excellent_threshold: float
    good_threshold: float
    average_threshold: float
    status: ApprovalStatus
    created_by: str
    reviewed_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# --- Exam Schemas ---

class ExamGenerateRequest(BaseModel):
    template_id: str
    name: str
    exam_mode: ExamMode
    exam_kind: ExamKind
    scheduled_date: Optional[datetime] = None
    exam_period_id: Optional[str] = None
    created_by: str


class ExamResponse(BaseModel):
    id: str
    name: str
    exam_type: ExamType
    exam_mode: ExamMode
    template_id: str
    occupation: str
    skill_level: int
    total_questions: int
    total_points: float
    duration_minutes: int
    passing_score: float
    scheduled_date: Optional[datetime] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    exam_period_id: Optional[str] = None
    exam_period_name: Optional[str] = None
    exam_kind: ExamKind
    is_active: bool
    created_by: str
    created_at: datetime


class ExamQuestionDetail(BaseModel):
    """Exam question with correct answer (for admin)."""
    question_id: str
    order: int
    content: str
    question_type: str
    options: list[dict] = []
    correct_answer: str
    points: float = 1.0


class ExamDetailResponse(BaseModel):
    """Full exam detail with questions (admin view)."""
    id: str
    name: str
    exam_type: ExamType
    exam_mode: ExamMode
    template_id: str
    occupation: str
    skill_level: int
    total_questions: int
    total_points: float
    duration_minutes: int
    passing_score: float
    scheduled_date: Optional[datetime] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    exam_period_id: Optional[str] = None
    exam_period_name: Optional[str] = None
    exam_kind: ExamKind
    is_active: bool
    created_by: str
    created_at: datetime
    questions: list[ExamQuestionDetail] = []


class ExamTakeResponse(BaseModel):
    """Exam questions for test-taker (no correct answers)."""
    id: str
    name: str
    duration_minutes: int
    total_questions: int
    questions: list[dict]


# --- Submission Schemas ---

class AnswerSubmit(BaseModel):
    question_id: str
    question_order: int
    selected_answer: Optional[str] = None
    text_answer: Optional[str] = None


class ExamSubmitRequest(BaseModel):
    user_id: str
    answers: list[AnswerSubmit]


class SubmissionResponse(BaseModel):
    id: str
    exam_id: str
    user_id: str
    total_score: float
    total_correct: int
    total_questions: int
    classification: Optional[ResultClassification] = None
    answers: list[dict] = []
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None
    created_at: datetime


class SubmissionListResponse(BaseModel):
    id: str
    exam_id: str
    user_id: str
    total_score: float
    total_correct: int
    total_questions: int
    classification: Optional[ResultClassification] = None
    submitted_at: Optional[datetime] = None
