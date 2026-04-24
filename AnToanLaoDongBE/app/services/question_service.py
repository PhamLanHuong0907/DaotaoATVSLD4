import logging
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.models.question import Question, AnswerOption
from app.models.enums import (
    QuestionType, DifficultyLevel, TrainingGroup, ApprovalStatus,
)
from app.schemas.question_schemas import QuestionCreate, QuestionAIGenerate, QuestionUpdate
from app.services.document_service import get_approved_documents_text
from app.ai.question_generator import generate_questions
from app.ai.openai_client import get_model

logger = logging.getLogger(__name__)


async def create_question(data: QuestionCreate) -> Question:
    from app.models.catalog import Occupation
    from app.services.auto_generate_service import _normalize_occupation

    payload = data.model_dump()
    occs = await Occupation.find(Occupation.is_active == True).sort("name").to_list()
    valid_names = [o.name for o in occs]
    payload["occupation"] = _normalize_occupation(payload.get("occupation", ""), valid_names)
    question = Question(**payload)
    await question.insert()
    return question


async def ai_generate_questions(data: QuestionAIGenerate) -> list[Question]:
    """Generate questions using AI from approved documents or course content."""
    from app.models.catalog import Occupation
    from app.services.auto_generate_service import _normalize_occupation

    # Chuẩn hoá occupation theo danh mục Nghề
    occs = await Occupation.find(Occupation.is_active == True).sort("name").to_list()
    valid_names = [o.name for o in occs]
    normalized_occupation = _normalize_occupation(data.occupation, valid_names)

    # Gather source text
    source_texts = []

    if data.source_document_ids:
        doc_texts = await get_approved_documents_text(data.source_document_ids)
        for dt in doc_texts:
            source_texts.append(dt["text"])

    if data.source_course_id:
        from app.models.course import Course
        course = await Course.get(PydanticObjectId(data.source_course_id))
        if course and course.status == ApprovalStatus.APPROVED:
            for lesson in course.lessons:
                source_texts.append(f"Bài {lesson.order}: {lesson.title}\n{lesson.theory}")
                if lesson.scenario:
                    source_texts.append(f"Tình huống: {lesson.scenario}")
                if lesson.safety_notes:
                    source_texts.append(f"Lưu ý an toàn: {lesson.safety_notes}")

    if not source_texts:
        raise ValueError("No approved source content found")

    combined_text = "\n\n".join(source_texts)

    # Call AI
    ai_questions = await generate_questions(
        source_text=combined_text,
        occupation=normalized_occupation,
        skill_level=data.skill_level,
        training_group=data.training_group.value,
        question_type=data.question_type.value,
        difficulty=data.difficulty.value,
        count=data.count,
    )

    # Create Question documents
    created = []
    for q_data in ai_questions:
        options = []
        for opt in q_data.get("options", []):
            options.append(AnswerOption(
                label=opt.get("label", ""),
                text=opt.get("text", ""),
                is_correct=opt.get("is_correct", False),
            ))

        question = Question(
            content=q_data.get("content", ""),
            question_type=data.question_type,
            difficulty=data.difficulty,
            options=options,
            correct_answer_bool=q_data.get("correct_answer_bool"),
            scenario_description=q_data.get("scenario_description"),
            expected_key_points=q_data.get("expected_key_points", []),
            explanation=q_data.get("explanation"),
            occupation=normalized_occupation,
            skill_level=data.skill_level,
            training_group=data.training_group,
            topic_tags=q_data.get("topic_tags", []),
            source_document_ids=data.source_document_ids,
            source_course_id=data.source_course_id,
            ai_generated=True,
            ai_model=get_model(),
            status=ApprovalStatus.DRAFT,
            created_by=data.created_by,
        )
        await question.insert()
        created.append(question)

    return created


async def get_questions(
    question_type: Optional[QuestionType] = None,
    difficulty: Optional[DifficultyLevel] = None,
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    training_group: Optional[TrainingGroup] = None,
    topic_tag: Optional[str] = None,
    status: Optional[ApprovalStatus] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Question], int]:
    query = {}
    if question_type:
        query["question_type"] = question_type
    if difficulty:
        query["difficulty"] = difficulty
    if occupation:
        query["occupation"] = occupation
    if skill_level is not None:
        query["skill_level"] = skill_level
    if training_group:
        query["training_group"] = training_group
    if topic_tag:
        query["topic_tags"] = topic_tag
    if status:
        query["status"] = status

    total = await Question.find(query).count()
    questions = await Question.find(query).sort("-created_at").skip(skip).limit(limit).to_list()
    return questions, total


async def get_unique_topic_tags() -> list[str]:
    """Lấy danh sách topic_tags duy nhất từ tất cả câu hỏi."""
    pipeline = [
        {"$match": {"topic_tags": {"$exists": True, "$ne": []}}},
        {"$unwind": "$topic_tags"},
        {"$group": {"_id": "$topic_tags"}},
        {"$sort": {"_id": 1}},
    ]
    collection = Question.get_pymongo_collection()
    cursor = collection.aggregate(pipeline)
    results = await cursor.to_list(length=1000)
    return [r["_id"] for r in results if r["_id"]]


async def get_question(question_id: str) -> Optional[Question]:
    return await Question.get(PydanticObjectId(question_id))


async def update_question(question_id: str, data: QuestionUpdate) -> Optional[Question]:
    question = await Question.get(PydanticObjectId(question_id))
    if not question:
        return None
    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    await question.set(update_data)
    return question


async def update_question_status(
    question_id: str,
    status: ApprovalStatus,
    reviewed_by: Optional[str] = None,
    review_notes: Optional[str] = None,
) -> Optional[Question]:
    question = await Question.get(PydanticObjectId(question_id))
    if not question:
        return None
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc),
    }
    if reviewed_by:
        update_data["reviewed_by"] = reviewed_by
    if review_notes:
        update_data["review_notes"] = review_notes
    if status == ApprovalStatus.APPROVED:
        update_data["approved_at"] = datetime.now(timezone.utc)
    await question.set(update_data)
    return question


async def bulk_approve_questions(question_ids: list[str], reviewed_by: str) -> int:
    """Approve multiple questions at once. Returns count of approved."""
    count = 0
    now = datetime.now(timezone.utc)
    for qid in question_ids:
        q = await Question.get(PydanticObjectId(qid))
        if q and q.status != ApprovalStatus.APPROVED:
            await q.set({
                "status": ApprovalStatus.APPROVED,
                "reviewed_by": reviewed_by,
                "approved_at": now,
                "updated_at": now,
            })
            count += 1
    return count


async def delete_question(question_id: str) -> bool:
    question = await Question.get(PydanticObjectId(question_id))
    if not question:
        return False
    await question.delete()
    return True
