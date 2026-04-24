import logging
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.models.exam_template import ExamTemplate
from app.models.exam import Exam, ExamSubmission, AnswerRecord
from app.models.exam_period import ExamPeriod
from app.models.enums import (
    ExamType, ExamMode, ApprovalStatus, ResultClassification, ExamKind,
)
from app.schemas.exam_schemas import (
    ExamTemplateCreate, ExamTemplateUpdate,
    ExamGenerateRequest, ExamSubmitRequest,
)
from app.ai.exam_generator import generate_exam_from_template

logger = logging.getLogger(__name__)


# --- Exam Template Service ---

async def create_template(data: ExamTemplateCreate) -> ExamTemplate:
    template = ExamTemplate(**data.model_dump())
    await template.insert()
    return template


async def get_templates(
    exam_type: Optional[ExamType] = None,
    status: Optional[ApprovalStatus] = None,
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[ExamTemplate], int]:
    q = ExamTemplate.find_all()
    if exam_type:
        q = q.find(ExamTemplate.exam_type == exam_type)
    if status:
        q = q.find(ExamTemplate.status == status)
    if occupation:
        q = q.find(ExamTemplate.occupation == occupation)
    if skill_level is not None:
        q = q.find(ExamTemplate.skill_level == skill_level)
    if search:
        q = q.find({"name": {"$regex": search, "$options": "i"}})

    total = await q.count()
    templates = await q.sort("-created_at").skip(skip).limit(limit).to_list()
    return templates, total


async def get_template(template_id: str) -> Optional[ExamTemplate]:
    return await ExamTemplate.get(PydanticObjectId(template_id))


async def update_template(template_id: str, data: ExamTemplateUpdate) -> Optional[ExamTemplate]:
    template = await ExamTemplate.get(PydanticObjectId(template_id))
    if not template:
        return None
    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    await template.set(update_data)
    return template


async def update_template_status(
    template_id: str,
    status: ApprovalStatus,
    reviewed_by: Optional[str] = None,
) -> Optional[ExamTemplate]:
    template = await ExamTemplate.get(PydanticObjectId(template_id))
    if not template:
        return None
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc),
    }
    if reviewed_by:
        update_data["reviewed_by"] = reviewed_by
    if status == ApprovalStatus.APPROVED:
        update_data["approved_at"] = datetime.now(timezone.utc)
    await template.set(update_data)
    return template


async def delete_template(template_id: str) -> bool:
    template = await ExamTemplate.get(PydanticObjectId(template_id))
    if not template:
        return False
    await template.delete()
    return True


# --- Exam Service ---

async def generate_exam(data: ExamGenerateRequest) -> Exam:
    """Generate an exam by selecting questions from bank based on template."""
    template = await ExamTemplate.get(PydanticObjectId(data.template_id))
    if not template:
        raise ValueError("Template not found")
    if template.status != ApprovalStatus.APPROVED:
        raise ValueError("Template must be approved before generating exams")

    # Generate questions
    exam_questions = await generate_exam_from_template(template, data.exam_period_id)

    if not exam_questions:
        raise ValueError("No questions available to generate exam")

    total_points = sum(q.points for q in exam_questions)

    exam = Exam(
        name=data.name,
        exam_type=template.exam_type,
        exam_mode=data.exam_mode,
        template_id=data.template_id,
        occupation=template.occupation,
        skill_level=template.skill_level,
        questions=exam_questions,
        total_points=total_points,
        duration_minutes=template.duration_minutes,
        passing_score=template.passing_score,
        excellent_threshold=template.excellent_threshold,
        good_threshold=template.good_threshold,
        average_threshold=template.average_threshold,
        scheduled_date=data.scheduled_date,
        exam_period_id=data.exam_period_id,
        exam_kind=data.exam_kind,
        created_by=data.created_by,
    )
    await exam.insert()
    return exam


async def get_exams(
    exam_type: Optional[ExamType] = None,
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    exam_period_id: Optional[str] = None,
    exam_kind: Optional[ExamKind] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Exam], int]:
    query = {}
    if exam_type:
        query["exam_type"] = exam_type
    if occupation:
        query["occupation"] = occupation
    if skill_level is not None:
        query["skill_level"] = skill_level
    if exam_period_id:
        query["exam_period_id"] = str(exam_period_id)
    if exam_kind:
        query["exam_kind"] = exam_kind
    if is_active is not None:
        query["is_active"] = is_active
    total = await Exam.find(query).count()
    exams = await Exam.find(query).sort("-created_at").skip(skip).limit(limit).to_list()
    return exams, total


async def get_exam(exam_id: str) -> Optional[Exam]:
    return await Exam.get(PydanticObjectId(exam_id))


async def get_exam_for_taking(exam_id: str) -> Optional[dict]:
    """Get exam questions without correct answers (for test-taker)."""
    exam = await Exam.get(PydanticObjectId(exam_id))
    if not exam or not exam.is_active:
        return None

    questions = []
    for q in exam.questions:
        q_dict = {
            "question_id": q.question_id,
            "order": q.order,
            "content": q.content,
            "question_type": q.question_type,
            "options": q.options,
        }
        questions.append(q_dict)

    return {
        "id": str(exam.id),
        "name": exam.name,
        "duration_minutes": exam.duration_minutes,
        "total_questions": len(exam.questions),
        "questions": questions,
    }


async def submit_exam(exam_id: str, data: ExamSubmitRequest) -> ExamSubmission:
    """Submit answers and auto-grade."""
    exam = await Exam.get(PydanticObjectId(exam_id))
    if not exam:
        raise ValueError("Exam not found")
    if not exam.is_active:
        raise ValueError("Exam is not active")

    # Build answer lookup from exam
    correct_answers = {q.question_id: q for q in exam.questions}

    # Grade answers
    answers = []
    total_correct = 0
    total_points_earned = 0.0

    for ans in data.answers:
        exam_q = correct_answers.get(ans.question_id)
        is_correct = False
        points_earned = 0.0

        if exam_q:
            if exam_q.question_type in ("multiple_choice", "true_false"):
                is_correct = (ans.selected_answer or "").strip().lower() == exam_q.correct_answer.strip().lower()
            # scenario_based needs manual review or key-point matching
            elif exam_q.question_type == "scenario_based":
                # Simple key-point matching for auto-grade
                if ans.text_answer and exam_q.correct_answer:
                    key_points = exam_q.correct_answer.split("|")
                    matched = sum(
                        1 for kp in key_points
                        if kp.strip().lower() in ans.text_answer.lower()
                    )
                    if key_points:
                        ratio = matched / len(key_points)
                        is_correct = ratio >= 0.5
                        points_earned = exam_q.points * ratio

            if is_correct and exam_q.question_type != "scenario_based":
                points_earned = exam_q.points

            total_correct += 1 if is_correct else 0
            total_points_earned += points_earned

        answers.append(AnswerRecord(
            question_id=ans.question_id,
            question_order=ans.question_order,
            selected_answer=ans.selected_answer,
            text_answer=ans.text_answer,
            is_correct=is_correct,
            points_earned=points_earned,
        ))

    # Calculate score on scale of 10
    total_questions = len(exam.questions)
    score_10 = (total_points_earned / exam.total_points * 10) if exam.total_points > 0 else 0

    # Classify result
    classification = classify_result(score_10, exam)

    now = datetime.now(timezone.utc)
    submission = ExamSubmission(
        exam_id=exam_id,
        user_id=data.user_id,
        answers=answers,
        total_score=round(score_10, 2),
        total_correct=total_correct,
        total_questions=total_questions,
        classification=classification,
        submitted_at=now,
        graded_at=now,
        graded_by="system",
        exam_kind=exam.exam_kind,
    )
    await submission.insert()

    # Webhook fire-and-forget for any submission
    try:
        from app.services.webhook_service import fire_event
        from app.models.webhook import WebhookEvent
        await fire_event(WebhookEvent.EXAM_SUBMITTED, {
            "submission_id": str(submission.id),
            "exam_id": submission.exam_id,
            "user_id": submission.user_id,
            "total_score": submission.total_score,
            "classification": submission.classification.value if submission.classification else None,
        })
        if submission.classification and submission.classification.value != "fail":
            await fire_event(WebhookEvent.EXAM_PASSED, {
                "submission_id": str(submission.id),
                "exam_id": submission.exam_id,
                "user_id": submission.user_id,
                "total_score": submission.total_score,
            })
    except Exception:
        pass

    # Auto-issue certificate on pass + notify the user + award gamification points
    try:
        from app.services.certificate_service import issue_certificate_for_submission
        from app.services.notification_service import create_notification
        from app.services.gamification_service import on_exam_passed
        from app.models.notification import NotificationType

        if submission.classification and submission.classification.value != "fail":
            await on_exam_passed(
                submission.user_id,
                submission.total_score,
                submission.classification.value,
            )

        cert = await issue_certificate_for_submission(submission)
        await create_notification(
            user_id=submission.user_id,
            type=NotificationType.EXAM_RESULT,
            title=f"Có kết quả thi: {exam.name}",
            body=f"Điểm: {submission.total_score}/10 — Xếp loại: {submission.classification.value}",
            link=f"/exams/results/{submission.id}",
        )
        if cert:
            await create_notification(
                user_id=submission.user_id,
                type=NotificationType.CERTIFICATE_ISSUED,
                title="Bạn vừa được cấp chứng chỉ",
                body=f"Mã chứng chỉ: {cert.code}",
                link="/certificates",
            )
    except Exception as e:
        logger.warning("Failed to auto-issue/notify after submission: %s", e)

    return submission


def classify_result(score: float, exam: Exam) -> ResultClassification:
    """Classify exam result based on thresholds."""
    if score >= exam.excellent_threshold:
        return ResultClassification.EXCELLENT
    elif score >= exam.good_threshold:
        return ResultClassification.GOOD
    elif score >= exam.average_threshold:
        return ResultClassification.AVERAGE
    else:
        return ResultClassification.FAIL


async def get_exam_submissions(
    exam_id: str,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[ExamSubmission], int]:
    query = {"exam_id": exam_id}
    total = await ExamSubmission.find(query).count()
    subs = await ExamSubmission.find(query).sort("-submitted_at").skip(skip).limit(limit).to_list()
    return subs, total


async def get_submission(submission_id: str) -> Optional[ExamSubmission]:
    return await ExamSubmission.get(PydanticObjectId(submission_id))


async def get_user_submissions(
    user_id: str,
    exam_kind: Optional[ExamKind] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[ExamSubmission], int]:
    query: dict = {"user_id": user_id}
    if exam_kind:
        query["exam_kind"] = exam_kind
    total = await ExamSubmission.find(query).count()
    subs = await ExamSubmission.find(query).sort("-submitted_at").skip(skip).limit(limit).to_list()
    return subs, total
