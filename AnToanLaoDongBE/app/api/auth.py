"""Authentication endpoints: register, login, me, change-password."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user, require_admin
from app.config import get_settings
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth_schemas import (
    RegisterRequest, LoginRequest, TokenResponse, MeResponse, ChangePasswordRequest,
    ProfileUpdateRequest, ResetPasswordRequest, RefreshTokenRequest,
)
from app.schemas.common import StatusResponse
from app.utils.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_refresh_token,
)
import jwt

router = APIRouter(prefix="/auth", tags=["Auth"])

_settings = get_settings()


def _to_me(u: User) -> MeResponse:
    return MeResponse(
        id=str(u.id),
        username=u.username,
        full_name=u.full_name,
        employee_id=u.employee_id,
        role=u.role,
        department_id=u.department_id,
        occupation=u.occupation,
        skill_level=u.skill_level,
        phone=u.phone,
        email=u.email,
        is_active=u.is_active,
        last_login_at=u.last_login_at,
    )


@router.post("/register", response_model=TokenResponse)
async def register(data: RegisterRequest):
    """Self-register a worker account. Admin/officer accounts must be created by admin."""
    if data.role not in (UserRole.WORKER,):
        raise HTTPException(status_code=403, detail="Only worker accounts may self-register")

    if await User.find_one(User.username == data.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    if await User.find_one(User.employee_id == data.employee_id):
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        employee_id=data.employee_id,
        role=data.role,
        department_id=data.department_id,
        occupation=data.occupation,
        skill_level=data.skill_level,
        phone=data.phone,
        email=data.email,
    )
    await user.insert()

    access = create_access_token(subject=str(user.id), role=user.role.value)
    refresh = create_refresh_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=_settings.JWT_EXPIRE_MINUTES * 60,
        user=_to_me(user),
    )


@router.post("/admin/create-user", response_model=MeResponse)
async def admin_create_user(data: RegisterRequest, _: User = Depends(require_admin())):
    """Admin creates a user of any role."""
    if await User.find_one(User.username == data.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    if await User.find_one(User.employee_id == data.employee_id):
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        employee_id=data.employee_id,
        role=data.role,
        department_id=data.department_id,
        occupation=data.occupation,
        skill_level=data.skill_level,
        phone=data.phone,
        email=data.email,
    )
    await user.insert()
    return _to_me(user)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    user = await User.find_one(User.username == data.username)
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    user.last_login_at = datetime.now(timezone.utc)
    await user.save()

    access = create_access_token(subject=str(user.id), role=user.role.value)
    refresh = create_refresh_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=_settings.JWT_EXPIRE_MINUTES * 60,
        user=_to_me(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshTokenRequest):
    """Exchange a valid refresh token for a new access + refresh pair."""
    try:
        payload = decode_refresh_token(data.refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    from beanie import PydanticObjectId
    try:
        user = await User.get(PydanticObjectId(sub))
    except Exception:
        user = None
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    access = create_access_token(subject=str(user.id), role=user.role.value)
    refresh_tok = create_refresh_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh_tok,
        expires_in=_settings.JWT_EXPIRE_MINUTES * 60,
        user=_to_me(user),
    )


@router.get("/me", response_model=MeResponse)
async def me(user: User = Depends(get_current_user)):
    return _to_me(user)


@router.post("/change-password", response_model=StatusResponse)
async def change_password(data: ChangePasswordRequest, user: User = Depends(get_current_user)):
    if not verify_password(data.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Old password incorrect")
    user.password_hash = hash_password(data.new_password)
    user.updated_at = datetime.now(timezone.utc)
    await user.save()
    return StatusResponse(success=True, message="Password changed")


@router.put("/me", response_model=MeResponse)
async def update_profile(
    data: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
):
    """Update editable profile fields (name, phone, email)."""
    update = data.model_dump(exclude_unset=True)
    if update:
        update["updated_at"] = datetime.now(timezone.utc)
        await user.set(update)
    return _to_me(user)


@router.post("/admin/users/{user_id}/reset-password", response_model=StatusResponse)
async def admin_reset_password(
    user_id: str,
    data: ResetPasswordRequest,
    _: User = Depends(require_admin()),
):
    """Admin force-resets a user's password."""
    from beanie import PydanticObjectId
    target = await User.get(PydanticObjectId(user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.password_hash = hash_password(data.new_password)
    target.updated_at = datetime.now(timezone.utc)
    await target.save()
    return StatusResponse(success=True, message="Password reset")


async def ensure_bootstrap_admin() -> None:
    """Create default admin if none exists. Called on app startup."""
    existing = await User.find_one(User.role == UserRole.ADMIN)
    if existing:
        return
    admin = User(
        username=_settings.BOOTSTRAP_ADMIN_USERNAME,
        password_hash=hash_password(_settings.BOOTSTRAP_ADMIN_PASSWORD),
        full_name="System Administrator",
        employee_id="ADMIN",
        role=UserRole.ADMIN,
        department_id=None,
        occupation="Administrator",
        skill_level=1,
    )
    await admin.insert()
