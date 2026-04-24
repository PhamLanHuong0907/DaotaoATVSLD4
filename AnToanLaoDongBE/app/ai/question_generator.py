import json
import logging

from app.ai.openai_client import get_openai_client, get_model
from app.ai.prompts import QUESTION_GENERATION_SYSTEM
from app.config import get_settings

logger = logging.getLogger(__name__)


async def generate_questions(
    source_text: str,
    occupation: str,
    skill_level: int,
    training_group: str,
    question_type: str,
    difficulty: str,
    count: int = 10,
) -> list[dict]:
    """
    Generate exam questions from training content using OpenAI.

    Returns list of question dicts ready for Question model creation.
    """
    client = get_openai_client()
    settings = get_settings()

    # Truncate source text if too long
    max_chars = 80000
    if len(source_text) > max_chars:
        source_text = source_text[:max_chars] + "\n\n[... nội dung bị cắt bớt ...]"

    user_prompt = f"""Tạo {count} câu hỏi kiểm tra từ nội dung sau:

Ngành nghề: {occupation}
Bậc thợ: {skill_level}
Nhóm huấn luyện: {training_group}
Loại câu hỏi: {question_type}
Mức độ khó: {difficulty}

NỘI DUNG TÀI LIỆU:
{source_text}"""

    response = await client.chat.completions.create(
        model=get_model(),
        messages=[
            {"role": "system", "content": QUESTION_GENERATION_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        max_completion_tokens=settings.OPENAI_MAX_COMPLETION_TOKENS,
        response_format={"type": "json_object"},
    )

    result_text = response.choices[0].message.content
    try:
        parsed = json.loads(result_text)
        # Handle both {"questions": [...]} and direct [...]
        if isinstance(parsed, list):
            return parsed
        elif isinstance(parsed, dict) and "questions" in parsed:
            return parsed["questions"]
        else:
            return [parsed]
    except json.JSONDecodeError:
        logger.error(f"Failed to parse AI question response: {result_text[:500]}")
        raise ValueError("AI returned invalid JSON for question generation")
