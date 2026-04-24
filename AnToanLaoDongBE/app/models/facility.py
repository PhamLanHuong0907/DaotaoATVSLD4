"""Physical training rooms / equipment that can be assigned to exam rooms."""
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


class FacilityType(str, Enum):
    ROOM = "room"           # physical room
    PROJECTOR = "projector"
    COMPUTER = "computer"
    SAFETY_GEAR = "safety_gear"
    OTHER = "other"


class Facility(Document):
    name: str
    code: str               # internal short code
    facility_type: FacilityType
    location: Optional[str] = None
    capacity: Optional[int] = None         # for rooms
    description: Optional[str] = None
    is_active: bool = True

    department_id: Optional[str] = None    # owning department, if any

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "facilities"
        indexes = ["code", "facility_type", "department_id", "is_active"]
