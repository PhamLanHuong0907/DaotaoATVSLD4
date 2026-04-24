from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone

from app.models.enums import UserRole


class User(Document):
    # Auth
    username: str                    # login handle (unique)
    password_hash: str               # bcrypt hash
    # Profile
    full_name: str
    employee_id: str
    role: UserRole
    department_id: Optional[str] = None
    occupation: Optional[str] = None
    skill_level: int = Field(default=1, ge=1, le=7)
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True
    last_login_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
        indexes = [
            "username",
            "employee_id",
            "department_id",
            "occupation",
            "skill_level",
            "role",
        ]
