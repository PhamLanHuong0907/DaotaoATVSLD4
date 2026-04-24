from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone


class Department(Document):
    name: str
    code: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "departments"
        indexes = ["code"]
