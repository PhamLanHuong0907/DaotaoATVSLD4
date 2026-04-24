"""System-wide configurable settings (singleton document).

Stored as a single document with fixed `_key="global"` so the admin can
edit them at runtime without redeploying.
"""
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone


class SystemSettings(Document):
    key: str = Field(default="global", unique=True)

    # Company / branding
    company_name: str = "Công ty than Dương Huy"
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    logo_url: Optional[str] = None

    # Certificate
    certificate_validity_months: int = 12
    certificate_signer_name: Optional[str] = None
    certificate_signer_title: Optional[str] = "Giám đốc"

    # Exam policy
    default_passing_score: float = 5.0
    allow_self_register: bool = True

    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: Optional[str] = None

    class Settings:
        name = "system_settings"
        indexes = ["key"]


async def get_settings_doc() -> SystemSettings:
    doc = await SystemSettings.find_one(SystemSettings.key == "global")
    if not doc:
        doc = SystemSettings()
        await doc.insert()
    return doc
