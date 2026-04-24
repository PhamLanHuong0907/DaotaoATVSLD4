"""Audit log of administrative actions."""
from beanie import Document
from pydantic import Field
from typing import Optional, Any
from datetime import datetime, timezone


class AuditLog(Document):
    actor_id: Optional[str] = None       # user.id of the actor (None = system/anonymous)
    actor_username: Optional[str] = None
    actor_role: Optional[str] = None

    method: str                          # HTTP method
    path: str                            # request path
    status_code: int

    # Optional context
    target_type: Optional[str] = None    # e.g. "user", "exam_room"
    target_id: Optional[str] = None
    summary: Optional[str] = None
    extra: Optional[dict[str, Any]] = None

    ip: Optional[str] = None
    user_agent: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "audit_logs"
        indexes = [
            "actor_id",
            "method",
            "path",
            "created_at",
            "target_type",
        ]
