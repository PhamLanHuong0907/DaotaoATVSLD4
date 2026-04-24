import os
import uuid
import logging
import httpx
from datetime import datetime, timezone

from app.models.course import Course
from app.ai.openai_client import get_openai_client
from app.config import get_settings

logger = logging.getLogger(__name__)

# Thư mục lưu ảnh sinh ra
IMAGES_DIR = "./uploads/images"


def _get_images_dir() -> str:
    os.makedirs(IMAGES_DIR, exist_ok=True)
    return IMAGES_DIR


def _sanitize_text(text: str) -> str:
    """Loại bỏ các từ khóa nhạy cảm bị OpenAI safety filter chặn."""
    sensitive_words = {
        "nổ mìn": "khoan đá",
        "nổ": "thi công",
        "mìn": "thiết bị khoan",
        "vật liệu nổ": "vật tư thi công",
        "thuốc nổ": "vật tư khoan",
        "kíp nổ": "thiết bị kích hoạt",
        "chất nổ": "vật tư đặc biệt",
        "cháy nổ": "sự cố nhiệt",
        "cháy": "sự cố nhiệt",
        "explosion": "incident",
        "explosive": "equipment",
        "blasting": "drilling",
        "methane": "hazardous gas",
        "khí methane": "khí nguy hiểm",
        "sập lò": "sự cố hầm",
        "sập": "sự cố kết cấu",
        "tai nạn": "sự cố",
        "tử vong": "nghiêm trọng",
        "chết": "nguy hiểm",
        "thương tích": "chấn thương",
        "bỏng": "tổn thương nhiệt",
        "điện giật": "sự cố điện",
        "ngạt": "thiếu oxy",
    }
    result = text.lower()
    for word, replacement in sensitive_words.items():
        result = result.replace(word, replacement)
    return result


async def _translate_to_english(title: str, theory: str, occupation: str) -> str:
    """Dùng GPT dịch nội dung bài học sang tiếng Anh + tóm tắt thành mô tả ngắn cho ảnh."""
    client = get_openai_client()
    settings = get_settings()

    # Lấy tối đa 500 chars theory để không quá dài
    theory_short = theory[:500] if theory else ""

    response = await client.chat.completions.create(
        model=settings.OPENAI_LESSON_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a translator. Translate the following Vietnamese lesson content to English. "
                    "Then summarize it into a SHORT visual scene description (max 2 sentences) that describes "
                    "what should be illustrated in an educational image. Focus on the key visual elements: "
                    "what workers are doing, what equipment/environment is shown, what safety concept is being demonstrated. "
                    "Output ONLY the scene description, nothing else."
                ),
            },
            {
                "role": "user",
                "content": f"Lesson title: {title}\nOccupation: {occupation}\nContent:\n{theory_short}",
            },
        ],
        max_completion_tokens=200,
    )

    return response.choices[0].message.content.strip()


def _build_prompt(scene_description: str) -> str:
    """Tạo prompt cho DALL-E từ scene description đã dịch sang tiếng Anh."""
    safe_scene = _sanitize_text(scene_description)

    return (
        f"A professional educational illustration for a workplace safety training course. "
        f"Scene: {safe_scene}. "
        f"Style: clean, modern, flat design with safety colors (yellow, orange, blue). "
        f"Workers wearing proper PPE (helmets, safety vests, protective gear). "
        f"Positive tone showing correct safety procedures and best practices. "
        f"IMPORTANT: The image must contain absolutely NO text, NO words, NO letters, NO numbers, NO labels, NO captions. Pure illustration only."
    )


async def generate_lesson_image(
    course_id: str,
    lesson_order: int,
    model: str = "dall-e-3",
    size: str = "1024x1024",
    quality: str = "standard",
) -> dict:
    """
    Sinh ảnh minh họa cho 1 bài học cụ thể bằng DALL-E.

    Returns: {"lesson_order": int, "image_url": str}
    """
    course = await Course.get(course_id)
    if not course:
        raise ValueError("Không tìm thấy khóa học")

    # Tìm bài học theo order
    lesson = None
    lesson_idx = None
    for i, l in enumerate(course.lessons):
        if l.order == lesson_order:
            lesson = l
            lesson_idx = i
            break

    if lesson is None:
        raise ValueError(f"Không tìm thấy bài học thứ {lesson_order}")

    # Bước 1: Dịch + tóm tắt nội dung sang tiếng Anh bằng GPT
    logger.info(f"Translating lesson {lesson_order}: {lesson.title}")
    scene_description = await _translate_to_english(
        title=lesson.title,
        theory=lesson.theory,
        occupation=course.occupation,
    )
    logger.info(f"Scene description: {scene_description}")

    # Bước 2: Sinh ảnh bằng DALL-E
    prompt = _build_prompt(scene_description)

    logger.info(f"Generating image for lesson {lesson_order}: {lesson.title}")

    client = get_openai_client()
    response = await client.images.generate(
        model=model,
        prompt=prompt,
        size=size,
        quality=quality,
        n=1,
    )

    image_url_remote = response.data[0].url

    # Download và lưu ảnh local
    file_name = f"{course_id}_lesson{lesson_order}_{uuid.uuid4().hex[:8]}.png"
    file_path = os.path.join(_get_images_dir(), file_name)

    async with httpx.AsyncClient() as http_client:
        img_response = await http_client.get(image_url_remote)
        img_response.raise_for_status()
        with open(file_path, "wb") as f:
            f.write(img_response.content)

    logger.info(f"Image saved: {file_path}")

    # Cập nhật image_url trong course
    local_url = f"/api/v1/images/{file_name}"
    course.lessons[lesson_idx].image_url = local_url
    course.updated_at = datetime.now(timezone.utc)
    await course.save()

    return {
        "lesson_order": lesson_order,
        "lesson_title": lesson.title,
        "image_url": local_url,
    }


async def generate_all_lesson_images(
    course_id: str,
    model: str = "dall-e-3",
    size: str = "1024x1024",
    quality: str = "standard",
) -> dict:
    """
    Sinh ảnh minh họa cho TẤT CẢ bài học trong khóa học.

    Returns: {"course_id": str, "total": int, "generated": int, "results": [...]}
    """
    course = await Course.get(course_id)
    if not course:
        raise ValueError("Không tìm thấy khóa học")

    if not course.lessons:
        raise ValueError("Khóa học không có bài học nào")

    results = []
    generated = 0

    for lesson in course.lessons:
        try:
            result = await generate_lesson_image(course_id, lesson.order, model, size, quality)
            results.append(result)
            generated += 1
        except Exception as e:
            logger.error(f"Lỗi sinh ảnh bài {lesson.order}: {e}")
            results.append({
                "lesson_order": lesson.order,
                "lesson_title": lesson.title,
                "image_url": None,
                "error": str(e),
            })

    return {
        "course_id": course_id,
        "course_title": course.title,
        "total": len(course.lessons),
        "generated": generated,
        "results": results,
    }
