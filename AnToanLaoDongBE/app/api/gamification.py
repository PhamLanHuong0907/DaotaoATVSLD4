"""Gamification endpoints — current user score + leaderboard."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services import gamification_service as svc

router = APIRouter(prefix="/gamification", tags=["Gamification"])


class BadgeOut(BaseModel):
    code: str
    title: str
    description: str
    icon: str
    awarded_at: datetime


class PointEventOut(BaseModel):
    reason: str
    points: int
    note: Optional[str] = None
    created_at: datetime


class UserScoreOut(BaseModel):
    user_id: str
    employee_id: str
    full_name: str
    department_id: Optional[str] = None
    total_points: int
    level: int
    badges: list[BadgeOut] = []
    history: list[PointEventOut] = []


class LeaderboardItem(BaseModel):
    user_id: str
    employee_id: str
    full_name: str
    department_id: Optional[str] = None
    total_points: int
    level: int
    badge_count: int


def _to_score(s) -> UserScoreOut:
    return UserScoreOut(
        user_id=s.user_id,
        employee_id=s.employee_id,
        full_name=s.full_name,
        department_id=s.department_id,
        total_points=s.total_points,
        level=s.level,
        badges=[BadgeOut(**b.model_dump()) for b in s.badges],
        history=[PointEventOut(**h.model_dump()) for h in (s.history or [])][-50:],
    )


@router.get("/me", response_model=UserScoreOut)
async def my_score(user: User = Depends(get_current_user)):
    score = await svc.get_user_score(str(user.id))
    if not score:
        # Auto-create empty score so FE can render
        score = await svc._get_or_create(str(user.id))  # noqa: SLF001
    return _to_score(score)


@router.get("/leaderboard", response_model=list[LeaderboardItem])
async def leaderboard(
    department_id: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    _: User = Depends(get_current_user),
):
    items = await svc.get_leaderboard(department_id=department_id, limit=limit)
    return [
        LeaderboardItem(
            user_id=s.user_id,
            employee_id=s.employee_id,
            full_name=s.full_name,
            department_id=s.department_id,
            total_points=s.total_points,
            level=s.level,
            badge_count=len(s.badges),
        )
        for s in items
    ]
