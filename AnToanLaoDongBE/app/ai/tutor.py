import json
import logging

from app.ai.openai_client import get_openai_client, get_model
from app.ai.prompts import (
    TUTOR_SYSTEM, REVIEW_SUGGESTION_SYSTEM, PRACTICE_QUESTION_SYSTEM,
)

logger = logging.getLogger(__name__)


async def chat_with_tutor(
    user_message: str,
    chat_history: list[dict],
    context: str | None = None,
) -> str:
    """AI tutoring chat. Returns assistant response."""
    client = get_openai_client()

    messages = [{"role": "system", "content": TUTOR_SYSTEM}]

    if context:
        messages.append({
            "role": "system",
            "content": f"Ngữ cảnh bổ sung:\n{context}",
        })

    # Add chat history (keep last 20 messages for context window)
    for msg in chat_history[-20:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": user_message})

    response = await client.chat.completions.create(
        model=get_model(),
        messages=messages,
        max_completion_tokens=2000,
        temperature=0.7,
    )

    return response.choices[0].message.content or ""


async def explain_wrong_answers(
    wrong_answers: list[dict],
) -> str:
    """
    Explain wrong answers from an exam submission.

    wrong_answers: list of {question, user_answer, correct_answer, explanation}
    """
    client = get_openai_client()

    context_parts = []
    for i, wa in enumerate(wrong_answers, 1):
        context_parts.append(
            f"Câu {i}: {wa['question']}\n"
            f"  Đáp án của bạn: {wa['user_answer']}\n"
            f"  Đáp án đúng: {wa['correct_answer']}\n"
            f"  Gợi ý: {wa.get('explanation', 'Không có')}"
        )

    user_prompt = (
        "Hãy giải thích chi tiết từng câu trả lời sai dưới đây, "
        "giúp người lao động hiểu tại sao đáp án của họ sai "
        "và tại sao đáp án đúng lại đúng:\n\n"
        + "\n\n".join(context_parts)
    )

    response = await client.chat.completions.create(
        model=get_model(),
        messages=[
            {"role": "system", "content": TUTOR_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        max_completion_tokens=3000,
    )

    return response.choices[0].message.content


async def suggest_review_topics(
    exam_results_summary: str,
) -> dict:
    """Suggest review topics based on exam results."""
    client = get_openai_client()

    response = await client.chat.completions.create(
        model=get_model(),
        messages=[
            {"role": "system", "content": REVIEW_SUGGESTION_SYSTEM},
            {"role": "user", "content": exam_results_summary},
        ],
        max_completion_tokens=2000,
        response_format={"type": "json_object"},
    )

    result_text = response.choices[0].message.content
    try:
        return json.loads(result_text)
    except json.JSONDecodeError:
        return {"analysis": result_text, "weak_topics": [], "suggestions": []}


async def generate_practice_questions(
    topic: str,
    occupation: str,
    skill_level: int,
    count: int = 5,
) -> list[dict]:
    """Generate practice questions for self-study."""
    client = get_openai_client()

    user_prompt = (
        f"Tạo {count} câu hỏi luyện tập về chủ đề: {topic}\n"
        f"Ngành nghề: {occupation}\n"
        f"Bậc thợ: {skill_level}\n\n"
        f"Bao gồm cả câu trắc nghiệm và đúng/sai. "
        f"Kèm giải thích chi tiết cho mỗi câu."
    )

    response = await client.chat.completions.create(
        model=get_model(),
        messages=[
            {"role": "system", "content": PRACTICE_QUESTION_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        max_completion_tokens=3000,
        response_format={"type": "json_object"},
    )

    result_text = response.choices[0].message.content
    try:
        parsed = json.loads(result_text)
        if isinstance(parsed, list):
            return parsed
        elif isinstance(parsed, dict) and "questions" in parsed:
            return parsed["questions"]
        return [parsed]
    except json.JSONDecodeError:
        return []
