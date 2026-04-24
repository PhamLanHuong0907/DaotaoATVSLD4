import os
import uuid

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.config import get_settings

# Try to register a Vietnamese-capable font
_font_registered = False


def _ensure_font():
    global _font_registered
    if _font_registered:
        return
    # Try common system fonts that support Vietnamese
    font_paths = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/times.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                font_name = os.path.splitext(os.path.basename(fp))[0]
                pdfmetrics.registerFont(TTFont(font_name, fp))
                _font_registered = True
                return
            except Exception:
                continue


async def export_report_pdf(data: dict, report_type: str) -> str:
    """Export report to PDF. Returns file path."""
    _ensure_font()
    settings = get_settings()

    filename = f"{report_type}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(settings.EXPORT_DIR, filename)
    os.makedirs(settings.EXPORT_DIR, exist_ok=True)

    doc = SimpleDocTemplate(filepath, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    title_text = data.get("title", "BAO CAO")
    elements.append(Paragraph(title_text, styles["Title"]))
    elements.append(Spacer(1, 0.5 * cm))

    # Subtitle
    if data.get("subtitle"):
        elements.append(Paragraph(data["subtitle"], styles["Normal"]))
        elements.append(Spacer(1, 0.5 * cm))

    # Table data
    table_data = data.get("table_data", [])
    if table_data:
        headers = data.get("headers", [])
        all_rows = [headers] + table_data if headers else table_data

        table = Table(all_rows, repeatRows=1)
        table_style = TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#D9E2F3")]),
        ])
        table.setStyle(table_style)
        elements.append(table)

    # Summary
    if data.get("summary"):
        elements.append(Spacer(1, 0.5 * cm))
        elements.append(Paragraph(data["summary"], styles["Normal"]))

    doc.build(elements)
    return filepath
