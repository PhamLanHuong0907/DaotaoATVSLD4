"""Read-only audit log endpoints (admin)."""
import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.deps import require_admin
from app.models.audit_log import AuditLog
from app.models.user import User
from app.utils.pagination import PaginatedResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit"])


class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_username: Optional[str] = None
    actor_role: Optional[str] = None
    method: str
    path: str
    status_code: int
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    summary: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime


@router.get("", response_model=PaginatedResponse[AuditLogResponse])
async def list_audit_logs(
    actor_id: Optional[str] = None,
    method: Optional[str] = None,
    path_prefix: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    _: User = Depends(require_admin()),
):
    query: dict = {}
    if actor_id:
        query["actor_id"] = actor_id
    if method:
        query["method"] = method.upper()
    if path_prefix:
        # mongodb regex prefix match
        query["path"] = {"$regex": f"^{path_prefix}"}

    skip = (page - 1) * page_size
    total = await AuditLog.find(query).count()
    items = (
        await AuditLog.find(query)
        .sort("-created_at")
        .skip(skip)
        .limit(page_size)
        .to_list()
    )
    return PaginatedResponse(
        items=[
            AuditLogResponse(id=str(i.id), **i.model_dump(exclude={"id", "extra"}))
            for i in items
        ],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )
