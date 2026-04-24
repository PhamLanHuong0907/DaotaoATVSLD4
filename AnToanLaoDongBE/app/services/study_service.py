import logging
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.models.study_session import StudySession, ChatMessage
from app.models.exam import ExamSubmission, Exam
from app.models.question import Question
from app.models.document import TrainingDocument
from app.models.course import Course
from app.models.enums import ApprovalStatus
from app.ai import tutor as ai_tutor

logger = logging.getLogger(__name__)


async def chat(
    user_id: str,
    message: str,
    session_id: Optional[str] = None,
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
) -> tuple[str, str]:
    """
    Chat with AI tutor. Returns (response_text, session_id).
    Creates or continues a study session.
    """
    session = None
    if session_id:
        session = await StudySession.get(PydanticObjectId(session_id))

    if not session:
        session = StudySession(
            user_id=user_id,
            session_type="free_chat",
            occupation=occupation,
            skill_level=skill_level,
        )
        await session.insert()

    # Build chat history
    chat_history = [
        {"role": m.role, "content": m.content}
        for m in session.messages
    ]

    # Call AI
    response_text = await ai_tutor.chat_with_tutor(
        user_message=message,
        chat_history=chat_history,
    )

    # Save messages
    now = datetime.now(timezone.utc)
    session.messages.append(ChatMessage(role="user", content=message, timestamp=now))
    session.messages.append(ChatMessage(role="assistant", content=response_text, timestamp=now))
    session.updated_at = now
    await session.save()

    return response_text, str(session.id)


async def explain_wrong_answers(submission_id: str) -> str:
    """Explain wrong answers from an exam submission using AI."""
    submission = await ExamSubmission.get(PydanticObjectId(submission_id))
    if not submission:
        raise ValueError("Submission not found")

    exam = await Exam.get(PydanticObjectId(submission.exam_id))
    if not exam:
        raise ValueError("Exam not found")

    # Build wrong answers list
    question_map = {q.question_id: q for q in exam.questions}
    wrong_answers = []

    for ans in submission.answers:
        if not ans.is_correct:
            eq = question_map.get(ans.question_id)
            if eq:
                # Try to get explanation from question bank
                explanation = ""
                try:
                    q = await Question.get(PydanticObjectId(ans.question_id))
                    if q:
                        explanation = q.explanation or ""
                except Exception:
                    pass

                wrong_answers.append({
                    "question": eq.content,
                    "user_answer": ans.selected_answer or ans.text_answer or "Không trả lời",
                    "correct_answer": eq.correct_answer,
                    "explanation": explanation,
                })

    if not wrong_answers:
        return "Chúc mừng! Bạn đã trả lời đúng tất cả các câu hỏi."

    return await ai_tutor.explain_wrong_answers(wrong_answers)


async def suggest_review(submission_id: str) -> dict:
    """Suggest review topics based on exam results."""
    submission = await ExamSubmission.get(PydanticObjectId(submission_id))
    if not submission:
        raise ValueError("Submission not found")

    exam = await Exam.get(PydanticObjectId(submission.exam_id))
    if not exam:
        raise ValueError("Exam not found")

    # Build summary of wrong topics
    question_map = {q.question_id: q for q in exam.questions}
    wrong_topics = []
    for ans in submission.answers:
        if not ans.is_correct:
            eq = question_map.get(ans.question_id)
            if eq:
                wrong_topics.append(eq.content[:100])

    summary = (
        f"Kết quả thi: {submission.total_score}/10, "
        f"Đúng: {submission.total_correct}/{submission.total_questions}, "
        f"Xếp loại: {submission.classification}\n\n"
        f"Ngành nghề: {exam.occupation}, Bậc thợ: {exam.skill_level}\n\n"
        f"Các câu trả lời sai:\n" +
        "\n".join(f"- {t}" for t in wrong_topics)
    )

    return await ai_tutor.suggest_review_topics(summary)


async def get_practice_questions(
    topic: str,
    occupation: str,
    skill_level: int,
    count: int = 5,
) -> list[dict]:
    """Generate practice questions for a topic."""
    return await ai_tutor.generate_practice_questions(
        topic=topic, occupation=occupation,
        skill_level=skill_level, count=count,
    )


async def get_study_materials(
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
) -> dict:
    """Get self-study materials: approved courses and documents."""
    # Get approved courses
    course_query = {"status": ApprovalStatus.APPROVED}
    if occupation:
        course_query["occupation"] = occupation
    if skill_level is not None:
        course_query["skill_level"] = skill_level
    courses = await Course.find(course_query).to_list()

    # Get approved documents
    doc_query = {"status": ApprovalStatus.APPROVED}
    if occupation:
        doc_query["occupations"] = occupation
    if skill_level is not None:
        doc_query["skill_levels"] = skill_level
    documents = await TrainingDocument.find(doc_query).to_list()

    return {
        "courses": [
            {
                "id": str(c.id),
                "title": c.title,
                "description": c.description,
                "occupation": c.occupation,
                "skill_level": c.skill_level,
                "training_group": c.training_group.value,
                "lesson_count": len(c.lessons),
                "is_mandatory": getattr(c, 'is_mandatory', False),
            }
            for c in courses
        ],
        "documents": [
            {
                "id": str(d.id),
                "title": d.title,
                "description": d.description,
                "document_type": d.document_type.value,
                "file_name": d.file_name,
            }
            for d in documents
        ],
    }


async def get_study_sessions(
    user_id: str,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[StudySession], int]:
    query = {"user_id": user_id}
    total = await StudySession.find(query).count()
    sessions = await StudySession.find(query).sort("-created_at").skip(skip).limit(limit).to_list()
    return sessions, total


async def get_study_session(session_id: str) -> Optional[StudySession]:
    return await StudySession.get(PydanticObjectId(session_id))
