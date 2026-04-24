"""Shared FastAPI dependencies: current user + role guards."""
from typing import Iterable, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from beanie import PydanticObjectId
import jwt

from app.models.enums import UserRole
from app.models.user import User
from app.utils.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> User:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    try:
        user = await User.get(PydanticObjectId(sub))
    except Exception:
        user = None
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_roles(*roles: UserRole):
    allowed = {r.value if isinstance(r, UserRole) else r for r in roles}

    async def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed and user.role.value not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden: insufficient role")
        return user

    return _checker


def require_admin():
    return require_roles(UserRole.ADMIN)


def require_staff():
    """Admin or Training Officer — content/exam managers."""
    return require_roles(UserRole.ADMIN, UserRole.TRAINING_OFFICER)
