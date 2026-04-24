"""Exam period (kỳ thi) — groups multiple exam rooms/exams.

A kỳ thi typically spans a date range, applies to selected departments,
and contains many ExamRoom sessions (phòng thi) scheduled at specific times.
"""
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone

from app.models.enums import ExamType, ExamPeriodStatus


class ExamPeriod(Document):
    name: str
    description: Optional[str] = None
    exam_type: ExamType

    start_date: datetime
    end_date: datetime

    # Scope
    department_ids: list[str] = Field(default_factory=list)  # empty = all
    target_occupations: list[str] = Field(default_factory=list)
    target_skill_levels: list[int] = Field(default_factory=list)

    status: ExamPeriodStatus = ExamPeriodStatus.DRAFT
    created_by: str

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "exam_periods"
        indexes = ["exam_type", "status", "start_date", "end_date"]
