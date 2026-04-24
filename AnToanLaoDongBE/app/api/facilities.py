"""Facility CRUD + conflict check against existing exam rooms."""
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_user, require_staff
from app.models.exam_room import ExamRoom
from app.models.facility import Facility, FacilityType
from app.models.user import User

router = APIRouter(prefix="/facilities", tags=["Facilities"])


class FacilityCreate(BaseModel):
    name: str
    code: str
    facility_type: FacilityType
    location: Optional[str] = None
    capacity: Optional[int] = None
    description: Optional[str] = None
    department_id: Optional[str] = None


class FacilityUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    location: Optional[str] = None
    capacity: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    department_id: Optional[str] = None


class FacilityResponse(BaseModel):
    id: str
    name: str
    code: str
    facility_type: FacilityType
    location: Optional[str] = None
    capacity: Optional[int] = None
    description: Optional[str] = None
    department_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


def _to_response(f: Facility) -> FacilityResponse:
    return FacilityResponse(id=str(f.id), **f.model_dump(exclude={"id"}))


@router.post("", response_model=FacilityResponse)
async def create_facility(data: FacilityCreate, _: User = Depends(require_staff())):
    if await Facility.find_one(Facility.code == data.code):
        raise HTTPException(400, f"Code '{data.code}' already exists")
    f = Facility(**data.model_dump())
    await f.insert()
    return _to_response(f)


@router.get("", response_model=list[FacilityResponse])
async def list_facilities(
    facility_type: Optional[FacilityType] = None,
    department_id: Optional[str] = None,
    only_active: bool = True,
    _: User = Depends(get_current_user),
):
    query: dict = {}
    if facility_type:
        query["facility_type"] = facility_type
    if department_id:
        query["department_id"] = department_id
    if only_active:
        query["is_active"] = True
    items = await Facility.find(query).sort("name").to_list()
    return [_to_response(f) for f in items]


@router.get("/{facility_id}", response_model=FacilityResponse)
async def get_facility(facility_id: str, _: User = Depends(get_current_user)):
    f = await Facility.get(PydanticObjectId(facility_id))
    if not f:
        raise HTTPException(404, "Facility not found")
    return _to_response(f)


@router.put("/{facility_id}", response_model=FacilityResponse)
async def update_facility(
    facility_id: str,
    data: FacilityUpdate,
    _: User = Depends(require_staff()),
):
    f = await Facility.get(PydanticObjectId(facility_id))
    if not f:
        raise HTTPException(404, "Facility not found")
    update = data.model_dump(exclude_unset=True)
    update["updated_at"] = datetime.now(timezone.utc)
    await f.set(update)
    return _to_response(f)


@router.delete("/{facility_id}")
async def delete_facility(facility_id: str, _: User = Depends(require_staff())):
    f = await Facility.get(PydanticObjectId(facility_id))
    if not f:
        raise HTTPException(404, "Facility not found")
    await f.delete()
    return {"success": True}


class ConflictCheckRequest(BaseModel):
    facility_id: str
    scheduled_start: datetime
    scheduled_end: datetime
    exclude_room_id: Optional[str] = None  # when editing an existing room


class ConflictResponse(BaseModel):
    has_conflict: bool
    conflicting_rooms: list[dict] = []


@router.post("/check-conflict", response_model=ConflictResponse)
async def check_conflict(
    data: ConflictCheckRequest,
    _: User = Depends(get_current_user),
):
    """Check if a facility is already booked in the given time window via ExamRoom.location.

    NOTE: We currently match by free-text `location` field on ExamRoom; later we
    can introduce a structured `facility_id` link on ExamRoom.
    """
    f = await Facility.get(PydanticObjectId(data.facility_id))
    if not f:
        raise HTTPException(404, "Facility not found")
    if data.scheduled_end <= data.scheduled_start:
        raise HTTPException(400, "End must be after start")

    # Find rooms whose location matches AND time window overlaps
    query: dict = {
        "location": {"$regex": f.name, "$options": "i"},
        "scheduled_start": {"$lt": data.scheduled_end},
        "scheduled_end": {"$gt": data.scheduled_start},
    }
    rooms = await ExamRoom.find(query).to_list()
    conflicts = [
        {
            "id": str(r.id),
            "name": r.name,
            "scheduled_start": r.scheduled_start.isoformat(),
            "scheduled_end": r.scheduled_end.isoformat(),
        }
        for r in rooms
        if not data.exclude_room_id or str(r.id) != data.exclude_room_id
    ]
    return ConflictResponse(has_conflict=bool(conflicts), conflicting_rooms=conflicts)
