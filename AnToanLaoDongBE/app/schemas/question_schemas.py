from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.models.enums import (
    QuestionType, DifficultyLevel, TrainingGroup, ApprovalStatus,
)
from app.models.question import AnswerOption


class QuestionCreate(BaseModel):
    content: str
    question_type: QuestionType
    difficulty: DifficultyLevel
    options: list[AnswerOption] = []
    correct_answer_bool: Optional[bool] = None
    scenario_description: Optional[str] = None
    expected_key_points: list[str] = []
    explanation: Optional[str] = None
    occupation: str
    skill_level: int
    training_group: TrainingGroup
    topic_tags: list[str] = []
    source_document_ids: list[str] = []
    source_course_id: Optional[str] = None
    created_by: str


class QuestionAIGenerate(BaseModel):
    source_document_ids: list[str] = []
    source_course_id: Optional[str] = None
    occupation: str
    skill_level: int
    training_group: TrainingGroup
    question_type: QuestionType
    difficulty: DifficultyLevel
    count: int = 10
    created_by: str


class QuestionUpdate(BaseModel):
    content: Optional[str] = None
    question_type: Optional[QuestionType] = None
    difficulty: Optional[DifficultyLevel] = None
    options: Optional[list[AnswerOption]] = None
    correct_answer_bool: Optional[bool] = None
    scenario_description: Optional[str] = None
    expected_key_points: Optional[list[str]] = None
    explanation: Optional[str] = None
    topic_tags: Optional[list[str]] = None


class QuestionResponse(BaseModel):
    id: str
    content: str
    question_type: QuestionType
    difficulty: DifficultyLevel
    options: list[AnswerOption] = []
    correct_answer_bool: Optional[bool] = None
    scenario_description: Optional[str] = None
    expected_key_points: list[str] = []
    explanation: Optional[str] = None
    occupation: str
    skill_level: int
    training_group: TrainingGroup
    topic_tags: list[str] = []
    source_document_ids: list[str] = []
    source_course_id: Optional[str] = None
    ai_generated: bool
    ai_model: Optional[str] = None
    status: ApprovalStatus
    created_by: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class QuestionListResponse(BaseModel):
    id: str
    content: str
    question_type: QuestionType
    difficulty: DifficultyLevel
    occupation: str
    skill_level: int
    training_group: TrainingGroup
    topic_tags: list[str] = []
    ai_generated: bool
    status: ApprovalStatus
    created_at: datetime


class BulkApproveRequest(BaseModel):
    question_ids: list[str]
    reviewed_by: str
