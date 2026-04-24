from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone

from app.models.enums import DocumentType, TrainingGroup, ApprovalStatus


class TrainingDocument(Document):
    title: str
    description: Optional[str] = None
    document_type: DocumentType
    file_name: str
    file_path: str
    file_size: int
    mime_type: str

    # Classification
    occupations: list[str] = []
    skill_levels: list[int] = []
    training_groups: list[TrainingGroup] = []
    legal_basis: Optional[str] = None
    tags: list[str] = []

    # Assignment scope
    assigned_department_ids: list[str] = []

    # Extracted content
    extracted_text: Optional[str] = None
    extracted_pages: list[str] = []  # Text per page/section for chunked AI processing
    total_chars: int = 0
    page_count: Optional[int] = None

    # Approval workflow
    status: ApprovalStatus = ApprovalStatus.DRAFT
    uploaded_by: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    approved_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "training_documents"
        indexes = [
            "document_type",
            "occupations",
            "skill_levels",
            "training_groups",
            "status",
            "assigned_department_ids",
        ]
