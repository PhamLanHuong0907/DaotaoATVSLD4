"""Points + badges for workers (gamification)."""
from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


class BadgeAward(BaseModel):
    code: str           # stable identifier, e.g. "first_pass"
    title: str
    description: str
    icon: str = "EmojiEvents"
    awarded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PointEvent(BaseModel):
    reason: str         # e.g. "exam_pass", "course_complete", "first_login"
    points: int
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserScore(Document):
    """One document per user, holds running totals + history."""
    user_id: str
    employee_id: str
    full_name: str
    department_id: Optional[str] = None

    total_points: int = 0
    level: int = 1                     # derived from total_points (every 100pts = 1 level)

    badges: list[BadgeAward] = []
    history: list[PointEvent] = []

    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "user_scores"
        indexes = ["user_id", "department_id", "total_points"]
