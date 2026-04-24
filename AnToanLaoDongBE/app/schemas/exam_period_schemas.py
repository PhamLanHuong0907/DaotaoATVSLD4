from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.models.enums import ExamType, ExamMode, ExamPeriodStatus, ExamRoomStatus, ApprovalStatus


# --- Exam Period ---

class ExamPeriodCreate(BaseModel):
    name: str
    description: Optional[str] = None
    exam_type: ExamType
    start_date: datetime
    end_date: datetime
    department_ids: list[str] = Field(default_factory=list)
    target_occupations: list[str] = Field(default_factory=list)
    target_skill_levels: list[int] = Field(default_factory=list)


class ExamPeriodUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    department_ids: Optional[list[str]] = None
    target_occupations: Optional[list[str]] = None
    target_skill_levels: Optional[list[int]] = None
    status: Optional[ExamPeriodStatus] = None


class ExamPeriodResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    exam_type: ExamType
    start_date: datetime
    end_date: datetime
    department_ids: list[str] = []
    target_occupations: list[str] = []
    target_skill_levels: list[int] = []
    status: ExamPeriodStatus
    created_by: str
    created_at: datetime
    updated_at: datetime


# --- Exam Room ---

class RoomCandidateIn(BaseModel):
    user_id: str
    seat_number: Optional[str] = None


class ExamRoomCreate(BaseModel):
    name: str
    exam_period_id: str
    exam_ids: list[str] = Field(default_factory=list)
    exam_mode: ExamMode
    department_id: str
    location: Optional[str] = None
    proctor_id: Optional[str] = None
    scheduled_start: datetime
    scheduled_end: datetime
    capacity: int = 50
    candidate_user_ids: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    certificate_type_id: Optional[str] = None
    certificate_passing_score: Optional[float] = None


class ExamRoomUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    proctor_id: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    capacity: Optional[int] = None
    status: Optional[ExamRoomStatus] = None
    notes: Optional[str] = None
    certificate_type_id: Optional[str] = None
    certificate_passing_score: Optional[float] = None


class RoomCandidateOut(BaseModel):
    user_id: str
    employee_id: str
    full_name: str
    attended: bool = False
    submission_id: Optional[str] = None
    seat_number: Optional[str] = None
    assigned_exam_id: Optional[str] = None


class ExamRoomResponse(BaseModel):
    id: str
    name: str
    exam_period_id: str
    exam_id: Optional[str] = None
    exam_ids: list[str] = []
    exam_mode: ExamMode
    department_id: str
    location: Optional[str] = None
    proctor_id: Optional[str] = None
    scheduled_start: datetime
    scheduled_end: datetime
    capacity: int
    candidates: list[RoomCandidateOut] = []
    status: ExamRoomStatus
    notes: Optional[str] = None
    certificate_type_id: Optional[str] = None
    certificate_passing_score: Optional[float] = None
    approval_status: ApprovalStatus
    review_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
