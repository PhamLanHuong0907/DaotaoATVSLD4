"""Issue and lookup certificates."""
from datetime import datetime, timedelta, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.models.certificate import Certificate
from app.models.exam import Exam, ExamSubmission
from app.models.enums import ResultClassification
from app.models.user import User


PASSING_CLASSIFICATIONS = {
    ResultClassification.AVERAGE,
    ResultClassification.GOOD,
    ResultClassification.EXCELLENT,
}


async def issue_certificate_for_submission(
    submission: ExamSubmission,
    valid_months: Optional[int] = None,
) -> Optional[Certificate]:
    """Issue (or fetch existing) certificate for a passed submission.

    No-op if the submission did not pass. Idempotent: if a certificate
    already exists for this submission, return it instead of creating a new one.
    """
    if not submission.classification or submission.classification not in PASSING_CLASSIFICATIONS:
        return None

    existing = await Certificate.find_one(Certificate.submission_id == str(submission.id))
    if existing:
        return existing

    exam = await Exam.get(PydanticObjectId(submission.exam_id))
    if not exam:
        return None
    user = None
    try:
        user = await User.get(PydanticObjectId(submission.user_id))
    except Exception:
        pass

    # Pull validity from system settings if not explicit
    if valid_months is None:
        try:
            from app.models.system_settings import get_settings_doc
            settings = await get_settings_doc()
            valid_months = settings.certificate_validity_months
        except Exception:
            valid_months = 12

    cert = Certificate(
        user_id=submission.user_id,
        employee_id=user.employee_id if user else "",
        full_name=user.full_name if user else "",
        department_id=user.department_id if user else None,
        occupation=user.occupation if user else None,
        skill_level=user.skill_level if user else None,
        exam_id=str(exam.id),
        exam_name=exam.name,
        exam_type=exam.exam_type,
        submission_id=str(submission.id),
        score=submission.total_score,
        classification=submission.classification,
        valid_until=datetime.now(timezone.utc) + timedelta(days=30 * valid_months),
    )
    await cert.insert()

    # Webhook fire for downstream systems
    try:
        from app.services.webhook_service import fire_event
        from app.models.webhook import WebhookEvent
        await fire_event(WebhookEvent.CERTIFICATE_ISSUED, {
            "certificate_id": str(cert.id),
            "code": cert.code,
            "user_id": cert.user_id,
            "employee_id": cert.employee_id,
            "full_name": cert.full_name,
            "exam_name": cert.exam_name,
            "score": cert.score,
            "issued_at": cert.issued_at.isoformat(),
            "valid_until": cert.valid_until.isoformat() if cert.valid_until else None,
        })
    except Exception:
        pass

    return cert




async def issue_certificate_for_room_submission(
    submission,  # ExamSubmission
    room,        # ExamRoom
) -> Optional[Certificate]:
    """Issue certificate using ExamRoom's certificate_type_id instead of exam name.

    Only if the room has certificate_type_id set and the score meets
    the room's certificate_passing_score (or exam passing_score as fallback).
    """
    if not submission.classification or submission.classification not in PASSING_CLASSIFICATIONS:
        return None

    # Check room-level passing score
    room_passing = getattr(room, "certificate_passing_score", None)
    if room_passing is not None and submission.total_score < room_passing:
        return None

    cert_type_id = getattr(room, "certificate_type_id", None)
    if not cert_type_id:
        # No cert type on room — fall through to default behavior
        return await issue_certificate_for_submission(submission)

    # Idempotent
    existing = await Certificate.find_one(Certificate.submission_id == str(submission.id))
    if existing:
        return existing

    # Resolve from catalog
    cert_name = None
    valid_months = None
    try:
        from app.models.catalog import CertificateType as CertTypeCatalog
        ct = await CertTypeCatalog.get(PydanticObjectId(cert_type_id))
        if ct:
            cert_name = ct.name
            valid_months = ct.validity_months
    except Exception:
        pass

    from app.models.exam import Exam
    exam = await Exam.get(PydanticObjectId(submission.exam_id))
    if not exam:
        return None

    if cert_name is None:
        cert_name = exam.name
    if valid_months is None:
        try:
            from app.models.system_settings import get_settings_doc
            settings = await get_settings_doc()
            valid_months = settings.certificate_validity_months
        except Exception:
            valid_months = 12

    user = None
    try:
        user = await User.get(PydanticObjectId(submission.user_id))
    except Exception:
        pass

    cert = Certificate(
        user_id=submission.user_id,
        employee_id=user.employee_id if user else "",
        full_name=user.full_name if user else "",
        department_id=user.department_id if user else None,
        occupation=user.occupation if user else None,
        skill_level=user.skill_level if user else None,
        exam_id=str(exam.id),
        exam_name=cert_name,
        exam_type=exam.exam_type,
        submission_id=str(submission.id),
        score=submission.total_score,
        classification=submission.classification,
        valid_until=datetime.now(timezone.utc) + timedelta(days=30 * valid_months),
    )
    await cert.insert()

    try:
        from app.services.webhook_service import fire_event
        from app.models.webhook import WebhookEvent
        await fire_event(WebhookEvent.CERTIFICATE_ISSUED, {
            "certificate_id": str(cert.id),
            "code": cert.code,
            "user_id": cert.user_id,
            "full_name": cert.full_name,
            "exam_name": cert.exam_name,
            "score": cert.score,
            "issued_at": cert.issued_at.isoformat(),
            "valid_until": cert.valid_until.isoformat() if cert.valid_until else None,
        })
    except Exception:
        pass

    return cert


async def get_certificate(cert_id: str) -> Optional[Certificate]:
    return await Certificate.get(PydanticObjectId(cert_id))


async def get_certificate_by_code(code: str) -> Optional[Certificate]:
    return await Certificate.find_one(Certificate.code == code)


async def list_certificates_for_user(user_id: str) -> list[Certificate]:
    return await Certificate.find(Certificate.user_id == user_id).sort("-issued_at").to_list()


async def list_all_certificates(
    department_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Certificate], int]:
    query: dict = {}
    if department_id:
        query["department_id"] = department_id
    total = await Certificate.find(query).count()
    items = await Certificate.find(query).sort("-issued_at").skip(skip).limit(limit).to_list()
    return items, total


async def revoke_certificate(cert_id: str, reason: str) -> Optional[Certificate]:
    cert = await Certificate.get(PydanticObjectId(cert_id))
    if not cert:
        return None
    cert.revoked = True
    cert.revoked_reason = reason
    await cert.save()
    return cert


async def list_expiring(within_days: int = 60) -> list[Certificate]:
    """Active certificates whose `valid_until` falls within the next N days."""
    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=within_days)
    return await Certificate.find({
        "revoked": False,
        "valid_until": {"$ne": None, "$gte": now, "$lte": horizon},
    }).sort("valid_until").to_list()


async def list_expired() -> list[Certificate]:
    now = datetime.now(timezone.utc)
    return await Certificate.find({
        "revoked": False,
        "valid_until": {"$ne": None, "$lt": now},
    }).to_list()


async def notify_expiring_certificates(within_days: int = 30) -> int:
    """For each cert expiring within N days, push an in-app notification once.

    Idempotent within a day: uses a marker `_notified_expiring` field on the cert
    storing the date of the last notification. Returns number of notifications sent.
    """
    from app.services.notification_service import create_notification
    from app.models.notification import NotificationType

    expiring = await list_expiring(within_days=within_days)
    today_str = datetime.now(timezone.utc).date().isoformat()
    sent = 0
    for cert in expiring:
        marker = getattr(cert, "model_extra", {}).get("_notified_expiring") if hasattr(cert, "model_extra") else None
        if marker == today_str:
            continue
        days_left = (cert.valid_until - datetime.now(timezone.utc)).days
        try:
            vn_tz = timezone(timedelta(hours=7))
            await create_notification(
                user_id=cert.user_id,
                type=NotificationType.CERTIFICATE_ISSUED,
                title=f"Chứng chỉ sắp hết hạn (còn {days_left} ngày)",
                body=f"Chứng chỉ {cert.code} cho '{cert.exam_name}' sẽ hết hạn ngày {cert.valid_until.astimezone(vn_tz).strftime('%d/%m/%Y')}. Vui lòng đăng ký kỳ thi tái cấp.",
                link="/certificates",
            )
            sent += 1
        except Exception:
            pass
    return sent


async def get_expiry_summary(within_days: int = 60) -> dict:
    """Counts for dashboard widget."""
    expiring = await list_expiring(within_days=within_days)
    expired = await list_expired()
    return {
        "expiring_count": len(expiring),
        "expired_count": len(expired),
        "within_days": within_days,
        "items": [
            {
                "id": str(c.id),
                "code": c.code,
                "full_name": c.full_name,
                "employee_id": c.employee_id,
                "exam_name": c.exam_name,
                "valid_until": c.valid_until.isoformat() if c.valid_until else None,
                "days_left": (c.valid_until - datetime.now(timezone.utc)).days if c.valid_until else None,
            }
            for c in expiring[:50]
        ],
    }
