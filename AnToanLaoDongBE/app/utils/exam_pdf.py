"""Generate a printable exam paper (offline/onsite) as PDF.

Produces two PDFs:
  - candidate_paper: question paper without answers, with answer sheet.
  - answer_key:      the correct answers (proctor use).
"""
import copy
import os
import random
import uuid
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.config import get_settings
from app.models.exam import Exam

_font_name = "Helvetica"
_font_registered = False


def _ensure_font() -> str:
    global _font_registered, _font_name
    if _font_registered:
        return _font_name
    for fp in (
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/times.ttf",
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


def _styles():
    font = _ensure_font()
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title", parent=base["Title"], fontName=font, fontSize=14, alignment=TA_CENTER,
        ),
        "h2": ParagraphStyle("H2", parent=base["Heading2"], fontName=font, fontSize=12),
        "normal": ParagraphStyle("Body", parent=base["Normal"], fontName=font, fontSize=11, leading=15),
        "small": ParagraphStyle("Small", parent=base["Normal"], fontName=font, fontSize=9, leading=12),
        "qnum": ParagraphStyle(
            "QNum", parent=base["Normal"], fontName=font, fontSize=11, leading=15, spaceBefore=8,
        ),
    }


def _header(elements, exam: Exam, s, variant_label: Optional[str] = None):
    elements.append(Paragraph("ĐỀ THI AN TOÀN VỆ SINH LAO ĐỘNG", s["title"]))
    elements.append(Paragraph(exam.name, s["title"]))
    elements.append(Spacer(1, 0.3 * cm))
    meta = (
        f"Nghề: <b>{exam.occupation}</b> &nbsp; | &nbsp; "
        f"Bậc: <b>{exam.skill_level}</b> &nbsp; | &nbsp; "
        f"Thời gian: <b>{exam.duration_minutes} phút</b> &nbsp; | &nbsp; "
        f"Tổng điểm: <b>{exam.total_points:g}</b>"
    )
    if variant_label:
        meta = f"Mã đề: <b>{variant_label}</b> &nbsp; | &nbsp; " + meta
    elements.append(Paragraph(meta, s["small"]))
    elements.append(Spacer(1, 0.2 * cm))
    elements.append(Paragraph(
        "Họ và tên: ............................................ &nbsp;&nbsp; "
        "Mã NV: .................. &nbsp;&nbsp; Phòng ban: ......................",
        s["small"],
    ))
    elements.append(Spacer(1, 0.4 * cm))


def _answer_sheet(total_q: int, s) -> list:
    """Grid: 5 columns of question boxes A/B/C/D for candidates to mark."""
    rows = []
    header = ["STT", "A", "B", "C", "D"]
    rows.append(header)
    for i in range(1, total_q + 1):
        rows.append([str(i), "☐", "☐", "☐", "☐"])
    table = Table(rows, colWidths=[1.3 * cm, 1.2 * cm, 1.2 * cm, 1.2 * cm, 1.2 * cm])
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), _font_name),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EEF7")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    return [
        Paragraph("<b>PHIẾU TRẢ LỜI TRẮC NGHIỆM</b>", s["h2"]),
        Spacer(1, 0.2 * cm),
        table,
    ]


def _render_question(q, s, show_answer: bool) -> list:
    elems = []
    elems.append(Paragraph(
        f"<b>Câu {q.order}.</b> ({q.points:g} điểm) {q.content}",
        s["qnum"],
    ))
    # options
    letters = ["A", "B", "C", "D", "E"]
    if q.question_type in ("multiple_choice",):
        for i, opt in enumerate(q.options or []):
            letter = letters[i] if i < len(letters) else str(i + 1)
            opt_text = opt.get("text") if isinstance(opt, dict) else str(opt)
            elems.append(Paragraph(f"&nbsp;&nbsp;&nbsp;{letter}. {opt_text}", s["normal"]))
    elif q.question_type == "true_false":
        elems.append(Paragraph("&nbsp;&nbsp;&nbsp;A. Đúng &nbsp;&nbsp;&nbsp; B. Sai", s["normal"]))
    else:
        # scenario/essay — write lines
        for _ in range(4):
            elems.append(Paragraph("_________________________________________________________________", s["normal"]))
    if show_answer:
        elems.append(Paragraph(
            f"<font color='#c62828'><b>Đáp án:</b> {q.correct_answer}</font>",
            s["small"],
        ))
    return elems


def _shuffle_exam(exam: Exam, seed: int) -> Exam:
    """Return a deep copy of the exam with questions and MCQ options shuffled.

    The shuffled exam keeps the original `correct_answer` consistent: for MCQ
    we relabel options A/B/C/D after shuffling so the answer key still works.
    """
    rng = random.Random(seed)
    shuffled = copy.deepcopy(exam)

    # Shuffle question order, then renumber `order` so PDF prints 1..N
    questions = list(shuffled.questions)
    rng.shuffle(questions)

    letters = ["A", "B", "C", "D", "E", "F"]
    for new_idx, q in enumerate(questions, start=1):
        q.order = new_idx
        if q.question_type == "multiple_choice" and q.options:
            # Find which option text matches `correct_answer` (label OR text)
            correct_text = None
            for o in q.options:
                if isinstance(o, dict):
                    label = o.get("label")
                    text = o.get("text", "")
                    if label and label == q.correct_answer:
                        correct_text = text
                        break
                    if text == q.correct_answer:
                        correct_text = text
                        break
            opts = list(q.options)
            rng.shuffle(opts)
            new_options = []
            new_correct_label = q.correct_answer
            for i, opt in enumerate(opts):
                new_label = letters[i] if i < len(letters) else str(i + 1)
                if isinstance(opt, dict):
                    text = opt.get("text", "")
                    new_options.append({"label": new_label, "text": text})
                    if correct_text is not None and text == correct_text:
                        new_correct_label = new_label
            q.options = new_options
            q.correct_answer = new_correct_label

    shuffled.questions = questions
    return shuffled


def generate_exam_paper_pdf(exam: Exam, variant_label: Optional[str] = None) -> str:
    """Produce a PDF containing: question paper + answer sheet + answer key.

    Returns absolute file path.
    """
    _ensure_font()
    settings = get_settings()
    os.makedirs(settings.EXPORT_DIR, exist_ok=True)
    filename = f"exam_{str(exam.id)}_{uuid.uuid4().hex[:6]}.pdf"
    path = os.path.join(settings.EXPORT_DIR, filename)

    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=1.8 * cm, rightMargin=1.8 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        title=exam.name,
    )
    s = _styles()
    elements: list = []

    # ---- Question paper ----
    _header(elements, exam, s, variant_label=variant_label)
    for q in sorted(exam.questions, key=lambda x: x.order):
        elements.extend(_render_question(q, s, show_answer=False))

    # ---- Answer sheet ----
    elements.append(PageBreak())
    _header(elements, exam, s, variant_label=variant_label)
    elements.extend(_answer_sheet(len(exam.questions), s))

    # ---- Answer key (proctor) ----
    elements.append(PageBreak())
    elements.append(Paragraph("ĐÁP ÁN (DÀNH CHO GIÁM THỊ)", s["title"]))
    elements.append(Spacer(1, 0.3 * cm))
    for q in sorted(exam.questions, key=lambda x: x.order):
        elements.append(Paragraph(
            f"<b>Câu {q.order}:</b> {q.correct_answer}",
            s["normal"],
        ))

    doc.build(elements)
    return path


def generate_exam_variants_zip(exam: Exam, count: int = 4) -> str:
    """Build N shuffled variants and return path to a ZIP archive.

    Each entry in the zip is `de-thi-MaA1.pdf`, `de-thi-MaA2.pdf`, ...
    """
    import zipfile

    settings = get_settings()
    os.makedirs(settings.EXPORT_DIR, exist_ok=True)
    zip_name = f"exam_{str(exam.id)}_variants_{uuid.uuid4().hex[:6]}.zip"
    zip_path = os.path.join(settings.EXPORT_DIR, zip_name)

    pdf_paths: list[tuple[str, str]] = []  # (label, file_path)
    for i in range(count):
        label = f"A{i + 1}"
        # Use exam id + index as deterministic seed → reproducible variants
        seed = abs(hash((str(exam.id), i)))
        shuffled = _shuffle_exam(exam, seed=seed)
        pdf_path = generate_exam_paper_pdf(shuffled, variant_label=label)
        pdf_paths.append((label, pdf_path))

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for label, p in pdf_paths:
            zf.write(p, arcname=f"de-thi-Ma{label}.pdf")

    return zip_path
