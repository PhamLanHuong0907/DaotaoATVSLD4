"""ASGI middleware that logs mutating admin actions to AuditLog.

Logged when ALL of these are true:
  - method is POST/PUT/PATCH/DELETE
  - path starts with /api/v1/
  - response status < 500

Authorship is best-effort: we decode the bearer token to get the user id.
"""
import logging
from typing import Iterable

import jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.utils.security import decode_access_token

logger = logging.getLogger(__name__)

LOGGED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PATH_PREFIXES: Iterable[str] = (
    "/api/v1/auth/login",
    "/api/v1/notifications/",  # noisy mark-read
)


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        try:
            await self._maybe_log(request, response)
        except Exception as e:
            logger.warning("audit log failed: %s", e)
        return response

    async def _maybe_log(self, request: Request, response: Response) -> None:
        path = request.url.path
        if request.method not in LOGGED_METHODS:
            return
        if not path.startswith("/api/v1/"):
            return
        if any(path.startswith(p) for p in SKIP_PATH_PREFIXES):
            return
        if response.status_code >= 500:
            return

        actor_id = None
        actor_username = None
        actor_role = None

        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
            try:
                payload = decode_access_token(token)
                actor_id = payload.get("sub")
                actor_role = payload.get("role")
            except jwt.PyJWTError:
                pass

        # Best-effort: fetch username (cheap because user is cached by Beanie?)
        if actor_id:
            try:
                from beanie import PydanticObjectId
                from app.models.user import User
                u = await User.get(PydanticObjectId(actor_id))
                if u:
                    actor_username = u.username
            except Exception:
                pass

        from app.models.audit_log import AuditLog
        log = AuditLog(
            actor_id=actor_id,
            actor_username=actor_username,
            actor_role=actor_role,
            method=request.method,
            path=path,
            status_code=response.status_code,
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        await log.insert()
