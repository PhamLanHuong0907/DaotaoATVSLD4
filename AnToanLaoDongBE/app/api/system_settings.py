"""Read/update system-wide settings (admin only)."""
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.api.deps import get_current_user, require_admin
from app.config import get_settings as get_app_settings
from app.models.system_settings import SystemSettings, get_settings_doc
from app.models.user import User

router = APIRouter(prefix="/settings", tags=["System settings"])


class SettingsResponse(BaseModel):
    company_name: str
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    logo_url: Optional[str] = None
    certificate_validity_months: int
    certificate_signer_name: Optional[str] = None
    certificate_signer_title: Optional[str] = None
    default_passing_score: float
    allow_self_register: bool
    updated_at: datetime
    updated_by: Optional[str] = None


class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    logo_url: Optional[str] = None
    certificate_validity_months: Optional[int] = None
    certificate_signer_name: Optional[str] = None
    certificate_signer_title: Optional[str] = None
    default_passing_score: Optional[float] = None
    allow_self_register: Optional[bool] = None


def _to_response(s: SystemSettings) -> SettingsResponse:
    return SettingsResponse(**s.model_dump(exclude={"id", "key"}))


@router.get("", response_model=SettingsResponse)
async def get_settings(_: User = Depends(get_current_user)):
    """Any authenticated user may read settings (UI needs branding)."""
    doc = await get_settings_doc()
    return _to_response(doc)


@router.put("", response_model=SettingsResponse)
async def update_settings(
    data: SettingsUpdate,
    user: User = Depends(require_admin()),
):
    doc = await get_settings_doc()
    update = data.model_dump(exclude_unset=True)
    update["updated_at"] = datetime.now(timezone.utc)
    update["updated_by"] = str(user.id)
    await doc.set(update)
    doc = await get_settings_doc()
    return _to_response(doc)


_ALLOWED_LOGO_EXT = {".png", ".jpg", ".jpeg", ".webp", ".svg"}


@router.post("/logo", response_model=SettingsResponse)
async def upload_logo(
    file: UploadFile = File(...),
    user: User = Depends(require_admin()),
):
    """Upload company logo file. Returns updated settings (with logo_url)."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in _ALLOWED_LOGO_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"Logo extension {ext} not allowed. Use one of {_ALLOWED_LOGO_EXT}",
        )

    app_settings = get_app_settings()
    logo_dir = os.path.join(app_settings.UPLOAD_DIR, "logos")
    os.makedirs(logo_dir, exist_ok=True)

    filename = f"logo_{uuid.uuid4().hex[:8]}{ext}"
    full_path = os.path.join(logo_dir, filename)
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    with open(full_path, "wb") as f:
        f.write(content)

    public_url = f"/api/v1/logos/{filename}"

    doc = await get_settings_doc()
    await doc.set({
        "logo_url": public_url,
        "updated_at": datetime.now(timezone.utc),
        "updated_by": str(user.id),
    })
    doc = await get_settings_doc()
    return _to_response(doc)
