from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.models.user import User
from app.models.department import Department
from app.models.enums import UserRole
from app.schemas.user_schemas import (
    UserCreate, UserUpdate, DepartmentCreate, DepartmentUpdate,
)
from app.utils.security import hash_password


# --- Department Service ---

async def create_department(data: DepartmentCreate) -> Department:
    dept = Department(**data.model_dump())
    await dept.insert()
    return dept


async def get_departments(
    parent_id: Optional[str] = None,
) -> list[Department]:
    query = {}
    if parent_id is not None:
        query["parent_id"] = parent_id
    return await Department.find(query).to_list()


async def get_department(dept_id: str) -> Optional[Department]:
    return await Department.get(PydanticObjectId(dept_id))


async def update_department(dept_id: str, data: DepartmentUpdate) -> Optional[Department]:
    dept = await Department.get(PydanticObjectId(dept_id))
    if not dept:
        return None
    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    await dept.set(update_data)
    return dept


async def delete_department(dept_id: str) -> bool:
    dept = await Department.get(PydanticObjectId(dept_id))
    if not dept:
        return False
    await dept.delete()
    return True


# --- User Service ---

async def create_user(data: UserCreate) -> User:
    payload = data.model_dump()
    raw_password = payload.pop("password")
    user = User(**payload, password_hash=hash_password(raw_password))
    await user.insert()
    return user


async def get_user_by_username(username: str) -> Optional[User]:
    return await User.find_one(User.username == username)


async def get_users(
    role: Optional[UserRole] = None,
    department_id: Optional[str] = None,
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[User], int]:
    query = {}
    if role:
        query["role"] = role
    if department_id:
        query["department_id"] = department_id
    if occupation:
        query["occupation"] = occupation
    if skill_level is not None:
        query["skill_level"] = skill_level
    if is_active is not None:
        query["is_active"] = is_active

    total = await User.find(query).count()
    users = await User.find(query).skip(skip).limit(limit).to_list()
    return users, total


async def get_user(user_id: str) -> Optional[User]:
    return await User.get(PydanticObjectId(user_id))


async def get_user_by_employee_id(employee_id: str) -> Optional[User]:
    return await User.find_one(User.employee_id == employee_id)


async def update_user(user_id: str, data: UserUpdate) -> Optional[User]:
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        return None
    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    await user.set(update_data)
    return user


async def delete_user(user_id: str) -> bool:
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        return False
    await user.set({"is_active": False, "updated_at": datetime.now(timezone.utc)})
    return True
