from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.models.enums import TrainingGroup, ApprovalStatus
from app.models.course import LessonContent


class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    objectives: list[str] = []
    occupation: str
    skill_level: int
    training_group: TrainingGroup
    lessons: list[LessonContent] = []
    created_by: str


class CourseAIGenerate(BaseModel):
    document_ids: list[str]
    occupation: str
    skill_level: int
    training_group: TrainingGroup
    created_by: str


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    objectives: Optional[list[str]] = None
    occupation: Optional[str] = None
    skill_level: Optional[int] = None
    training_group: Optional[TrainingGroup] = None
    lessons: Optional[list[LessonContent]] = None
    assigned_department_ids: Optional[list[str]] = None
    is_mandatory: Optional[bool] = None


class CourseResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    objectives: list[str] = []
    occupation: str
    skill_level: int
    training_group: TrainingGroup
    lessons: list[LessonContent] = []
    assigned_department_ids: list[str] = []
    is_mandatory: bool = False
    source_document_ids: list[str] = []
    ai_generated: bool
    ai_model: Optional[str] = None
    ai_generated_at: Optional[datetime] = None
    status: ApprovalStatus
    created_by: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class CourseListResponse(BaseModel):
    id: str
    title: str
    occupation: str
    skill_level: int
    training_group: TrainingGroup
    lesson_count: int
    ai_generated: bool
    status: ApprovalStatus
    assigned_department_ids: list[str] = []
    is_mandatory: bool = False
    created_at: datetime
