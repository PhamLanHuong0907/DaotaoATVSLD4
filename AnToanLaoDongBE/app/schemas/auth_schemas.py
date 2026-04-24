from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.models.enums import UserRole


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=128)
    full_name: str
    employee_id: str
    role: UserRole = UserRole.WORKER
    department_id: Optional[str] = None
    occupation: Optional[str] = None
    skill_level: int = Field(default=1, ge=1, le=7)
    phone: Optional[str] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    user: "MeResponse"


class MeResponse(BaseModel):
    id: str
    username: str
    full_name: str
    employee_id: str
    role: UserRole
    department_id: Optional[str] = None
    occupation: Optional[str] = None
    skill_level: int
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool
    last_login_at: Optional[datetime] = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=128)


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=6, max_length=128)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


TokenResponse.model_rebuild()
