"""Certificate endpoints (chứng chỉ)."""
import math
import os
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.api.deps import get_current_user, require_staff
from app.models.user import User
from app.models.enums import ResultClassification, ExamType, UserRole
from app.services import certificate_service as svc
from app.utils.certificate_pdf import generate_certificate_pdf
from app.utils.pagination import PaginatedResponse

router = APIRouter(prefix="/certificates", tags=["Certificates"])


class CertificateResponse(BaseModel):
    id: str
    code: str
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
    issued_at: datetime
    valid_until: Optional[datetime] = None
    revoked: bool
    revoked_reason: Optional[str] = None


class RevokeRequest(BaseModel):
    reason: str


def _to_response(c) -> CertificateResponse:
    return CertificateResponse(id=str(c.id), **c.model_dump(exclude={"id", "pdf_path"}))


@router.get("/my", response_model=list[CertificateResponse])
async def list_my_certificates(user: User = Depends(get_current_user)):
    certs = await svc.list_certificates_for_user(str(user.id))
    return [_to_response(c) for c in certs]


@router.get("/expiring/summary")
async def expiring_summary(
    within_days: int = 60,
    _: User = Depends(require_staff()),
):
    """Dashboard: count + list of certificates expiring soon."""
    return await svc.get_expiry_summary(within_days=within_days)


@router.post("/expiring/notify-now", response_model=dict)
async def notify_expiring_now(
    within_days: int = 30,
    _: User = Depends(require_staff()),
):
    """Manually trigger expiry notifications."""
    sent = await svc.notify_expiring_certificates(within_days=within_days)
    return {"sent": sent}


class RetrainPeriodRequest(BaseModel):
    name: Optional[str] = None
    within_days: int = 60
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


@router.post("/expiring/create-retrain-period")
async def create_retrain_period(
    data: RetrainPeriodRequest,
    user: User = Depends(require_staff()),
):
    """Create a draft ExamPeriod targeting users with expiring certificates.

    Bundles all affected user_ids' departments into one period and adds a notification.
    """
    from datetime import timedelta
    from app.models.enums import ExamType, ExamPeriodStatus
    from app.models.exam_period import ExamPeriod
    from app.models.user import User as UserModel
    from app.services.notification_service import create_bulk
    from app.models.notification import NotificationType
    from beanie import PydanticObjectId

    expiring = await svc.list_expiring(within_days=data.within_days)
    expired = await svc.list_expired()
    targets = expiring + expired
    if not targets:
        raise HTTPException(status_code=400, detail="Không có chứng chỉ sắp hết hạn nào")

    # Collect departments + most-common exam_type
    dept_set: set[str] = set()
    type_counts: dict[str, int] = {}
    affected_user_ids: set[str] = set()
    for c in targets:
        affected_user_ids.add(c.user_id)
        type_counts[c.exam_type.value if hasattr(c.exam_type, "value") else str(c.exam_type)] = (
            type_counts.get(str(c.exam_type), 0) + 1
        )
        try:
            u = await UserModel.get(PydanticObjectId(c.user_id))
            if u and u.department_id:
                dept_set.add(u.department_id)
        except Exception:
            pass

    # Pick the most common exam_type
    top_type_str = max(type_counts.items(), key=lambda x: x[1])[0]
    try:
        exam_type = ExamType(top_type_str)
    except ValueError:
        exam_type = ExamType.PERIODIC_ATVSLD

    start = data.start_date or (datetime.now() + timedelta(days=14))
    end = data.end_date or (start + timedelta(days=14))

    from datetime import timezone, timedelta
    vn_tz = timezone(timedelta(hours=7))

    period = ExamPeriod(
        name=data.name or f"Tái cấp chứng chỉ - {datetime.now().astimezone(vn_tz).strftime('%m/%Y')}",
        description=f"Tự động tạo từ {len(targets)} chứng chỉ sắp / đã hết hạn",
        exam_type=exam_type,
        start_date=start,
        end_date=end,
        department_ids=list(dept_set),
        target_occupations=[],
        target_skill_levels=[],
        status=ExamPeriodStatus.DRAFT,
        created_by=str(user.id),
    )
    await period.insert()

    # Notify affected workers
    try:
        await create_bulk(
            user_ids=list(affected_user_ids),
            type=NotificationType.EXAM_SCHEDULED,
            title="Bạn cần tái cấp chứng chỉ ATVSLĐ",
            body=f"Hệ thống đã lên kế hoạch kỳ thi tái cấp dự kiến {start.astimezone(vn_tz).strftime('%d/%m/%Y')}. Vui lòng theo dõi lịch thi.",
            link="/exams/schedule",
        )
    except Exception:
        pass

    return {
        "period_id": str(period.id),
        "name": period.name,
        "affected_certs": len(targets),
        "affected_users": len(affected_user_ids),
        "departments": len(dept_set),
        "exam_type": exam_type.value,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
    }


@router.get("", response_model=PaginatedResponse[CertificateResponse])
async def list_certificates(
    department_id: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: User = Depends(require_staff()),
):
    skip = (page - 1) * page_size
    items, total = await svc.list_all_certificates(department_id, skip, page_size)
    return PaginatedResponse(
        items=[_to_response(c) for c in items],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/verify/{code}", response_model=CertificateResponse)
async def verify_certificate(code: str):
    """Public endpoint to verify a certificate code (no auth required)."""
    cert = await svc.get_certificate_by_code(code)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return _to_response(cert)


@router.get("/{cert_id}", response_model=CertificateResponse)
async def get_certificate(cert_id: str, user: User = Depends(get_current_user)):
    cert = await svc.get_certificate(cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    # Worker can only see own certs; staff can see any
    if user.role == UserRole.WORKER and cert.user_id != str(user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return _to_response(cert)


@router.get("/{cert_id}/download")
async def download_certificate(
    cert_id: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    cert = await svc.get_certificate(cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if user.role == UserRole.WORKER and cert.user_id != str(user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    base_url = str(request.base_url).rstrip("/")
    path = generate_certificate_pdf(cert, verify_base_url=base_url)
    filename = os.path.basename(path)
    return FileResponse(
        path, media_type="application/pdf", filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{cert_id}/revoke", response_model=CertificateResponse)
async def revoke(
    cert_id: str,
    data: RevokeRequest,
    _: User = Depends(require_staff()),
):
    cert = await svc.revoke_certificate(cert_id, data.reason)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return _to_response(cert)
