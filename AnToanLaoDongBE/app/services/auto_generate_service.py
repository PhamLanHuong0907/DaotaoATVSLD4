import json
import re
import logging
import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator

from app.models.catalog import Occupation
from app.models.document import TrainingDocument
from app.models.course import Course, LessonContent
from app.models.question import Question, AnswerOption
from app.models.enums import (
    ApprovalStatus, QuestionType, DifficultyLevel,
)
from app.ai.openai_client import get_openai_client, get_model
from app.ai.prompts import (
    AUTO_GENERATE_ALL_SYSTEM,
    CHUNK_GENERATE_SYSTEM,
    COURSE_METADATA_SYSTEM,
)
from app.utils.file_parser import ParseResult

logger = logging.getLogger(__name__)

# Tài liệu nhỏ hơn ngưỡng này → 1 lần gọi AI duy nhất
SINGLE_CALL_CHAR_LIMIT = 50000

# Số ký tự tối đa mỗi chunk khi chia trang
MAX_CHARS_PER_CHUNK = 15000

# Số lần retry khi gọi AI hoặc parse lỗi
MAX_RETRIES = 3


# =============================================================================
# HELPERS
# =============================================================================

def _sse_event(event: str, progress: int, message: str, data: dict | None = None) -> str:
    """Format một SSE event."""
    payload = {
        "event": event,
        "progress": progress,
        "message": message,
    }
    if data is not None:
        payload["data"] = data
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _parse_json_response(text: str) -> dict:
    """Parse JSON từ phản hồi AI, xử lý nhiều trường hợp lỗi."""
    if not text or not text.strip():
        raise ValueError("AI trả về phản hồi rỗng")

    # Thử parse trực tiếp
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Thử tìm JSON block trong markdown ```json ... ```
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Thử tìm JSON object đầu tiên trong text
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    logger.error(f"Không thể parse JSON: {text[:500]}")
    raise ValueError("AI trả về kết quả không hợp lệ (không phải JSON)")


async def _call_ai_with_retry(
    messages: list[dict],
    max_completion_tokens: int = 16000,
) -> dict:
    """Gọi AI với retry MAX_RETRIES lần, trả về parsed JSON dict."""
    client = get_openai_client()

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = await client.chat.completions.create(
                model=get_model(),
                messages=messages,
                max_completion_tokens=max_completion_tokens,
                response_format={"type": "json_object"},
            )

            raw_content = response.choices[0].message.content
            return _parse_json_response(raw_content)

        except Exception as e:
            last_error = e
            logger.warning(f"  Lần thử {attempt}/{MAX_RETRIES} thất bại: {e}")
            if attempt < MAX_RETRIES:
                await asyncio.sleep(2 * attempt)  # backoff: 2s, 4s

    raise last_error


def _to_str(value) -> str | None:
    """Chuyển value về string. Nếu là list thì join lại."""
    if value is None:
        return None
    if isinstance(value, list):
        return "\n".join(str(v) for v in value)
    return str(value)


def _build_lesson(lesson_data: dict, order: int) -> LessonContent:
    """Tạo LessonContent từ dict, xử lý lỗi dữ liệu."""
    return LessonContent(
        order=order,
        title=lesson_data.get("title", f"Bài học {order}"),
        theory=_to_str(lesson_data.get("theory")) or "",
        scenario=_to_str(lesson_data.get("scenario")),
        safety_notes=_to_str(lesson_data.get("safety_notes")),
        duration_minutes=lesson_data.get("duration_minutes"),
    )


async def _get_catalog_occupation_names() -> list[str]:
    occupations = await Occupation.find(Occupation.is_active == True).sort("name").to_list()
    return [o.name for o in occupations]


def _normalize_occupation(occupation: str, valid_names: list[str]) -> str:
    if not valid_names:
        return occupation.strip() if occupation else ""

    if not occupation:
        return valid_names[0]

    normalized = occupation.strip()
    if not normalized:
        return valid_names[0]

    normalized_lower = normalized.lower()
    for name in valid_names:
        if normalized_lower == name.lower():
            return name

    for name in valid_names:
        name_lower = name.lower()
        if normalized_lower in name_lower or name_lower in normalized_lower:
            return name

    # Try best fuzzy token overlap if exact/substring match fails
    tokens = set(re.findall(r"\w+", normalized_lower))
    best_match = None
    best_score = 0
    for name in valid_names:
        name_tokens = set(re.findall(r"\w+", name.lower()))
        score = len(tokens & name_tokens)
        if score > best_score:
            best_score = score
            best_match = name
    if best_match:
        return best_match

    return valid_names[0]


def _build_user_prompt_header(
    document_title: str,
    occupation: str,
    skill_level: int,
    training_group: str,
    valid_occupations: list[str],
) -> str:
    """Tạo phần header cho user prompt, có danh sách nghề hợp lệ."""
    lines = [f"Tên tài liệu: {document_title}"]
    lines.append("Danh sách nghề hợp lệ: " + ", ".join(valid_occupations))
    if occupation:
        lines.append(f"Ngành nghề: {occupation}")
        lines.append(
            "Nếu ngành nghề đã có không khớp chính xác với danh sách nghề hợp lệ, hãy chọn tên tương đương gần nhất từ danh sách." \
            "Trả về occupation bằng đúng tên nghề trong danh sách nếu có thể."
        )
    else:
        lines.append("Ngành nghề: (Hãy tự xác định từ nội dung tài liệu)")
        lines.append(
            "Chỉ được chọn một ngành nghề duy nhất từ danh sách trên và trả về tên đó chính xác trong trường 'occupation'."
        )
    lines.append(f"Bậc thợ: {skill_level}")
    lines.append(f"Nhóm huấn luyện: {training_group}")
    return "\n".join(lines)


async def _save_question(
    q_data: dict,
    occupation: str,
    skill_level: int,
    training_group_enum,
    doc_id: str,
    course_id: str,
    model_name: str,
    created_by: str,
) -> Question | None:
    """Lưu 1 câu hỏi vào DB. Trả về None nếu lỗi."""
    try:
        q_type_str = q_data.get("question_type", "multiple_choice")
        try:
            q_type = QuestionType(q_type_str)
        except ValueError:
            q_type = QuestionType.MULTIPLE_CHOICE

        diff_str = q_data.get("difficulty", "medium")
        try:
            difficulty = DifficultyLevel(diff_str)
        except ValueError:
            difficulty = DifficultyLevel.MEDIUM

        options = []
        for opt in q_data.get("options", []):
            options.append(AnswerOption(
                label=opt.get("label", ""),
                text=opt.get("text", ""),
                is_correct=opt.get("is_correct", False),
            ))

        content = q_data.get("content", "")
        if not content.strip():
            return None

        question = Question(
            content=content,
            question_type=q_type,
            difficulty=difficulty,
            options=options,
            correct_answer_bool=q_data.get("correct_answer_bool"),
            scenario_description=q_data.get("scenario_description"),
            expected_key_points=q_data.get("expected_key_points", []),
            explanation=q_data.get("explanation", ""),
            occupation=occupation,
            skill_level=skill_level,
            training_group=training_group_enum,
            topic_tags=q_data.get("topic_tags", []),
            source_document_ids=[doc_id],
            source_course_id=course_id,
            ai_generated=True,
            ai_model=model_name,
            status=ApprovalStatus.DRAFT,
            created_by=created_by,
        )
        await question.insert()
        return question
    except Exception as e:
        logger.error(f"Lỗi lưu câu hỏi: {e}")
        return None


def _count_by(questions: list[Question], field: str) -> dict:
    counts = {}
    for q in questions:
        val = getattr(q, field).value
        counts[val] = counts.get(val, 0) + 1
    return counts


def _get_doc_context(document: TrainingDocument) -> tuple[str, int, str]:
    """Lấy thông tin phân loại từ document. Nếu không có thì để AI tự xác định."""
    occupation = document.occupations[0] if document.occupations else ""
    skill_level = document.skill_levels[0] if document.skill_levels else 3
    training_group = document.training_groups[0].value if document.training_groups else "atvsld"
    return occupation, skill_level, training_group


# =============================================================================
# NON-STREAMING VERSION
# =============================================================================

async def upload_and_auto_generate(document: TrainingDocument) -> dict:
    """
    Tạo khóa học + câu hỏi từ tài liệu.
    - Lưu DB ngay sau mỗi chunk (incremental save)
    - Retry 3 lần khi lỗi AI/parse
    - Bỏ qua chunk lỗi, không hỏng toàn bộ
    """
    if not document.extracted_text:
        raise ValueError(
            "Tài liệu không có nội dung text để phân tích. "
            "Vui lòng upload file PDF hoặc DOCX có text (không phải scan ảnh)."
        )

    total_chars = document.total_chars or len(document.extracted_text)
    page_count = document.page_count or 0

    logger.info(
        f"Auto-generate từ '{document.title}': "
        f"{page_count} trang, {total_chars} ký tự"
    )

    if total_chars <= SINGLE_CALL_CHAR_LIMIT:
        logger.info("Chiến lược: single-pass (tài liệu nhỏ)")
        return await _generate_single_pass(document)
    else:
        logger.info(f"Chiến lược: chunk-by-chunk ({total_chars} chars)")
        return await _generate_chunk_by_chunk(document)


async def _generate_single_pass(document: TrainingDocument) -> dict:
    """Tài liệu nhỏ: gọi AI 1 lần với retry."""
    occupation, skill_level, training_group = _get_doc_context(document)
    valid_occupations = await _get_catalog_occupation_names()

    content = document.extracted_text
    if len(content) > 80000:
        content = content[:80000] + "\n\n[... nội dung bị cắt bớt ...]"

    header = _build_user_prompt_header(
        document.title,
        occupation,
        skill_level,
        training_group,
        valid_occupations,
    )
    user_prompt = f"""Hãy phân tích tài liệu sau và tạo khóa học + ngân hàng câu hỏi:

{header}

NỘI DUNG TÀI LIỆU:
{content}"""

    ai_result = await _call_ai_with_retry(
        messages=[
            {"role": "system", "content": AUTO_GENERATE_ALL_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
    )

    all_lessons_data = ai_result.get("course", {}).get("lessons", [])
    all_questions_data = ai_result.get("questions", [])

    course_title = ai_result.get("course", {}).get("title", f"Khóa học từ {document.title}")
    course_desc = ai_result.get("course", {}).get("description", "")
    course_objectives = ai_result.get("course", {}).get("objectives", [])
    course_occupation = _normalize_occupation(
        ai_result.get("course", {}).get("occupation", occupation),
        valid_occupations,
    )

    return await _save_results_incremental(
        document=document,
        course_title=course_title,
        course_description=course_desc,
        course_objectives=course_objectives,
        all_lessons_data=all_lessons_data,
        all_questions_data=all_questions_data,
        strategy="single-pass",
        total_chunks=1,
        occupation=course_occupation,
    )


async def _generate_chunk_by_chunk(document: TrainingDocument) -> dict:
    """Tài liệu lớn: xử lý từng chunk, lưu DB ngay, retry + skip lỗi."""
    occupation, skill_level, training_group = _get_doc_context(document)
    now = datetime.now(timezone.utc)
    model_name = get_model()
    doc_id = str(document.id)
    training_group_enum = document.training_groups[0] if document.training_groups else "atvsld"

    # Chia chunks
    if document.extracted_pages:
        parse_result = ParseResult(pages=document.extracted_pages, page_count=document.page_count)
    else:
        text = document.extracted_text
        chunk_size = 3000
        pages = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
        parse_result = ParseResult(pages=pages)

    chunks = parse_result.get_chunks(max_chars_per_chunk=MAX_CHARS_PER_CHUNK)
    total_chunks = len(chunks)
    logger.info(f"Chia thành {total_chunks} chunks từ '{document.title}'")

    # Tạo Course trống trước (sẽ cập nhật dần)
    course = Course(
        title=f"Đang tạo... ({document.title})",
        description="",
        objectives=[],
        occupation=occupation,
        skill_level=skill_level,
        training_group=training_group_enum,
        lessons=[],
        source_document_ids=[doc_id],
        ai_generated=True,
        ai_model=model_name,
        ai_generated_at=now,
        status=ApprovalStatus.DRAFT,
        created_by=document.uploaded_by,
    )
    await course.insert()
    logger.info(f"Đã tạo khóa học trống: {course.id}")

    # Xử lý từng chunk
    all_created_questions = []
    lesson_order = 0
    skipped_chunks = 0

    valid_occupations = await _get_catalog_occupation_names()
    # Pre-normalize trước vòng lặp để câu hỏi ở các chunk đầu đã có tên nghề hợp lệ
    occupation = _normalize_occupation(occupation, valid_occupations)

    for i, chunk in enumerate(chunks):
        chunk_num = i + 1
        logger.info(f"  Xử lý chunk {chunk_num}/{total_chunks} ({len(chunk)} ký tự)")

        header = _build_user_prompt_header(
            document.title,
            occupation,
            skill_level,
            training_group,
            valid_occupations,
        )
        user_prompt = f"""Phần {chunk_num}/{total_chunks} của tài liệu:
{header}

NỘI DUNG PHẦN NÀY:
{chunk}"""

        try:
            chunk_result = await _call_ai_with_retry(
                messages=[
                    {"role": "system", "content": CHUNK_GENERATE_SYSTEM},
                    {"role": "user", "content": user_prompt},
                ],
            )

            # Lưu lessons ngay vào course
            chunk_lessons = chunk_result.get("lessons", [])
            for ld in chunk_lessons:
                lesson_order += 1
                lesson = _build_lesson(ld, lesson_order)
                course.lessons.append(lesson)

            course.updated_at = datetime.now(timezone.utc)
            await course.save()
            logger.info(f"    → Đã lưu {len(chunk_lessons)} bài học vào khóa học")

            # Lưu questions ngay vào DB
            chunk_questions = chunk_result.get("questions", [])
            for qd in chunk_questions:
                q = await _save_question(
                    q_data=qd,
                    occupation=occupation,
                    skill_level=skill_level,
                    training_group_enum=training_group_enum,
                    doc_id=doc_id,
                    course_id=str(course.id),
                    model_name=model_name,
                    created_by=document.uploaded_by,
                )
                if q:
                    all_created_questions.append(q)

            logger.info(f"    → Tổng cộng: {lesson_order} bài học, {len(all_created_questions)} câu hỏi")

        except Exception as e:
            skipped_chunks += 1
            logger.error(f"  Bỏ qua chunk {chunk_num}/{total_chunks} sau {MAX_RETRIES} lần thử: {e}")
            continue

    if not course.lessons:
        # Xóa course trống nếu không có bài học nào
        await course.delete()
        raise ValueError("Không thể tạo bài học từ tài liệu sau nhiều lần thử. Vui lòng thử lại.")

    # Tạo metadata khóa học
    lesson_titles = [f"{l.order}. {l.title}" for l in course.lessons]
    valid_occupations = await _get_catalog_occupation_names()
    course_title, course_desc, course_objectives, course_occupation = await _generate_course_metadata(
        document_title=document.title,
        occupation=occupation,
        lesson_titles=lesson_titles,
        valid_occupations=valid_occupations,
    )

    course.title = course_title
    course.description = course_desc
    course.objectives = course_objectives
    final_occupation = course_occupation or occupation or (valid_occupations[0] if valid_occupations else "")
    course.occupation = final_occupation
    course.updated_at = datetime.now(timezone.utc)
    await course.save()
    logger.info(f"Đã cập nhật metadata khóa học: {course.title}")

    # Đồng bộ occupation cho toàn bộ câu hỏi theo nghề chính thức của khóa học
    for q in all_created_questions:
        if q.occupation != final_occupation:
            q.occupation = final_occupation
            await q.save()

    # Build response
    return _build_response(document, course, all_created_questions, "chunk-by-chunk", total_chunks, skipped_chunks)


async def _generate_course_metadata(
    document_title: str,
    occupation: str,
    lesson_titles: list[str],
    valid_occupations: list[str],
) -> tuple[str, str, list[str], str]:
    """Gọi AI tạo metadata khóa học, có retry."""
    lesson_list = "\n".join(lesson_titles)
    user_prompt = f"""Tài liệu gốc: {document_title}
Ngành nghề: {occupation}
Danh sách nghề hợp lệ: {', '.join(valid_occupations)}

Danh sách bài học đã tạo:
{lesson_list}

Hãy tạo thông tin tổng quát cho khóa học này, bao gồm occupation.
Occupation phải là một trong tên nghề trong danh sách nghề hợp lệ."""

    try:
        result = await _call_ai_with_retry(
            messages=[
                {"role": "system", "content": COURSE_METADATA_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            max_completion_tokens=2000,
        )
        return (
            result.get("title", f"Khóa học từ {document_title}"),
            result.get("description", ""),
            result.get("objectives", []),
            _normalize_occupation(result.get("occupation", occupation), valid_occupations),
        )
    except Exception as e:
        logger.error(f"Lỗi tạo metadata khóa học (dùng fallback): {e}")
        return (
            f"Khóa học từ {document_title}",
            f"Khóa học huấn luyện ATVSLĐ tạo từ tài liệu {document_title}",
            ["Nắm vững kiến an toàn lao động"],
            _normalize_occupation(occupation, valid_occupations),
        )


async def _save_results_incremental(
    document: TrainingDocument,
    course_title: str,
    course_description: str,
    course_objectives: list[str],
    all_lessons_data: list[dict],
    all_questions_data: list[dict],
    strategy: str,
    total_chunks: int,
    occupation: str,
) -> dict:
    """Lưu kết quả single-pass: tạo course + lưu từng question."""
    valid_occupations = await _get_catalog_occupation_names() if not occupation else []
    occupation = occupation or (valid_occupations[0] if valid_occupations else "")
    now = datetime.now(timezone.utc)
    model_name = get_model()
    doc_id = str(document.id)
    _, skill_level, _ = _get_doc_context(document)
    training_group_enum = document.training_groups[0] if document.training_groups else "atvsld"

    # Tạo lessons
    lessons = []
    for i, ld in enumerate(all_lessons_data):
        lessons.append(_build_lesson(ld, i + 1))

    # Tạo Course
    course = Course(
        title=course_title,
        description=course_description,
        objectives=course_objectives,
        occupation=occupation,
        skill_level=skill_level,
        training_group=training_group_enum,
        lessons=lessons,
        source_document_ids=[doc_id],
        ai_generated=True,
        ai_model=model_name,
        ai_generated_at=now,
        status=ApprovalStatus.DRAFT,
        created_by=document.uploaded_by,
    )
    await course.insert()
    logger.info(f"Đã tạo khóa học: {course.title} với {len(lessons)} bài học")

    # Lưu từng câu hỏi (bỏ qua nếu lỗi)
    created_questions = []
    for qd in all_questions_data:
        q = await _save_question(
            q_data=qd,
            occupation=occupation,
            skill_level=skill_level,
            training_group_enum=training_group_enum,
            doc_id=doc_id,
            course_id=str(course.id),
            model_name=model_name,
            created_by=document.uploaded_by,
        )
        if q:
            created_questions.append(q)

    logger.info(f"Đã tạo {len(created_questions)}/{len(all_questions_data)} câu hỏi")

    return _build_response(document, course, created_questions, strategy, total_chunks, 0)


def _build_response(
    document: TrainingDocument,
    course: Course,
    created_questions: list[Question],
    strategy: str,
    total_chunks: int,
    skipped_chunks: int = 0,
) -> dict:
    """Build response dict."""
    doc_id = str(document.id)

    result = {
        "document": {
            "id": doc_id,
            "title": document.title,
            "file_name": document.file_name,
            "page_count": document.page_count,
            "total_chars": document.total_chars,
            "status": document.status.value,
        },
        "processing": {
            "strategy": strategy,
            "total_chunks": total_chunks,
            "skipped_chunks": skipped_chunks,
            "original_chars": document.total_chars,
        },
        "course": {
            "id": str(course.id),
            "title": course.title,
            "description": course.description,
            "objectives": course.objectives,
            "occupation": course.occupation,
            "lesson_count": len(course.lessons),
            "lessons": [
                {
                    "order": lesson.order,
                    "title": lesson.title,
                    "duration_minutes": lesson.duration_minutes,
                }
                for lesson in course.lessons
            ],
            "status": course.status.value,
        },
        "questions": {
            "total": len(created_questions),
            "by_type": _count_by(created_questions, "question_type") if created_questions else {},
            "by_difficulty": _count_by(created_questions, "difficulty") if created_questions else {},
            "items": [
                {
                    "id": str(q.id),
                    "content": q.content[:100] + ("..." if len(q.content) > 100 else ""),
                    "question_type": q.question_type.value,
                    "difficulty": q.difficulty.value,
                }
                for q in created_questions
            ],
        },
        "message": (
            f"Đã tạo thành công từ tài liệu '{document.title}' "
            f"({document.page_count or '?'} trang, {document.total_chars:,} ký tự): "
            f"1 khóa học ({len(course.lessons)} bài học) và {len(created_questions)} câu hỏi. "
            f"Chiến lược: {strategy} ({total_chunks} chunks"
            f"{f', bỏ qua {skipped_chunks} chunks lỗi' if skipped_chunks else ''}). "
            f"Tất cả ở trạng thái DRAFT, cần cán bộ đào tạo phê duyệt."
        ),
    }
    return result


# =============================================================================
# STREAMING VERSION (SSE)
# =============================================================================

async def upload_and_auto_generate_stream(
    document: TrainingDocument,
) -> AsyncGenerator[str, None]:
    """
    Streaming version: yield SSE events với tiến trình xử lý.
    - Retry 3 lần mỗi chunk
    - Lưu DB ngay sau mỗi chunk
    - Bỏ qua chunk lỗi
    """
    if not document.extracted_text:
        yield _sse_event("error", 0, "Tài liệu không có nội dung text để phân tích.")
        return

    total_chars = document.total_chars or len(document.extracted_text)
    page_count = document.page_count or 0

    is_single_pass = total_chars <= SINGLE_CALL_CHAR_LIMIT
    strategy = "single-pass" if is_single_pass else "chunk-by-chunk"

    yield _sse_event("start", 5, f"Bắt đầu xử lý tài liệu ({page_count} trang, {total_chars:,} ký tự)", {
        "document_id": str(document.id),
        "title": document.title,
        "page_count": page_count,
        "total_chars": total_chars,
        "strategy": strategy,
    })

    try:
        if is_single_pass:
            async for event in _stream_single_pass(document):
                yield event
        else:
            async for event in _stream_chunk_by_chunk(document):
                yield event
    except Exception as e:
        logger.error(f"Lỗi streaming auto-generate: {e}")
        yield _sse_event("error", 0, f"Lỗi xử lý: {str(e)}")


async def _stream_single_pass(
    document: TrainingDocument,
) -> AsyncGenerator[str, None]:
    """Single-pass streaming với retry."""
    occupation, skill_level, training_group = _get_doc_context(document)
    valid_occupations = await _get_catalog_occupation_names()

    content = document.extracted_text
    if len(content) > 80000:
        content = content[:80000] + "\n\n[... nội dung bị cắt bớt ...]"

    yield _sse_event("generating", 15, "AI đang phân tích tài liệu và tạo khóa học + câu hỏi...")

    header = _build_user_prompt_header(
        document.title,
        occupation,
        skill_level,
        training_group,
        valid_occupations,
    )
    user_prompt = f"""Hãy phân tích tài liệu sau và tạo khóa học + ngân hàng câu hỏi:

{header}

NỘI DUNG TÀI LIỆU:
{content}"""

    ai_result = await _call_ai_with_retry(
        messages=[
            {"role": "system", "content": AUTO_GENERATE_ALL_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
    )

    all_lessons_data = ai_result.get("course", {}).get("lessons", [])
    all_questions_data = ai_result.get("questions", [])

    yield _sse_event("chunk_done", 75, f"AI đã tạo {len(all_lessons_data)} bài học và {len(all_questions_data)} câu hỏi", {
        "lessons_count": len(all_lessons_data),
        "questions_count": len(all_questions_data),
        "lessons": [{"order": l.get("order", i+1), "title": l.get("title", "")} for i, l in enumerate(all_lessons_data)],
    })

    course_title = ai_result.get("course", {}).get("title", f"Khóa học từ {document.title}")
    course_desc = ai_result.get("course", {}).get("description", "")
    course_objectives = ai_result.get("course", {}).get("objectives", [])

    yield _sse_event("saving", 85, "Đang lưu khóa học và câu hỏi vào cơ sở dữ liệu...")

    result = await _save_results_incremental(
        document=document,
        course_title=course_title,
        course_description=course_desc,
        course_objectives=course_objectives,
        all_lessons_data=all_lessons_data,
        all_questions_data=all_questions_data,
        strategy="single-pass",
        total_chunks=1,
        occupation=_normalize_occupation(
            ai_result.get("course", {}).get("occupation", occupation),
            valid_occupations,
        ),
    )

    yield _sse_event("complete", 100, result["message"], result)


async def _stream_chunk_by_chunk(
    document: TrainingDocument,
) -> AsyncGenerator[str, None]:
    """Chunk-by-chunk streaming: retry + lưu ngay + bỏ qua lỗi."""
    occupation, skill_level, training_group = _get_doc_context(document)
    now = datetime.now(timezone.utc)
    model_name = get_model()
    doc_id = str(document.id)
    training_group_enum = document.training_groups[0] if document.training_groups else "atvsld"

    # Chia chunks
    if document.extracted_pages:
        parse_result = ParseResult(pages=document.extracted_pages, page_count=document.page_count)
    else:
        text = document.extracted_text
        chunk_size = 3000
        pages = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
        parse_result = ParseResult(pages=pages)

    chunks = parse_result.get_chunks(max_chars_per_chunk=MAX_CHARS_PER_CHUNK)
    total_chunks = len(chunks)
    valid_occupations = await _get_catalog_occupation_names()
    # Pre-normalize để các chunk đầu đã có tên nghề hợp lệ
    occupation = _normalize_occupation(occupation, valid_occupations)

    yield _sse_event("start_chunks", 8, f"Chia tài liệu thành {total_chunks} phần để xử lý", {
        "total_chunks": total_chunks,
    })

    # Tạo Course trống trước
    course = Course(
        title=f"Đang tạo... ({document.title})",
        description="",
        objectives=[],
        occupation=occupation,
        skill_level=skill_level,
        training_group=training_group_enum,
        lessons=[],
        source_document_ids=[doc_id],
        ai_generated=True,
        ai_model=model_name,
        ai_generated_at=now,
        status=ApprovalStatus.DRAFT,
        created_by=document.uploaded_by,
    )
    await course.insert()

    chunk_progress_start = 10
    chunk_progress_end = 80
    progress_per_chunk = (chunk_progress_end - chunk_progress_start) / max(total_chunks, 1)

    all_created_questions = []
    lesson_order = 0
    skipped_chunks = 0

    for i, chunk in enumerate(chunks):
        chunk_num = i + 1
        current_progress = int(chunk_progress_start + i * progress_per_chunk)

        yield _sse_event("chunk_start", current_progress,
            f"Đang xử lý phần {chunk_num}/{total_chunks} ({len(chunk):,} ký tự)...", {
                "chunk": chunk_num,
                "total_chunks": total_chunks,
                "chunk_chars": len(chunk),
            })

        header = _build_user_prompt_header(
            document.title,
            occupation,
            skill_level,
            training_group,
            valid_occupations,
        )
        user_prompt = f"""Phần {chunk_num}/{total_chunks} của tài liệu:
{header}

NỘI DUNG PHẦN NÀY:
{chunk}"""

        try:
            chunk_result = await _call_ai_with_retry(
                messages=[
                    {"role": "system", "content": CHUNK_GENERATE_SYSTEM},
                    {"role": "user", "content": user_prompt},
                ],
            )

            # Lưu lessons ngay
            chunk_lessons = chunk_result.get("lessons", [])
            for ld in chunk_lessons:
                lesson_order += 1
                lesson = _build_lesson(ld, lesson_order)
                course.lessons.append(lesson)

            course.updated_at = datetime.now(timezone.utc)
            await course.save()

            # Lưu questions ngay
            chunk_questions = chunk_result.get("questions", [])
            chunk_saved_questions = 0
            for qd in chunk_questions:
                q = await _save_question(
                    q_data=qd,
                    occupation=occupation,
                    skill_level=skill_level,
                    training_group_enum=training_group_enum,
                    doc_id=doc_id,
                    course_id=str(course.id),
                    model_name=model_name,
                    created_by=document.uploaded_by,
                )
                if q:
                    all_created_questions.append(q)
                    chunk_saved_questions += 1

            done_progress = int(chunk_progress_start + (i + 1) * progress_per_chunk)

            yield _sse_event("chunk_done", done_progress,
                f"Hoàn thành phần {chunk_num}/{total_chunks}: {len(chunk_lessons)} bài học, {chunk_saved_questions} câu hỏi (đã lưu DB)", {
                    "chunk": chunk_num,
                    "total_chunks": total_chunks,
                    "lessons_count": len(chunk_lessons),
                    "questions_count": chunk_saved_questions,
                    "lessons": [{"order": l.get("order", j+1), "title": l.get("title", "")} for j, l in enumerate(chunk_lessons)],
                    "cumulative_lessons": len(course.lessons),
                    "cumulative_questions": len(all_created_questions),
                })

        except Exception as e:
            skipped_chunks += 1
            logger.error(f"Bỏ qua chunk {chunk_num} sau {MAX_RETRIES} lần thử: {e}")
            yield _sse_event("chunk_error", current_progress,
                f"Bỏ qua phần {chunk_num}/{total_chunks} sau {MAX_RETRIES} lần thử: {str(e)}", {
                    "chunk": chunk_num,
                    "total_chunks": total_chunks,
                    "retries": MAX_RETRIES,
                })
            continue

    if not course.lessons:
        await course.delete()
        yield _sse_event("error", 0, "Không thể tạo bài học từ tài liệu sau nhiều lần thử.")
        return

    # Metadata
    yield _sse_event("metadata", 83, "Đang tạo thông tin tổng quan khóa học...")

    valid_occupations = await _get_catalog_occupation_names()
    lesson_titles = [f"{l.order}. {l.title}" for l in course.lessons]
    course_title, course_desc, course_objectives, course_occupation = await _generate_course_metadata(
        document_title=document.title,
        occupation=occupation,
        lesson_titles=lesson_titles,
        valid_occupations=valid_occupations,
    )

    course.title = course_title
    course.description = course_desc
    course.objectives = course_objectives
    final_occupation = course_occupation or occupation or (valid_occupations[0] if valid_occupations else "")
    course.occupation = final_occupation
    course.updated_at = datetime.now(timezone.utc)
    await course.save()

    # Đồng bộ occupation cho toàn bộ câu hỏi theo nghề chính thức của khóa học
    for q in all_created_questions:
        if q.occupation != final_occupation:
            q.occupation = final_occupation
            await q.save()

    yield _sse_event("metadata_done", 88, f"Khóa học: {course_title}", {
        "title": course_title,
        "description": course_desc,
        "objectives": course_objectives,
    })

    yield _sse_event("saving", 92,
        f"Đã lưu xong {len(course.lessons)} bài học và {len(all_created_questions)} câu hỏi"
        f"{f' (bỏ qua {skipped_chunks} chunks lỗi)' if skipped_chunks else ''}")

    result = _build_response(document, course, all_created_questions, "chunk-by-chunk", total_chunks, skipped_chunks)

    yield _sse_event("complete", 100, result["message"], result)
