"""Exam room (phòng thi) — a scheduled sitting of an exam.

Each room belongs to an exam_period, targets one department, and assigns
a list of users as candidates. Supports both online and onsite modes.
"""
from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from app.models.enums import ExamMode, ExamRoomStatus, ApprovalStatus


class RoomCandidate(BaseModel):
    user_id: str
    employee_id: str
    full_name: str
    attended: bool = False
    submission_id: Optional[str] = None
    # onsite-only: for paper-based exams
    seat_number: Optional[str] = None
    assigned_exam_id: Optional[str] = None

class ExamRoom(Document):
    name: str                           # e.g. "Phòng A1 - Ca sáng"
    exam_period_id: str
    exam_id: Optional[str] = None       # deprecated: keep for backward compatibility
    exam_ids: list[str] = Field(default_factory=list) # the generated exams used in this room
    exam_mode: ExamMode

    department_id: str
    location: Optional[str] = None      # physical room for onsite
    proctor_id: Optional[str] = None    # user_id of proctor (training officer)

    scheduled_start: datetime
    scheduled_end: datetime
    capacity: int = 50

    candidates: list[RoomCandidate] = Field(default_factory=list)

    status: ExamRoomStatus = ExamRoomStatus.SCHEDULED
    notes: Optional[str] = None

    certificate_type_id: Optional[str] = None
    certificate_passing_score: Optional[float] = None

    approval_status: ApprovalStatus = ApprovalStatus.PENDING_REVIEW
    review_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "exam_rooms"
        indexes = [
            "exam_period_id",
            "exam_id",
            "department_id",
            "scheduled_start",
            "status",
            "approval_status",
        ]
