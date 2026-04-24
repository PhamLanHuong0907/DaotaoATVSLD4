"""Webhook configuration endpoints (admin only)."""
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import require_admin
from app.models.user import User
from app.models.webhook import Webhook, WebhookEvent
from app.services.webhook_service import fire_event

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


class WebhookCreate(BaseModel):
    name: str
    url: str
    events: list[WebhookEvent]
    secret: Optional[str] = None


class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[list[WebhookEvent]] = None
    secret: Optional[str] = None
    is_active: Optional[bool] = None


class WebhookResponse(BaseModel):
    id: str
    name: str
    url: str
    events: list[WebhookEvent]
    secret: Optional[str] = None
    is_active: bool
    last_triggered_at: Optional[datetime] = None
    last_status_code: Optional[int] = None
    last_error: Optional[str] = None
    success_count: int
    failure_count: int
    created_at: datetime
    updated_at: datetime


def _to_response(w: Webhook) -> WebhookResponse:
    return WebhookResponse(id=str(w.id), **w.model_dump(exclude={"id", "created_by"}))


@router.get("", response_model=list[WebhookResponse])
async def list_webhooks(_: User = Depends(require_admin())):
    items = await Webhook.find().sort("-created_at").to_list()
    return [_to_response(w) for w in items]


@router.post("", response_model=WebhookResponse)
async def create_webhook(data: WebhookCreate, user: User = Depends(require_admin())):
    if not data.url.startswith(("http://", "https://")):
        raise HTTPException(400, "URL must start with http:// or https://")
    w = Webhook(**data.model_dump(), created_by=str(user.id))
    await w.insert()
    return _to_response(w)


@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: str,
    data: WebhookUpdate,
    _: User = Depends(require_admin()),
):
    w = await Webhook.get(PydanticObjectId(webhook_id))
    if not w:
        raise HTTPException(404, "Not found")
    update = data.model_dump(exclude_unset=True)
    update["updated_at"] = datetime.now(timezone.utc)
    await w.set(update)
    return _to_response(w)


@router.delete("/{webhook_id}")
async def delete_webhook(webhook_id: str, _: User = Depends(require_admin())):
    w = await Webhook.get(PydanticObjectId(webhook_id))
    if not w:
        raise HTTPException(404, "Not found")
    await w.delete()
    return {"success": True}


@router.post("/{webhook_id}/test")
async def test_webhook(webhook_id: str, _: User = Depends(require_admin())):
    """Fire a test ping to this webhook immediately and report the latest status."""
    w = await Webhook.get(PydanticObjectId(webhook_id))
    if not w:
        raise HTTPException(404, "Not found")
    from app.services.webhook_service import _send_one
    await _send_one(w, WebhookEvent.USER_CREATED, {"test": True, "message": "ping from ATVSLĐ admin"})
    return {
        "ok": w.last_status_code is not None and 200 <= w.last_status_code < 300,
        "status_code": w.last_status_code,
        "error": w.last_error,
    }
