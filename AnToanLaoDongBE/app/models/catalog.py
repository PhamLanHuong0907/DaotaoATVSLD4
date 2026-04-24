"""Catalog models: Occupation (nghề) and CertificateType (loại chứng chỉ).

These provide reference data used across exams, practical exams, and certificates.
"""
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone


class Occupation(Document):
    code: str
    name: str
    description: Optional[str] = None
    skill_levels: list[int] = Field(default_factory=list)
    is_active: bool = True

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "occupations"
        indexes = ["code", "is_active"]


class CertificateType(Document):
    code: str
    name: str
    description: Optional[str] = None
    validity_months: int = 12
    issuing_authority: Optional[str] = None
    is_active: bool = True

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "certificate_types"
        indexes = ["code", "is_active"]
