"""Password hashing + JWT helpers."""
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from passlib.context import CryptContext

from app.config import get_settings

_settings = get_settings()
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
REFRESH_TOKEN_TYPE = "refresh"
ACCESS_TOKEN_TYPE = "access"


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _pwd.verify(plain, hashed)
    except Exception:
        return False


def create_access_token(
    subject: str,
    role: str,
    extra: Optional[dict] = None,
    expires_minutes: Optional[int] = None,
) -> str:
    exp_min = expires_minutes or _settings.JWT_EXPIRE_MINUTES
    payload = {
        "sub": subject,
        "role": role,
        "type": ACCESS_TOKEN_TYPE,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=exp_min),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, _settings.JWT_SECRET, algorithm=ALGORITHM)


def create_refresh_token(subject: str, role: str) -> str:
    payload = {
        "sub": subject,
        "role": role,
        "type": REFRESH_TOKEN_TYPE,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=_settings.JWT_REFRESH_EXPIRE_DAYS),
    }
    return jwt.encode(payload, _settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, _settings.JWT_SECRET, algorithms=[ALGORITHM])


def decode_refresh_token(token: str) -> dict:
    payload = jwt.decode(token, _settings.JWT_SECRET, algorithms=[ALGORITHM])
    if payload.get("type") != REFRESH_TOKEN_TYPE:
        raise jwt.InvalidTokenError("Not a refresh token")
    return payload
