"""Exam period (kỳ thi) + exam room (phòng thi) endpoints."""
import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user, require_staff
from app.models.enums import ExamType, ExamPeriodStatus, ExamRoomStatus, ExamMode
from app.models.user import User
from app.schemas.common import StatusResponse
from pydantic import BaseModel

from app.schemas.exam_period_schemas import (
    ExamPeriodCreate, ExamPeriodUpdate, ExamPeriodResponse,
    ExamRoomCreate, ExamRoomUpdate, ExamRoomResponse, RoomCandidateOut,
)
from app.services import exam_period_service as svc
from app.utils.pagination import PaginatedResponse


class AttendanceEntry(BaseModel):
    user_id: str
    attended: bool
    seat_number: Optional[str] = None


class OfflineScoreIn(BaseModel):
    user_id: str
    total_score: float
    note: Optional[str] = None

router = APIRouter(tags=["Exam Periods & Rooms"])


def _period_to_response(p) -> ExamPeriodResponse:
    return ExamPeriodResponse(id=str(p.id), **p.model_dump(exclude={"id"}))


def _room_to_response(r) -> ExamRoomResponse:
    # Ensure candidates are properly serialized
    candidate_responses = []
    for c in r.candidates:
        c_dict = c.model_dump()
        # Add any missing fields for RoomCandidateOut if needed, though they should match
        candidate_responses.append(RoomCandidateOut(**c_dict))
        
    return ExamRoomResponse(
        id=str(r.id),
        candidates=candidate_responses,
        **r.model_dump(exclude={"id", "candidates"}),
    )


# =================== Exam Period ===================

@router.post("/exam-periods", response_model=ExamPeriodResponse)
async def create_period(
    data: ExamPeriodCreate,
    user: User = Depends(require_staff()),
):
    period = await svc.create_period(data, created_by=str(user.id))
    return _period_to_response(period)


@router.get("/exam-periods", response_model=PaginatedResponse[ExamPeriodResponse])
async def list_periods(
    exam_type: Optional[ExamType] = None,
    status: Optional[ExamPeriodStatus] = None,
    department_id: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=500),
    _: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    items, total = await svc.list_periods(
        exam_type=exam_type, status=status, department_id=department_id,
        skip=skip, limit=page_size,
    )
    return PaginatedResponse(
        items=[_period_to_response(p) for p in items],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/exam-periods/{period_id}", response_model=ExamPeriodResponse)
async def get_period(period_id: str, _: User = Depends(get_current_user)):
    period = await svc.get_period(period_id)
    if not period:
        raise HTTPException(status_code=404, detail="Exam period not found")
    return _period_to_response(period)


@router.put("/exam-periods/{period_id}", response_model=ExamPeriodResponse)
async def update_period(
    period_id: str,
    data: ExamPeriodUpdate,
    _: User = Depends(require_staff()),
):
    period = await svc.update_period(period_id, data)
    if not period:
        raise HTTPException(status_code=404, detail="Exam period not found")
    return _period_to_response(period)


@router.delete("/exam-periods/{period_id}", response_model=StatusResponse)
async def delete_period(period_id: str, _: User = Depends(require_staff())):
    ok = await svc.delete_period(period_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Exam period not found")
    return StatusResponse(success=True, message="Exam period deleted")


# =================== Exam Room ===================

@router.post("/exam-rooms", response_model=ExamRoomResponse)
async def create_room(
    data: ExamRoomCreate,
    user: User = Depends(require_staff()),
):
    try:
        room = await svc.create_room(data, created_by=str(user.id))
        return _room_to_response(room)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error creating room: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exam-rooms/my-schedule", response_model=list[ExamRoomResponse])
async def my_schedule(
    upcoming_only: bool = True,
    user: User = Depends(get_current_user),
):
    """Return exam rooms in which the current user is a candidate."""
    rooms = await svc.get_rooms_for_user(str(user.id), upcoming_only=upcoming_only)
    responses = []
    for r in rooms:
        data = _room_to_response(r)
        assigned = None
        for c in r.candidates:
            if c.user_id == str(user.id):
                assigned = getattr(c, "assigned_exam_id", None)
                break
        data.exam_id = assigned or (r.exam_ids[0] if r.exam_ids else r.exam_id)
        responses.append(data)
    return responses


@router.get("/exam-rooms", response_model=PaginatedResponse[ExamRoomResponse])
async def list_rooms(
    exam_period_id: Optional[str] = None,
    department_id: Optional[str] = None,
    exam_id: Optional[str] = None,
    status: Optional[ExamRoomStatus] = None,
    exam_mode: Optional[ExamMode] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    _: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    rooms, total = await svc.list_rooms(
        exam_period_id=exam_period_id, department_id=department_id,
        exam_id=exam_id, status=status, exam_mode=exam_mode,
        search=search, skip=skip, limit=page_size,
    )
    return PaginatedResponse(
        items=[_room_to_response(r) for r in rooms],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/exam-rooms/{room_id}", response_model=ExamRoomResponse)
async def get_room(room_id: str, _: User = Depends(get_current_user)):
    room = await svc.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Exam room not found")
    return _room_to_response(room)


@router.put("/exam-rooms/{room_id}", response_model=ExamRoomResponse)
async def update_room(
    room_id: str,
    data: ExamRoomUpdate,
    _: User = Depends(require_staff()),
):
    room = await svc.update_room(room_id, data)
    if not room:
        raise HTTPException(status_code=404, detail="Exam room not found")
    return _room_to_response(room)


@router.delete("/exam-rooms/{room_id}", response_model=StatusResponse)
async def delete_room(room_id: str, _: User = Depends(require_staff())):
    ok = await svc.delete_room(room_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Exam room not found")
    return StatusResponse(success=True, message="Exam room deleted")


@router.post("/exam-rooms/{room_id}/candidates", response_model=ExamRoomResponse)
async def add_candidates(
    room_id: str,
    user_ids: list[str],
    _: User = Depends(require_staff()),
):
    room = await svc.add_candidates(room_id, user_ids)
    if not room:
        raise HTTPException(status_code=404, detail="Exam room not found")
    return _room_to_response(room)


@router.delete("/exam-rooms/{room_id}/candidates/{user_id}", response_model=ExamRoomResponse)
async def remove_candidate(
    room_id: str,
    user_id: str,
    _: User = Depends(require_staff()),
):
    room = await svc.remove_candidate(room_id, user_id)
    if not room:
        raise HTTPException(status_code=404, detail="Exam room not found")
    return _room_to_response(room)


@router.post("/exam-rooms/{room_id}/candidates/bulk-by-department", response_model=ExamRoomResponse)
async def bulk_add_by_department(
    room_id: str,
    department_id: str,
    skill_levels: Optional[list[int]] = None,
    _: User = Depends(require_staff()),
):
    room = await svc.bulk_add_candidates_by_department(room_id, department_id, skill_levels)
    if not room:
        raise HTTPException(status_code=404, detail="Exam room not found")
    return _room_to_response(room)


@router.post("/exam-rooms/{room_id}/attendance", response_model=ExamRoomResponse)
async def mark_attendance(
    room_id: str,
    entries: list[AttendanceEntry],
    _: User = Depends(require_staff()),
):
    room = await svc.mark_attendance(room_id, [e.model_dump() for e in entries])
    if not room:
        raise HTTPException(status_code=404, detail="Exam room not found")
    return _room_to_response(room)


@router.post("/exam-rooms/{room_id}/offline-score")
async def submit_offline_score(
    room_id: str,
    data: OfflineScoreIn,
    user: User = Depends(require_staff()),
):
    """Record an offline (paper-based) exam score for a candidate."""
    submission = await svc.submit_offline_score(
        room_id=room_id,
        user_id=data.user_id,
        total_score=data.total_score,
        note=data.note,
        graded_by=str(user.id),
    )
    return {
        "submission_id": str(submission.id),
        "user_id": submission.user_id,
        "total_score": submission.total_score,
        "classification": submission.classification,
    }


