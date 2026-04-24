from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from typing import Optional
import math

from app.api.deps import get_current_user, require_admin, require_staff
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user_schemas import (
    UserCreate, UserUpdate, UserResponse,
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
)
from app.schemas.common import StatusResponse
from app.utils.pagination import PaginatedResponse
from app.services import user_service

router = APIRouter(tags=["Users & Departments"])


# --- Department Endpoints ---

@router.post("/departments", response_model=DepartmentResponse, dependencies=[Depends(require_staff())])
async def create_department(data: DepartmentCreate):
    dept = await user_service.create_department(data)
    return DepartmentResponse(id=str(dept.id), **dept.model_dump(exclude={"id"}))


@router.get("/departments", response_model=list[DepartmentResponse])
async def list_departments(parent_id: Optional[str] = None):
    departments = await user_service.get_departments(parent_id)
    return [
        DepartmentResponse(id=str(d.id), **d.model_dump(exclude={"id"}))
        for d in departments
    ]


@router.get("/departments/{dept_id}", response_model=DepartmentResponse)
async def get_department(dept_id: str):
    dept = await user_service.get_department(dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return DepartmentResponse(id=str(dept.id), **dept.model_dump(exclude={"id"}))


@router.put("/departments/{dept_id}", response_model=DepartmentResponse, dependencies=[Depends(require_staff())])
async def update_department(dept_id: str, data: DepartmentUpdate):
    dept = await user_service.update_department(dept_id, data)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return DepartmentResponse(id=str(dept.id), **dept.model_dump(exclude={"id"}))


@router.delete("/departments/{dept_id}", response_model=StatusResponse, dependencies=[Depends(require_admin())])
async def delete_department(dept_id: str):
    success = await user_service.delete_department(dept_id)
    if not success:
        raise HTTPException(status_code=404, detail="Department not found")
    return StatusResponse(success=True, message="Department deleted")


# --- User Endpoints ---

@router.post("/users", response_model=UserResponse, dependencies=[Depends(require_admin())])
async def create_user(data: UserCreate):
    if await user_service.get_user_by_employee_id(data.employee_id):
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    if await user_service.get_user_by_username(data.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    user = await user_service.create_user(data)
    return UserResponse(
        id=str(user.id),
        **user.model_dump(exclude={"id", "password_hash"}),
    )


@router.get("/users", response_model=PaginatedResponse[UserResponse])
async def list_users(
    role: Optional[UserRole] = None,
    department_id: Optional[str] = None,
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    is_active: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    users, total = await user_service.get_users(
        role=role, department_id=department_id,
        occupation=occupation, skill_level=skill_level,
        is_active=is_active, skip=skip, limit=page_size,
    )
    return PaginatedResponse(
        items=[
            UserResponse(id=str(u.id), **u.model_dump(exclude={"id", "password_hash"}))
            for u in users
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


# NOTE: static-path routes (/users/import, /users/import-template) MUST be
# declared before any /users/{user_id} route, otherwise FastAPI matches the
# parameter route first and the path segment ("import-template") is treated
# as a user_id.

@router.post("/users/import", dependencies=[Depends(require_admin())])
async def import_users(file: UploadFile = File(...)):
    """Bulk import users from .xlsx. See user_import_service for required columns."""
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Only .xlsx files are accepted")
    from app.services.user_import_service import import_users_from_xlsx
    content = await file.read()
    result = await import_users_from_xlsx(content)
    return result


@router.get("/users/import-template")
async def download_user_import_template():
    """Download the .xlsx template for user import."""
    from app.utils.import_templates import build_user_import_template
    content = build_user_import_template()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="template-nhap-nguoi-dung.xlsx"'},
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=str(user.id), **user.model_dump(exclude={"id", "password_hash"}))


@router.put("/users/{user_id}", response_model=UserResponse, dependencies=[Depends(require_admin())])
async def update_user(user_id: str, data: UserUpdate):
    user = await user_service.update_user(user_id, data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=str(user.id), **user.model_dump(exclude={"id", "password_hash"}))


@router.delete("/users/{user_id}", response_model=StatusResponse, dependencies=[Depends(require_admin())])
async def delete_user(user_id: str):
    success = await user_service.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return StatusResponse(success=True, message="User deactivated")


@router.post("/users/{user_id}/activate", response_model=UserResponse, dependencies=[Depends(require_admin())])
async def activate_user(user_id: str):
    """Reactivate a deactivated user."""
    user = await user_service.update_user(user_id, UserUpdate(is_active=True))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=str(user.id), **user.model_dump(exclude={"id", "password_hash"}))


@router.patch("/users/{user_id}/role", response_model=UserResponse, dependencies=[Depends(require_admin())])
async def change_user_role(user_id: str, role: UserRole):
    """Quickly change just the role of a user (admin only)."""
    user = await user_service.update_user(user_id, UserUpdate(role=role))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=str(user.id), **user.model_dump(exclude={"id", "password_hash"}))
