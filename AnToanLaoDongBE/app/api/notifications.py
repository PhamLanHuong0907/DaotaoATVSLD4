"""Notification endpoints."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_user, require_staff
from app.models.notification import NotificationType
from app.models.user import User
from app.schemas.common import StatusResponse
from app.services import notification_service as svc

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: NotificationType
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int


class BroadcastRequest(BaseModel):
    user_ids: list[str]
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    type: NotificationType = NotificationType.GENERAL


def _to_response(n) -> NotificationResponse:
    return NotificationResponse(id=str(n.id), **n.model_dump(exclude={"id"}))


@router.get("", response_model=NotificationListResponse)
async def list_my_notifications(
    unread_only: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    items, total, unread = await svc.list_for_user(
        str(user.id), unread_only=unread_only, skip=skip, limit=page_size,
    )
    return NotificationListResponse(
        items=[_to_response(n) for n in items],
        total=total,
        unread_count=unread,
    )


@router.post("/{notif_id}/read", response_model=NotificationResponse)
async def mark_read(notif_id: str, user: User = Depends(get_current_user)):
    n = await svc.mark_read(notif_id, str(user.id))
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _to_response(n)


@router.post("/read-all", response_model=StatusResponse)
async def mark_all_read(user: User = Depends(get_current_user)):
    n = await svc.mark_all_read(str(user.id))
    return StatusResponse(success=True, message=f"Marked {n} notifications as read")


@router.post("/broadcast", response_model=StatusResponse)
async def broadcast(
    data: BroadcastRequest,
    _: User = Depends(require_staff()),
):
    count = await svc.create_bulk(
        user_ids=data.user_ids,
        title=data.title,
        body=data.body,
        link=data.link,
        type=data.type,
    )
    return StatusResponse(success=True, message=f"Sent {count} notifications")
