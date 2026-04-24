from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.models.enums import DocumentType, TrainingGroup, ApprovalStatus


class DocumentUploadMeta(BaseModel):
    title: str
    description: Optional[str] = None
    document_type: DocumentType
    occupations: list[str] = []
    skill_levels: list[int] = []
    training_groups: list[TrainingGroup] = []
    legal_basis: Optional[str] = None
    tags: list[str] = []
    uploaded_by: str


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    document_type: Optional[DocumentType] = None
    occupations: Optional[list[str]] = None
    skill_levels: Optional[list[int]] = None
    training_groups: Optional[list[TrainingGroup]] = None
    legal_basis: Optional[str] = None
    tags: Optional[list[str]] = None
    assigned_department_ids: Optional[list[str]] = None


class DocumentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    document_type: DocumentType
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    occupations: list[str] = []
    skill_levels: list[int] = []
    training_groups: list[TrainingGroup] = []
    legal_basis: Optional[str] = None
    tags: list[str] = []
    assigned_department_ids: list[str] = []
    page_count: Optional[int] = None
    status: ApprovalStatus
    uploaded_by: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    id: str
    title: str
    document_type: DocumentType
    file_name: str
    file_size: int
    occupations: list[str] = []
    training_groups: list[TrainingGroup] = []
    assigned_department_ids: list[str] = []
    status: ApprovalStatus
    created_at: datetime
