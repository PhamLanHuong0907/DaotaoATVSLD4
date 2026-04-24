import json
import logging

from app.ai.openai_client import get_openai_client, get_model
from app.ai.prompts import COURSE_GENERATION_SYSTEM
from app.config import get_settings

logger = logging.getLogger(__name__)


async def generate_course_content(
    document_texts: list[dict],
    occupation: str,
    skill_level: int,
    training_group: str,
) -> dict:
    """
    Generate course content from approved documents using OpenAI.

    Args:
        document_texts: List of {"id", "title", "text"} from approved documents
        occupation: Target occupation
        skill_level: Target skill level (1-7)
        training_group: Training group type

    Returns:
        Dict with course structure: title, description, objectives, lessons[]
    """
    client = get_openai_client()
    settings = get_settings()


    # Build context from documents
    context_parts = []
    for doc in document_texts:
        context_parts.append(f"=== Tài liệu: {doc['title']} ===\n{doc['text']}")
    combined_text = "\n\n".join(context_parts)

    # Truncate if too long (keep within token limits)
    max_chars = 100000
    if len(combined_text) > max_chars:
        combined_text = combined_text[:max_chars] + "\n\n[... nội dung bị cắt bớt do quá dài ...]"

    user_prompt = f"""Hãy tạo khóa học huấn luyện từ các tài liệu sau:

Ngành nghề: {occupation}
Bậc thợ: {skill_level}
Nhóm huấn luyện: {training_group}

NỘI DUNG TÀI LIỆU:
{combined_text}"""

    response = await client.chat.completions.create(
        model=get_model(),
        messages=[
            {"role": "system", "content": COURSE_GENERATION_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        max_completion_tokens=settings.OPENAI_MAX_COMPLETION_TOKENS,
        response_format={"type": "json_object"},
    )

    result_text = response.choices[0].message.content
    try:
        return json.loads(result_text)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse AI course response: {result_text[:500]}")
        raise ValueError("AI returned invalid JSON for course generation")
