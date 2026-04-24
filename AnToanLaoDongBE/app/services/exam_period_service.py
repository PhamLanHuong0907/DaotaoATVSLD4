"""Services for ExamPeriod and ExamRoom."""
from datetime import datetime, timezone
from typing import Optional
import random

from beanie import PydanticObjectId
from fastapi import HTTPException

from app.models.exam_period import ExamPeriod
from app.models.exam_room import ExamRoom, RoomCandidate
from app.models.user import User
from app.models.enums import (
    ExamPeriodStatus, ExamRoomStatus, ExamType, ExamMode, ApprovalStatus
)
from app.schemas.exam_period_schemas import (
    ExamPeriodCreate, ExamPeriodUpdate,
    ExamRoomCreate, ExamRoomUpdate,
)


# -------- Period --------

async def create_period(data: ExamPeriodCreate, created_by: str) -> ExamPeriod:
    period = ExamPeriod(**data.model_dump(), created_by=created_by)
    if period.end_date <= period.start_date:
        raise HTTPException(status_code=400, detail="end_date must be after start_date")
    await period.insert()
    return period


async def list_periods(
    exam_type: Optional[ExamType] = None,
    status: Optional[ExamPeriodStatus] = None,
    department_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[ExamPeriod], int]:
    query: dict = {}
    if exam_type:
        query["exam_type"] = exam_type
    if status:
        query["status"] = status
    if department_id:
        query["department_ids"] = department_id
    total = await ExamPeriod.find(query).count()
    items = (
        await ExamPeriod.find(query)
        .sort("-start_date")
        .skip(skip)
        .limit(limit)
        .to_list()
    )
    return items, total


async def get_period(period_id: str) -> Optional[ExamPeriod]:
    return await ExamPeriod.get(PydanticObjectId(period_id))


async def update_period(period_id: str, data: ExamPeriodUpdate) -> Optional[ExamPeriod]:
    period = await ExamPeriod.get(PydanticObjectId(period_id))
    if not period:
        return None
    update = data.model_dump(exclude_unset=True)
    update["updated_at"] = datetime.now(timezone.utc)
    await period.set(update)
    return period


async def delete_period(period_id: str) -> bool:
    period = await ExamPeriod.get(PydanticObjectId(period_id))
    if not period:
        return False
    # cascade: block delete if rooms exist
    room_count = await ExamRoom.find(ExamRoom.exam_period_id == period_id).count()
    if room_count:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete: {room_count} rooms still reference this period",
        )
    await period.delete()
    return True


# -------- Room --------

async def _notify_candidates(room: ExamRoom, candidate_ids: list[str]) -> None:
    if not candidate_ids:
        return
    try:
        from app.services.notification_service import create_bulk
        from app.models.notification import NotificationType
        from datetime import timezone as dt_timezone, timedelta
        vn_tz = dt_timezone(timedelta(hours=7))
        await create_bulk(
            user_ids=candidate_ids,
            type=NotificationType.EXAM_SCHEDULED,
            title=f"Bạn có lịch thi mới: {room.name}",
            body=f"Bắt đầu lúc {room.scheduled_start.astimezone(vn_tz).strftime('%H:%M %d/%m/%Y')}",
            link="/exams/schedule",
        )
    except Exception:
        pass


async def _materialize_candidates(user_ids: list[str], exam_ids: Optional[list[str]] = None) -> list[RoomCandidate]:
    out: list[RoomCandidate] = []
    for uid in user_ids:
        try:
            user = await User.get(PydanticObjectId(uid))
        except Exception:
            user = None
        if not user:
            continue
        # Safety: avoid random.choice on empty list
        assigned = None
        if exam_ids and len(exam_ids) > 0:
            assigned = random.choice(exam_ids)
            
        out.append(RoomCandidate(
            user_id=str(user.id),
            employee_id=user.employee_id,
            full_name=user.full_name,
            assigned_exam_id=assigned,
        ))
    return out


async def create_room(data: ExamRoomCreate, created_by: str) -> ExamRoom:
    if not data.scheduled_start or not data.scheduled_end:
        raise HTTPException(status_code=400, detail="scheduled_start and scheduled_end are required")
        
    if data.scheduled_end <= data.scheduled_start:
        raise HTTPException(status_code=400, detail="scheduled_end must be after scheduled_start")

    period = await ExamPeriod.get(PydanticObjectId(data.exam_period_id))
    if not period:
        raise HTTPException(status_code=404, detail="Exam period not found")

    candidates = await _materialize_candidates(data.candidate_user_ids, data.exam_ids)
    if len(candidates) > data.capacity:
        raise HTTPException(status_code=400, detail="Candidates exceed capacity")

    room = ExamRoom(
        name=data.name,
        exam_period_id=data.exam_period_id,
        exam_id=data.exam_ids[0] if data.exam_ids else None,
        exam_ids=data.exam_ids,
        exam_mode=data.exam_mode,
        department_id=data.department_id,
        location=data.location,
        proctor_id=data.proctor_id,
        scheduled_start=data.scheduled_start,
        scheduled_end=data.scheduled_end,
        capacity=data.capacity,
        candidates=candidates,
        notes=data.notes,
        certificate_type_id=data.certificate_type_id,
        certificate_passing_score=data.certificate_passing_score,
        approval_status=ApprovalStatus.PENDING_REVIEW,
        created_by=created_by,
    )
    await room.insert()
    # Remove notification: only notify when approved
    return room

from beanie.operators import RegEx

async def list_rooms(
    exam_period_id: Optional[str] = None,
    department_id: Optional[str] = None,
    exam_id: Optional[str] = None,
    status: Optional[ExamRoomStatus] = None,
    exam_mode: Optional[ExamMode] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[ExamRoom], int]:
    query = {}
    if exam_period_id:
        query["exam_period_id"] = str(exam_period_id)
    if department_id:
        query["department_id"] = str(department_id)
    if exam_id:
        query["exam_ids"] = str(exam_id)
    if status:
        query["status"] = status.value if hasattr(status, "value") else status
    if exam_mode:
        query["exam_mode"] = exam_mode.value if hasattr(exam_mode, "value") else exam_mode
    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    q = ExamRoom.find(query)
    total = await q.count()
    rooms = await q.sort("scheduled_start").skip(skip).limit(limit).to_list()
    return rooms, total


async def get_room(room_id: str) -> Optional[ExamRoom]:
    return await ExamRoom.get(PydanticObjectId(room_id))


async def update_room(room_id: str, data: ExamRoomUpdate) -> Optional[ExamRoom]:
    room = await ExamRoom.get(PydanticObjectId(room_id))
    if not room:
        return None
    update = data.model_dump(exclude_unset=True)
    update["updated_at"] = datetime.now(timezone.utc)
    await room.set(update)
    return room


async def delete_room(room_id: str) -> bool:
    room = await ExamRoom.get(PydanticObjectId(room_id))
    if not room:
        return False
    await room.delete()
    return True


async def add_candidates(room_id: str, user_ids: list[str]) -> Optional[ExamRoom]:
    room = await ExamRoom.get(PydanticObjectId(room_id))
    if not room:
        return None
    existing_ids = {c.user_id for c in room.candidates}
    to_add = [uid for uid in user_ids if uid not in existing_ids]
    new_cands = await _materialize_candidates(to_add, room.exam_ids)
    if len(room.candidates) + len(new_cands) > room.capacity:
        raise HTTPException(status_code=400, detail="Adding candidates exceeds capacity")
    room.candidates.extend(new_cands)
    room.updated_at = datetime.now(timezone.utc)
    await room.save()
    if room.approval_status == ApprovalStatus.APPROVED:
        await _notify_candidates(room, [c.user_id for c in new_cands])
    return room


async def remove_candidate(room_id: str, user_id: str) -> Optional[ExamRoom]:
    room = await ExamRoom.get(PydanticObjectId(room_id))
    if not room:
        return None
    room.candidates = [c for c in room.candidates if c.user_id != user_id]
    room.updated_at = datetime.now(timezone.utc)
    await room.save()
    return room


async def get_rooms_for_user(user_id: str, upcoming_only: bool = False) -> list[ExamRoom]:
    """Return all approved rooms where this user is a candidate."""
    query: dict = {"candidates.user_id": user_id, "approval_status": ApprovalStatus.APPROVED.value}
    if upcoming_only:
        query["status"] = {"$in": [ExamRoomStatus.SCHEDULED, ExamRoomStatus.IN_PROGRESS]}
    rooms = await ExamRoom.find(query).sort("scheduled_start").to_list()
    return rooms


async def mark_attendance(
    room_id: str,
    entries: list[dict],
) -> Optional[ExamRoom]:
    """Mark candidates as attended / seat number. entries = [{user_id, attended, seat_number?}]"""
    room = await ExamRoom.get(PydanticObjectId(room_id))
    if not room:
        return None
    lookup = {e["user_id"]: e for e in entries}
    for c in room.candidates:
        if c.user_id in lookup:
            upd = lookup[c.user_id]
            if "attended" in upd:
                c.attended = bool(upd["attended"])
            if "seat_number" in upd and upd["seat_number"] is not None:
                c.seat_number = str(upd["seat_number"])
    room.updated_at = datetime.now(timezone.utc)
    await room.save()
    return room


async def submit_offline_score(
    room_id: str,
    user_id: str,
    total_score: float,
    note: Optional[str] = None,
    graded_by: Optional[str] = None,
):
    """Record an offline (paper) exam score as an ExamSubmission tied to this room."""
    from app.models.exam import Exam, ExamSubmission
    from app.models.enums import ResultClassification
    from app.services.exam_service import classify_result

    room = await ExamRoom.get(PydanticObjectId(room_id))
    if not room:
        raise HTTPException(status_code=404, detail="Exam room not found")

    # Find candidate and mark attended
    found = False
    assigned_exam_id = None
    for c in room.candidates:
        if c.user_id == user_id:
            c.attended = True
            found = True
            assigned_exam_id = getattr(c, "assigned_exam_id", None)
            break
    if not found:
        raise HTTPException(status_code=400, detail="User is not a candidate of this room")

    # Resolve actual exam
    actual_exam_id = assigned_exam_id or (room.exam_ids[0] if room.exam_ids else room.exam_id)
    if not actual_exam_id:
        raise HTTPException(status_code=400, detail="No exam assigned for this room")

    exam = await Exam.get(PydanticObjectId(actual_exam_id))
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    now = datetime.now(timezone.utc)
    classification: ResultClassification = classify_result(total_score, exam)
    submission = ExamSubmission(
        exam_id=str(exam.id),
        user_id=user_id,
        answers=[],
        total_score=round(total_score, 2),
        total_correct=0,
        total_questions=len(exam.questions),
        classification=classification,
        submitted_at=now,
        graded_at=now,
        graded_by=graded_by or "offline",
    )
    await submission.insert()

    # Link submission back to candidate
    for c in room.candidates:
        if c.user_id == user_id:
            c.submission_id = str(submission.id)
            break
    room.updated_at = now
    await room.save()

    # Auto-issue certificate on pass
    try:
        from app.services.certificate_service import issue_certificate_for_room_submission
        await issue_certificate_for_room_submission(submission, room)
    except Exception:
        pass

    return submission


async def bulk_add_candidates_by_department(
    room_id: str, department_id: str, skill_levels: Optional[list[int]] = None,
) -> Optional[ExamRoom]:
    """Load all active workers in a department (optionally filtered by skill level)."""
    room = await ExamRoom.get(PydanticObjectId(room_id))
    if not room:
        return None
    query: dict = {"department_id": department_id, "is_active": True, "role": "worker"}
    if skill_levels:
        query["skill_level"] = {"$in": skill_levels}
    users = await User.find(query).to_list()
    existing_ids = {c.user_id for c in room.candidates}
    added: list[str] = []
    for u in users:
        if str(u.id) in existing_ids:
            continue
        if len(room.candidates) >= room.capacity:
            break
        assigned = random.choice(room.exam_ids) if room.exam_ids else None
        room.candidates.append(RoomCandidate(
            user_id=str(u.id),
            employee_id=u.employee_id,
            full_name=u.full_name,
            assigned_exam_id=assigned,
        ))
        added.append(str(u.id))
    room.updated_at = datetime.now(timezone.utc)
    await room.save()
    if room.approval_status == ApprovalStatus.APPROVED:
        await _notify_candidates(room, added)
    return room

async def update_room_approval(
    room_id: str, 
    status: ApprovalStatus, 
    reviewer_id: str, 
    notes: Optional[str]
) -> Optional[ExamRoom]:
    room = await ExamRoom.get(PydanticObjectId(room_id))
    if not room:
        return None
    if status == ApprovalStatus.APPROVED:
        if datetime.now(timezone.utc) >= room.scheduled_start:
            raise HTTPException(400, "Không thể duyệt vì thời gian thi đã bắt đầu hoặc kết thúc.")

    room.approval_status = status
    if status == ApprovalStatus.REJECTED:
        room.status = ExamRoomStatus.CANCELLED

    room.reviewed_by = reviewer_id
    room.review_notes = notes
    room.updated_at = datetime.now(timezone.utc)
    
    if status == ApprovalStatus.APPROVED:
        room.approved_at = datetime.now(timezone.utc)

    await room.save()
    
    if status == ApprovalStatus.APPROVED:
        await _notify_candidates(room, [c.user_id for c in room.candidates])
        
    return room
