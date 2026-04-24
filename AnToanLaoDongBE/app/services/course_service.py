import logging
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.models.course import Course, LessonContent
from app.models.enums import TrainingGroup, ApprovalStatus
from app.schemas.course_schemas import CourseCreate, CourseAIGenerate, CourseUpdate
from app.services.document_service import get_approved_documents_text
from app.ai.course_generator import generate_course_content
from app.ai.openai_client import get_model

logger = logging.getLogger(__name__)


async def create_course(data: CourseCreate) -> Course:
    from app.models.catalog import Occupation
    from app.services.auto_generate_service import _normalize_occupation

    occupations = await Occupation.find(Occupation.is_active == True).sort("name").to_list()
    valid_names = [o.name for o in occupations]
    normalized = _normalize_occupation(data.occupation, valid_names)

    course = Course(
        title=data.title,
        description=data.description,
        objectives=data.objectives,
        occupation=normalized,
        skill_level=data.skill_level,
        training_group=data.training_group,
        lessons=data.lessons,
        created_by=data.created_by,
    )
    await course.insert()
    return course


async def ai_generate_course(data: CourseAIGenerate) -> Course:
    """Generate a course using AI from approved documents."""
    from app.models.catalog import Occupation
    from app.services.auto_generate_service import _normalize_occupation

    # Fetch approved document texts
    doc_texts = await get_approved_documents_text(data.document_ids)
    if not doc_texts:
        raise ValueError("No approved documents with extracted text found for the given IDs")

    # Chuẩn hoá occupation theo danh mục Nghề
    occupations = await Occupation.find(Occupation.is_active == True).sort("name").to_list()
    valid_names = [o.name for o in occupations]
    normalized_occupation = _normalize_occupation(data.occupation, valid_names)

    # Call AI
    ai_result = await generate_course_content(
        document_texts=doc_texts,
        occupation=normalized_occupation,
        skill_level=data.skill_level,
        training_group=data.training_group.value,
    )

    # Parse lessons
    lessons = []
    for lesson_data in ai_result.get("lessons", []):
        lessons.append(LessonContent(
            order=lesson_data.get("order", len(lessons) + 1),
            title=lesson_data.get("title", ""),
            theory=lesson_data.get("theory", ""),
            scenario=lesson_data.get("scenario"),
            safety_notes=lesson_data.get("safety_notes"),
            duration_minutes=lesson_data.get("duration_minutes"),
        ))

    course = Course(
        title=ai_result.get("title", f"Khóa học {normalized_occupation} - Bậc {data.skill_level}"),
        description=ai_result.get("description"),
        objectives=ai_result.get("objectives", []),
        occupation=normalized_occupation,
        skill_level=data.skill_level,
        training_group=data.training_group,
        lessons=lessons,
        source_document_ids=data.document_ids,
        ai_generated=True,
        ai_model=get_model(),
        ai_generated_at=datetime.now(timezone.utc),
        status=ApprovalStatus.DRAFT,
        created_by=data.created_by,
    )
    await course.insert()
    return course


async def get_courses(
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    training_group: Optional[TrainingGroup] = None,
    status: Optional[ApprovalStatus] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Course], int]:
    query = {}
    if occupation:
        query["occupation"] = occupation
    if skill_level is not None:
        query["skill_level"] = skill_level
    if training_group:
        query["training_group"] = training_group
    if status:
        query["status"] = status

    total = await Course.find(query).count()
    courses = await Course.find(query).sort("-created_at").skip(skip).limit(limit).to_list()
    return courses, total


async def get_course(course_id: str) -> Optional[Course]:
    return await Course.get(PydanticObjectId(course_id))


async def get_courses_for_user(
    department_id: Optional[str],
    occupation: Optional[str],
    skill_level: Optional[int],
    only_mandatory: bool = False,
) -> list[Course]:
    """Return APPROVED courses available to a user.

    A course is available if:
      - it is approved, AND
      - assigned_department_ids is empty OR contains the user's department, AND
      - occupation matches if provided, AND
      - skill_level matches if provided.
    """
    query: dict = {"status": ApprovalStatus.APPROVED}
    if department_id:
        query["$or"] = [
            {"assigned_department_ids": {"$size": 0}},
            {"assigned_department_ids": department_id},
        ]
    if occupation:
        query["occupation"] = occupation
    if skill_level is not None:
        query["skill_level"] = skill_level
    if only_mandatory:
        query["is_mandatory"] = True
    return await Course.find(query).sort("-created_at").to_list()


async def update_course(course_id: str, data: CourseUpdate) -> Optional[Course]:
    course = await Course.get(PydanticObjectId(course_id))
    if not course:
        return None
    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    await course.set(update_data)
    return course


async def update_course_status(
    course_id: str,
    status: ApprovalStatus,
    reviewed_by: Optional[str] = None,
    review_notes: Optional[str] = None,
) -> Optional[Course]:
    course = await Course.get(PydanticObjectId(course_id))
    if not course:
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
    await course.set(update_data)
    return course


async def delete_course(course_id: str) -> bool:
    course = await Course.get(PydanticObjectId(course_id))
    if not course:
        return False
    await course.delete()
    return True
