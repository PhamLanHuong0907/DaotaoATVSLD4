"""Render a certificate (chứng chỉ) as a printable PDF with QR verification."""
import io
import os
import uuid
from typing import Optional

import qrcode
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.config import get_settings
from app.models.certificate import Certificate
from app.models.enums import ResultClassification

_font_name = "Helvetica"
_font_registered = False


def _ensure_font() -> str:
    global _font_registered, _font_name
    if _font_registered:
        return _font_name
    for fp in (
        "C:/Windows/Fonts/timesbd.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if os.path.exists(fp):
            try:
                name = os.path.splitext(os.path.basename(fp))[0]
                pdfmetrics.registerFont(TTFont(name, fp))
                _font_name = name
                _font_registered = True
                return _font_name
            except Exception:
                continue
    _font_registered = True
    return _font_name


CLASSIFICATION_LABELS = {
    ResultClassification.EXCELLENT: "Xuất sắc",
    ResultClassification.GOOD: "Khá",
    ResultClassification.AVERAGE: "Trung bình",
    ResultClassification.FAIL: "Không đạt",
}


def _build_qr(data: str) -> Image:
    qr = qrcode.QRCode(box_size=4, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Image(buf, width=3.2 * cm, height=3.2 * cm)


def generate_certificate_pdf(cert: Certificate, verify_base_url: Optional[str] = None) -> str:
    """Render the certificate as A4 landscape PDF. Returns absolute file path."""
    font = _ensure_font()
    settings = get_settings()
    os.makedirs(settings.EXPORT_DIR, exist_ok=True)
    filename = f"certificate_{cert.code}_{uuid.uuid4().hex[:6]}.pdf"
    path = os.path.join(settings.EXPORT_DIR, filename)

    doc = SimpleDocTemplate(
        path,
        pagesize=landscape(A4),
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        title=f"Certificate {cert.code}",
    )

    styles = {
        "h1": ParagraphStyle("h1", fontName=font, fontSize=26, alignment=TA_CENTER, spaceAfter=10),
        "h2": ParagraphStyle("h2", fontName=font, fontSize=16, alignment=TA_CENTER, textColor=colors.HexColor("#1565c0"), spaceAfter=20),
        "name": ParagraphStyle("name", fontName=font, fontSize=24, alignment=TA_CENTER, textColor=colors.HexColor("#0d47a1"), spaceAfter=8),
        "body": ParagraphStyle("body", fontName=font, fontSize=12, alignment=TA_CENTER, leading=18),
        "small": ParagraphStyle("small", fontName=font, fontSize=10, alignment=TA_CENTER, textColor=colors.grey),
        "code": ParagraphStyle("code", fontName=font, fontSize=12, alignment=TA_CENTER, textColor=colors.HexColor("#c62828")),
    }

    elems: list = []
    elems.append(Paragraph("CHỨNG CHỈ", styles["h1"]))
    elems.append(Paragraph("AN TOÀN VỆ SINH LAO ĐỘNG", styles["h2"]))

    elems.append(Paragraph("Chứng nhận", styles["body"]))
    elems.append(Paragraph(f"<b>{cert.full_name}</b>", styles["name"]))
    if cert.employee_id:
        elems.append(Paragraph(f"Mã nhân viên: {cert.employee_id}", styles["body"]))
    if cert.occupation:
        elems.append(Paragraph(
            f"Chức danh: {cert.occupation}" + (f" — Bậc {cert.skill_level}" if cert.skill_level else ""),
            styles["body"],
        ))

    elems.append(Spacer(1, 0.3 * cm))
    elems.append(Paragraph("Đã hoàn thành kỳ thi:", styles["body"]))
    elems.append(Paragraph(f"<b>{cert.exam_name}</b>", styles["body"]))
    elems.append(Spacer(1, 0.3 * cm))

    classification_label = CLASSIFICATION_LABELS.get(cert.classification, cert.classification.value)
    elems.append(Paragraph(
        f"Điểm số: <b>{cert.score}/10</b> &nbsp;&nbsp;&nbsp; Xếp loại: <b>{classification_label}</b>",
        styles["body"],
    ))
    elems.append(Spacer(1, 0.3 * cm))

    # Define VN timezone (GMT+7)
    vn_tz = timezone(timedelta(hours=7))
    issued_str = cert.issued_at.astimezone(vn_tz).strftime("%d/%m/%Y")
    valid_str = cert.valid_until.astimezone(vn_tz).strftime("%d/%m/%Y") if cert.valid_until else "Vô thời hạn"
    elems.append(Paragraph(
        f"Ngày cấp: {issued_str} &nbsp;&nbsp;&nbsp; Có hiệu lực đến: {valid_str}",
        styles["body"],
    ))

    elems.append(Spacer(1, 0.6 * cm))
    elems.append(Paragraph(f"Mã chứng chỉ: <b>{cert.code}</b>", styles["code"]))

    # Footer with QR + signature placeholders
    verify_url = (verify_base_url or "").rstrip("/") + f"/api/v1/certificates/verify/{cert.code}"
    qr_img = _build_qr(verify_url)

    footer = Table(
        [[
            Paragraph("Người ký xác nhận<br/><br/>____________________", styles["small"]),
            qr_img,
            Paragraph(f"Quét mã để xác thực<br/>{verify_url}", styles["small"]),
        ]],
        colWidths=[8 * cm, 4 * cm, 8 * cm],
    )
    footer.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    elems.append(Spacer(1, 1 * cm))
    elems.append(footer)

    doc.build(elems)
    return path
