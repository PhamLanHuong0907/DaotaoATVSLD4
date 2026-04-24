from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.models.enums import UserRole


# --- Department Schemas ---

class DepartmentCreate(BaseModel):
    name: str
    code: str
    parent_id: Optional[str] = None
    description: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    parent_id: Optional[str] = None
    description: Optional[str] = None


class DepartmentResponse(BaseModel):
    id: str
    name: str
    code: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# --- User Schemas ---

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=128)
    full_name: str
    employee_id: str
    role: UserRole
    department_id: Optional[str] = None
    occupation: Optional[str] = None
    skill_level: int = Field(default=1, ge=1, le=7)
    phone: Optional[str] = None
    email: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    department_id: Optional[str] = None
    occupation: Optional[str] = None
    skill_level: Optional[int] = Field(default=None, ge=1, le=7)
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
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
    created_at: datetime
    updated_at: datetime
