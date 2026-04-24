"""Certificate (chứng chỉ) — issued automatically when a worker passes an exam.

Each certificate has a unique code that can be verified publicly via QR/URL.
"""
import uuid
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone

from app.models.enums import ResultClassification, ExamType


def _gen_code() -> str:
    return f"ATVSLD-{datetime.now().year}-{uuid.uuid4().hex[:8].upper()}"


class Certificate(Document):
    code: str = Field(default_factory=_gen_code)

    user_id: str
    employee_id: str
    full_name: str
    department_id: Optional[str] = None
    occupation: Optional[str] = None
    skill_level: Optional[int] = None

    exam_id: str
    exam_name: str
    exam_type: ExamType
    submission_id: str

    score: float
    classification: ResultClassification

    issued_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    valid_until: Optional[datetime] = None
    revoked: bool = False
    revoked_reason: Optional[str] = None

    pdf_path: Optional[str] = None  # generated on demand

    class Settings:
        name = "certificates"
        indexes = [
            "code",
            "user_id",
            "exam_id",
            "submission_id",
            "issued_at",
        ]
