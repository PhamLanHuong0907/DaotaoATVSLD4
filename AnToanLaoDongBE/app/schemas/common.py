from pydantic import BaseModel
from typing import Optional, Any


class StatusResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None


class StatusUpdateRequest(BaseModel):
    status: str
    review_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
