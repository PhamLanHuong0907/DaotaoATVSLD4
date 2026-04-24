import os
import uuid
import asyncio
import subprocess
import logging
import time
import jwt
import httpx
from datetime import datetime, timezone

from app.models.course import Course
from app.ai.openai_client import get_openai_client
from app.config import get_settings

logger = logging.getLogger(__name__)

VIDEOS_DIR = "./uploads/videos"

KLING_API_BASE = "https://api.klingai.com"
KLING_TEXT2VIDEO_URL = f"{KLING_API_BASE}/v1/videos/text2video"

POLL_INTERVAL_SECONDS = 15
POLL_MAX_ATTEMPTS = 60


def _get_videos_dir() -> str:
    os.makedirs(VIDEOS_DIR, exist_ok=True)
    return VIDEOS_DIR


def _generate_kling_token() -> str:
    settings = get_settings()
    now = int(time.time())
    payload = {
        "iss": settings.KLING_ACCESS_KEY,
        "exp": now + 1800,
        "nbf": now - 5,
        "iat": now,
    }
    return jwt.encode(payload, settings.KLING_SECRET_KEY, algorithm="HS256")


def _get_kling_headers() -> dict:
    return {
        "Authorization": f"Bearer {_generate_kling_token()}",
        "Content-Type": "application/json",
    }


def _sanitize_text(text: str) -> str:
    sensitive_words = {
        "nổ mìn": "khoan đá", "nổ": "thi công", "mìn": "thiết bị khoan",
        "vật liệu nổ": "vật tư thi công", "thuốc nổ": "vật tư khoan",
        "kíp nổ": "thiết bị kích hoạt", "chất nổ": "vật tư đặc biệt",
        "cháy nổ": "sự cố nhiệt", "cháy": "sự cố nhiệt",
        "explosion": "incident", "explosive": "equipment", "blasting": "drilling",
        "methane": "hazardous gas", "khí methane": "khí nguy hiểm",
        "sập lò": "sự cố hầm", "sập": "sự cố kết cấu",
        "tai nạn": "sự cố", "tử vong": "nghiêm trọng", "chết": "nguy hiểm",
        "thương tích": "chấn thương", "bỏng": "tổn thương nhiệt",
        "điện giật": "sự cố điện", "ngạt": "thiếu oxy",
    }
    result = text.lower()
    for word, replacement in sensitive_words.items():
        result = result.replace(word, replacement)
    return result


# ===========================================================================
# GPT: tom tat bai hoc thanh nhieu canh quay + loi thuyet minh day du
# ===========================================================================

async def _generate_narration_and_scenes(
    title: str, theory: str, occupation: str,
    total_seconds: int, num_segments: int,
) -> dict:
    """
    GPT sinh dong thoi:
    - NARRATION: loi thuyet minh tieng VIET cho TTS
    - SCENES: mo ta canh quay tieng ANH cho Kling (Kling hieu English tot hon VN)
    Tra ve: {"narration": str, "scenes": [str, str, ...]}
    """
    client = get_openai_client()
    settings = get_settings()

    # Giong doc tieng Viet trung binh ~2.3 tu/giay
    word_limit = int(total_seconds * 2.3)
    min_words = int(total_seconds * 1.8)
    seg_sec = total_seconds // num_segments

    response = await client.chat.completions.create(
        model=settings.OPENAI_LESSON_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a professional scriptwriter for Vietnamese workplace safety training videos. "
                    "You MUST read the lesson content carefully and create a video script that accurately "
                    "reflects the SPECIFIC content of THIS lesson (not a generic safety video).\n\n"
                    f"TASK: Create a {total_seconds}-second training video script with TWO parts:\n\n"
                    f"PART 1 - NARRATION (in Vietnamese):\n"
                    f"Write a Vietnamese narration that SUMMARIZES the KEY POINTS of the lesson. "
                    f"MUST be {min_words}-{word_limit} words (reads in exactly {total_seconds}s). "
                    f"Cover the main safety procedures, risks, and key instructions from the lesson. "
                    f"Professional, clear, accessible tone for Vietnamese workers. "
                    f"DO NOT be generic - mention specific equipment, procedures, and risks from the lesson.\n\n"
                    f"PART 2 - SCENES (in English, for AI video generation):\n"
                    f"Write EXACTLY {num_segments} scene descriptions in ENGLISH (Kling AI works better with English). "
                    f"Each scene is {seg_sec} seconds and MUST depict a SPECIFIC moment from the lesson. "
                    f"Scenes must flow as ONE continuous video: same worker, same setting, same environment, "
                    f"only changing actions/camera angles. DO NOT change location or character between scenes.\n\n"
                    f"Each scene MUST include:\n"
                    f"- Specific equipment/tools mentioned in the lesson (not generic 'machinery')\n"
                    f"- Specific action the worker is performing (from the lesson procedure)\n"
                    f"- Specific workplace environment matching the occupation ({occupation})\n"
                    f"- Camera angle/movement (close-up, wide shot, tracking, etc.)\n"
                    f"- Worker wears proper PPE (helmet, vest, gloves, goggles as relevant)\n\n"
                    f"Example for a coal mining ventilation lesson:\n"
                    f"SCENE 1: Close-up tracking shot of a Vietnamese coal miner in orange vest and yellow helmet "
                    f"walking through a mine tunnel, holding a portable gas detector, checking the airflow meter "
                    f"mounted on the rocky wall, LED headlamp illuminating the tunnel.\n"
                    f"SCENE 2: Medium shot of the same miner adjusting the ventilation fan control panel, "
                    f"reading pressure gauges, yellow warning lights in background.\n"
                    f"SCENE 3: Wide shot of the same miner giving thumbs up to a coworker after confirming "
                    f"safe airflow levels, both wearing full PPE in the well-ventilated tunnel.\n\n"
                    "Return EXACTLY in this format (nothing else):\n"
                    "NARRATION:\n<full Vietnamese narration>\n\n"
                    "SCENE 1:\n<English scene 1 description>\n\n"
                    "SCENE 2:\n<English scene 2 description>\n\n"
                    f"...\nSCENE {num_segments}:\n<English scene {num_segments} description>"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Lesson title: {title}\n"
                    f"Occupation: {occupation}\n"
                    f"Lesson content (IMPORTANT - base scenes on this specific content):\n{theory}"
                ),
            },
        ],
        max_completion_tokens=2500,
    )

    text = response.choices[0].message.content.strip()

    # Parse output (format: NARRATION: ... SCENE 1: ... SCENE 2: ...)
    narration = ""
    scenes = []

    import re
    narration_match = re.search(
        r"NARRATION:\s*(.*?)(?=\n\s*SCENE\s*\d+:|$)",
        text, re.DOTALL | re.IGNORECASE,
    )
    if narration_match:
        narration = narration_match.group(1).strip()

    scene_blocks = re.split(r"\n\s*SCENE\s*\d+:\s*", text, flags=re.IGNORECASE)
    # scene_blocks[0] la phan truoc SCENE 1 (NARRATION), bo di
    if len(scene_blocks) > 1:
        scenes = [s.strip() for s in scene_blocks[1:] if s.strip()]

    # Fallback neu parse fail
    if not narration:
        narration = text if text else f"Bài học {title}. {theory[:300]}"
    if not scenes:
        scenes = [f"Công nhân {occupation} đang thực hiện quy trình an toàn lao động tại công trường Việt Nam."]

    return {"narration": narration, "scenes": scenes}


# ===========================================================================
# OpenAI TTS
# ===========================================================================

async def _generate_tts_audio(narration_text: str, output_path: str) -> None:
    client = get_openai_client()
    response = await client.audio.speech.create(
        model="tts-1",
        voice="nova",
        input=narration_text,
        speed=0.95,
    )
    with open(output_path, "wb") as f:
        for chunk in response.iter_bytes():
            f.write(chunk)
    logger.info(f"TTS audio saved: {output_path}")


async def _get_audio_duration(audio_path: str) -> float:
    """Dung ffprobe lay thoi luong audio (giay)."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audio_path,
    ]
    proc = await asyncio.to_thread(
        subprocess.run, cmd, capture_output=True, text=True, timeout=10,
    )
    return float(proc.stdout.strip())


# ===========================================================================
# Kling: sinh nhieu doan video song song
# ===========================================================================

def _build_video_prompt(scene_description: str) -> str:
    """
    Scene description da la English chi tiet bam sat bai hoc (tu GPT).
    Chi them hau to cinematic quality de Kling render dep hon.
    """
    safe_scene = _sanitize_text(scene_description)
    return (
        f"{safe_scene} "
        f"Cinematic quality, realistic lighting, professional workplace safety training footage, "
        f"4K resolution, smooth camera movement, documentary style."
    )


async def _submit_video_task(
    prompt: str,
    model_name: str = "kling-v3",
    duration: str = "5",
    mode: str = "std",
    aspect_ratio: str = "16:9",
) -> str:
    headers = _get_kling_headers()
    payload = {
        "model_name": model_name,
        "prompt": prompt,
        "negative_prompt": "blurry, distortion, text, watermark, low quality",
        "duration": duration,
        "mode": mode,
        "aspect_ratio": aspect_ratio,
        "sound": "off",
    }
    logger.info(f"Kling payload: {payload}")

    async with httpx.AsyncClient() as client:
        resp = await client.post(KLING_TEXT2VIDEO_URL, json=payload, headers=headers, timeout=30.0)
        logger.info(f"Kling submit: status={resp.status_code}, body={resp.text}")
        if resp.status_code != 200:
            raise ValueError(f"Kling API error {resp.status_code}: {resp.text}")
        data = resp.json()

    task_id = data.get("data", {}).get("task_id")
    if not task_id:
        raise ValueError(f"Kling API no task_id: {data}")
    logger.info(f"Video task submitted: {task_id}")
    return task_id


async def _poll_video_result(task_id: str) -> str:
    status_url = f"{KLING_TEXT2VIDEO_URL}/{task_id}"
    for attempt in range(POLL_MAX_ATTEMPTS):
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
        headers = _get_kling_headers()
        async with httpx.AsyncClient() as client:
            resp = await client.get(status_url, headers=headers, timeout=30.0)
            resp.raise_for_status()
            data = resp.json()
        task_status = data.get("data", {}).get("task_status")
        logger.info(f"Poll {attempt + 1}: status={task_status}")
        if task_status == "succeed":
            videos = data.get("data", {}).get("task_result", {}).get("videos", [])
            if videos and videos[0].get("url"):
                return videos[0]["url"]
            raise ValueError(f"Video done but no URL: {data}")
        if task_status == "failed":
            reason = data.get("data", {}).get("task_status_msg", "unknown")
            raise ValueError(f"Kling failed: {reason}")
    raise TimeoutError(f"Video generation timeout ({POLL_MAX_ATTEMPTS * POLL_INTERVAL_SECONDS}s)")


async def _download_video(video_url: str, output_path: str) -> None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(video_url, timeout=120.0, follow_redirects=True)
        resp.raise_for_status()
        with open(output_path, "wb") as f:
            f.write(resp.content)


async def _generate_one_segment(
    scene: str, idx: int, model_name: str, segment_duration: str,
    mode: str, aspect_ratio: str, videos_dir: str, uid: str,
) -> str:
    """Sinh 1 doan video bang text2video. Tra ve duong dan file."""
    prompt = _build_video_prompt(scene)
    task_id = await _submit_video_task(prompt, model_name, segment_duration, mode, aspect_ratio)
    video_url = await _poll_video_result(task_id)
    seg_path = os.path.join(videos_dir, f"seg_{uid}_{idx}.mp4")
    await _download_video(video_url, seg_path)
    return seg_path


# ===========================================================================
# ffmpeg: noi video + ghep audio
# ===========================================================================

async def _concat_videos(segment_paths: list[str], output_path: str) -> None:
    """Noi nhieu doan video thanh 1 file duy nhat bang ffmpeg concat demuxer."""
    list_file = output_path + ".txt"
    with open(list_file, "w", encoding="utf-8") as f:
        for p in segment_paths:
            # ffmpeg concat resolve path theo vi tri list file -> dung absolute path
            abs_path = os.path.abspath(p).replace("\\", "/")
            f.write(f"file '{abs_path}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", list_file,
        "-c", "copy",
        output_path,
    ]
    logger.info(f"ffmpeg concat: {len(segment_paths)} segments -> {output_path}")
    proc = await asyncio.to_thread(
        subprocess.run, cmd, capture_output=True, text=True, timeout=120,
    )
    os.remove(list_file)
    if proc.returncode != 0:
        logger.error(f"ffmpeg concat error: {proc.stderr}")
        raise RuntimeError(f"ffmpeg concat failed: {proc.stderr[:300]}")


async def _merge_video_audio(video_path: str, audio_path: str, output_path: str) -> None:
    """
    Ghep video + audio, uu tien giu thoi luong video:
    - Neu audio dai hon video: audio se bi cat.
    - Neu audio ngan hon video: audio se duoc padding silent de khop video.
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "aac",
        "-map", "0:v:0",
        "-map", "1:a:0",
        # Padding audio neu ngan hon video, tu dong cat neu dai hon
        "-af", "apad",
        "-t", "0",  # se ghi de boi video duration
        "-fflags", "+shortest",
        "-max_interleave_delta", "100M",
        output_path,
    ]
    # Chuan hoa audio ve 44.1kHz stereo AAC 128kbps de tuong thich moi player
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-i", audio_path,
        "-filter_complex", "[1:a]apad,aresample=44100[aout]",
        "-map", "0:v:0",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ac", "2",
        "-shortest",
        output_path,
    ]
    logger.info(f"ffmpeg merge video+audio")
    proc = await asyncio.to_thread(
        subprocess.run, cmd, capture_output=True, text=True, timeout=120,
    )
    if proc.returncode != 0:
        logger.error(f"ffmpeg merge error: {proc.stderr}")
        raise RuntimeError(f"ffmpeg merge failed: {proc.stderr[:300]}")
    logger.info(f"Final video: {output_path}")


# ===========================================================================
# Main: generate_lesson_video
# ===========================================================================

async def _tracked_segment(
    scene: str, idx: int, model_name: str, segment_duration: str,
    mode: str, aspect_ratio: str, videos_dir: str, uid: str,
    queue: asyncio.Queue, lesson_order: int,
) -> str:
    """Wrapper quanh _generate_one_segment, push progress events vao queue."""
    await queue.put({
        "type": "progress",
        "step": "video_submit",
        "segment": idx + 1,
        "message": f"Bài {lesson_order}: đang submit video đoạn {idx + 1}...",
    })
    try:
        seg_path = await _generate_one_segment(
            scene=scene, idx=idx, model_name=model_name,
            segment_duration=segment_duration, mode=mode,
            aspect_ratio=aspect_ratio, videos_dir=videos_dir, uid=uid,
        )
        await queue.put({
            "type": "progress",
            "step": "video_done",
            "segment": idx + 1,
            "message": f"Bài {lesson_order}: xong video đoạn {idx + 1}",
        })
        return seg_path
    except Exception as e:
        await queue.put({
            "type": "progress",
            "step": "video_error",
            "segment": idx + 1,
            "message": f"Bài {lesson_order}: lỗi video đoạn {idx + 1}: {e}",
        })
        raise


async def generate_lesson_video_stream(
    course_id: str,
    lesson_order: int,
    model_name: str = "kling-v1",
    duration: str = "10",
    mode: str = "std",
    aspect_ratio: str = "16:9",
    sound: bool = False,
    num_segments: int = 3,
):
    """
    Async generator: yield progress events va ket qua cuoi cung.
    Events: {"type": "progress"|"done"|"error", ...}
    """
    yield {"type": "progress", "step": "init", "message": f"Bài {lesson_order}: khởi tạo..."}

    course = await Course.get(course_id)
    if not course:
        yield {"type": "error", "message": "Không tìm thấy khóa học"}
        return

    lesson = None
    lesson_idx = None
    for i, l in enumerate(course.lessons):
        if l.order == lesson_order:
            lesson = l
            lesson_idx = i
            break
    if lesson is None:
        yield {"type": "error", "message": f"Không tìm thấy bài học thứ {lesson_order}"}
        return

    uid = uuid.uuid4().hex[:8]
    videos_dir = _get_videos_dir()
    segment_duration = duration
    seg_sec = int(segment_duration)
    total_seconds = num_segments * seg_sec

    # --- Buoc 1: GPT sinh thuyet minh + canh quay ---
    yield {
        "type": "progress", "step": "narration",
        "message": f"Bài {lesson_order}: đang viết lời thuyết minh và kịch bản cảnh quay...",
    }
    result = await _generate_narration_and_scenes(
        title=lesson.title, theory=lesson.theory, occupation=course.occupation,
        total_seconds=total_seconds, num_segments=num_segments,
    )
    narration = result["narration"]
    scenes = result["scenes"]
    if not narration:
        narration = f"Bài học {lesson.title}. {lesson.theory[:500] if lesson.theory else ''}"
    while len(scenes) < num_segments:
        scenes.append(scenes[-1] if scenes else "Công nhân đang làm việc an toàn tại công trường")
    scenes = scenes[:num_segments]
    yield {
        "type": "progress", "step": "narration_done",
        "message": f"Bài {lesson_order}: thuyết minh {len(narration)} ký tự, {len(scenes)} cảnh quay",
    }

    # --- Buoc 2: TTS sinh audio ---
    yield {
        "type": "progress", "step": "tts",
        "message": f"Bài {lesson_order}: đang tạo giọng đọc tiếng Việt...",
    }
    audio_path = os.path.join(videos_dir, f"tts_{uid}.mp3")
    await _generate_tts_audio(narration, audio_path)
    audio_duration = await _get_audio_duration(audio_path)
    yield {
        "type": "progress", "step": "tts_done",
        "message": f"Bài {lesson_order}: audio {audio_duration:.1f}s (video {total_seconds}s)",
    }

    # --- Buoc 3: Sinh cac doan video SONG SONG + stream progress ---
    yield {
        "type": "progress", "step": "video_start",
        "message": f"Bài {lesson_order}: sinh {num_segments} đoạn video song song ({total_seconds}s)...",
    }

    queue: asyncio.Queue = asyncio.Queue()
    # asyncio.create_task() khoi chay song song, return Task objects
    tasks = [
        asyncio.create_task(_tracked_segment(
            scene=scenes[i], idx=i, model_name=model_name,
            segment_duration=segment_duration, mode=mode,
            aspect_ratio=aspect_ratio, videos_dir=videos_dir, uid=uid,
            queue=queue, lesson_order=lesson_order,
        ))
        for i in range(num_segments)
    ]

    # Poll queue cho den khi tat ca task xong
    while not all(t.done() for t in tasks):
        try:
            event = await asyncio.wait_for(queue.get(), timeout=1.0)
            yield event
        except asyncio.TimeoutError:
            continue
    # Drain remaining events
    while not queue.empty():
        yield queue.get_nowait()

    # Thu thap ket qua (neu co exception se raise)
    try:
        segment_paths = [t.result() for t in tasks]
    except Exception as e:
        yield {"type": "error", "message": f"Lỗi sinh video: {e}"}
        return

    # --- Buoc 4: Noi cac doan video ---
    yield {
        "type": "progress", "step": "concat",
        "message": f"Bài {lesson_order}: đang nối {num_segments} đoạn video...",
    }
    if len(segment_paths) == 1:
        concat_path = segment_paths[0]
    else:
        concat_path = os.path.join(videos_dir, f"concat_{uid}.mp4")
        await _concat_videos(list(segment_paths), concat_path)

    # --- Buoc 5: Ghep video + audio TTS ---
    yield {
        "type": "progress", "step": "merge",
        "message": f"Bài {lesson_order}: đang ghép video với giọng đọc...",
    }
    final_file_name = f"{course_id}_lesson{lesson_order}_{uid}.mp4"
    final_path = os.path.join(videos_dir, final_file_name)
    await _merge_video_audio(concat_path, audio_path, final_path)

    # --- Don dep file tam ---
    tmp_files = [audio_path]
    if len(segment_paths) > 1:
        tmp_files.append(concat_path)
    tmp_files.extend(segment_paths)
    for tmp in tmp_files:
        try:
            if tmp != final_path:
                os.remove(tmp)
        except OSError:
            pass

    # --- Cap nhat MongoDB ---
    local_url = f"/api/v1/videos/{final_file_name}"
    course.lessons[lesson_idx].video_url = local_url
    course.updated_at = datetime.now(timezone.utc)
    await course.save()

    yield {
        "type": "done",
        "result": {
            "lesson_order": lesson_order,
            "lesson_title": lesson.title,
            "video_url": local_url,
        },
    }


async def generate_lesson_video(
    course_id: str,
    lesson_order: int,
    model_name: str = "kling-v1",
    duration: str = "10",
    mode: str = "std",
    aspect_ratio: str = "16:9",
    sound: bool = False,
    num_segments: int = 3,
) -> dict:
    """Wrapper non-streaming: chay stream version, chi lay result cuoi."""
    final_result = None
    async for event in generate_lesson_video_stream(
        course_id, lesson_order, model_name, duration, mode, aspect_ratio, sound, num_segments,
    ):
        if event["type"] == "done":
            final_result = event["result"]
        elif event["type"] == "error":
            raise ValueError(event["message"])
    if final_result is None:
        raise RuntimeError("Video generation completed without result")
    return final_result


async def generate_all_lesson_videos_stream(
    course_id: str,
    model_name: str = "kling-v1",
    duration: str = "10",
    mode: str = "std",
    aspect_ratio: str = "16:9",
    sound: bool = False,
    num_segments: int = 3,
):
    """Async generator cho tat ca bai hoc, yield progress events."""
    course = await Course.get(course_id)
    if not course:
        yield {"type": "error", "message": "Không tìm thấy khóa học"}
        return
    if not course.lessons:
        yield {"type": "error", "message": "Khóa học không có bài học nào"}
        return

    total = len(course.lessons)
    results = []
    generated = 0

    yield {
        "type": "progress", "step": "batch_start",
        "message": f"Bắt đầu sinh video cho {total} bài học",
    }

    for lesson in course.lessons:
        yield {
            "type": "progress", "step": "lesson_start",
            "lesson_order": lesson.order,
            "message": f"=== Bài {lesson.order}/{total}: {lesson.title} ===",
        }
        try:
            final = None
            async for event in generate_lesson_video_stream(
                course_id, lesson.order, model_name, duration, mode, aspect_ratio, sound, num_segments,
            ):
                if event["type"] == "done":
                    final = event["result"]
                elif event["type"] == "error":
                    raise ValueError(event["message"])
                else:
                    yield event
            if final:
                results.append(final)
                generated += 1
        except Exception as e:
            logger.error(f"Error video lesson {lesson.order}: {e}")
            results.append({
                "lesson_order": lesson.order,
                "lesson_title": lesson.title,
                "video_url": None,
                "error": str(e),
            })
            yield {
                "type": "progress", "step": "lesson_error",
                "lesson_order": lesson.order,
                "message": f"Lỗi bài {lesson.order}: {e}",
            }

    yield {
        "type": "done",
        "result": {
            "course_id": course_id,
            "course_title": course.title,
            "total": total,
            "generated": generated,
            "results": results,
        },
    }


async def generate_all_lesson_videos(
    course_id: str,
    model_name: str = "kling-v1",
    duration: str = "10",
    mode: str = "std",
    aspect_ratio: str = "16:9",
    sound: bool = False,
    num_segments: int = 3,
) -> dict:
    course = await Course.get(course_id)
    if not course:
        raise ValueError("Không tìm thấy khóa học")
    if not course.lessons:
        raise ValueError("Khóa học không có bài học nào")

    results = []
    generated = 0
    for lesson in course.lessons:
        try:
            result = await generate_lesson_video(
                course_id, lesson.order, model_name, duration, mode, aspect_ratio, sound, num_segments,
            )
            results.append(result)
            generated += 1
        except Exception as e:
            logger.error(f"Error video lesson {lesson.order}: {e}")
            results.append({
                "lesson_order": lesson.order,
                "lesson_title": lesson.title,
                "video_url": None,
                "error": str(e),
            })

    return {
        "course_id": course_id,
        "course_title": course.title,
        "total": len(course.lessons),
        "generated": generated,
        "results": results,
    }
