import asyncio
import json
import math
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.models.course import Course

from app.api.deps import get_current_user
from app.models.enums import TrainingGroup, ApprovalStatus
from app.models.user import User
from app.schemas.course_schemas import (
    CourseCreate, CourseAIGenerate, CourseUpdate, CourseResponse, CourseListResponse,
)
from app.schemas.common import StatusResponse, StatusUpdateRequest
from app.utils.pagination import PaginatedResponse
from app.services import course_service
from app.services import image_service
from app.services import video_service
from app.services import video_task_store


class ImageGenConfig(BaseModel):
    model: str = "dall-e-3"
    size: str = "1024x1024"
    quality: str = "standard"


class VideoGenConfig(BaseModel):
    model_name: str = "kling-v1"
    duration: str = "10"
    mode: str = "std"
    aspect_ratio: str = "16:9"
    sound: bool = False
    num_segments: int = 3

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.post("", response_model=CourseResponse)
async def create_course(data: CourseCreate):
    course = await course_service.create_course(data)
    return CourseResponse(
        id=str(course.id),
        lesson_count=len(course.lessons),
        **course.model_dump(exclude={"id"}),
    )


@router.post("/ai-generate", response_model=CourseResponse)
async def ai_generate_course(data: CourseAIGenerate):
    """AI generates a course from approved training documents. Created as DRAFT."""
    try:
        course = await course_service.ai_generate_course(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return CourseResponse(
        id=str(course.id),
        **course.model_dump(exclude={"id"}),
    )


@router.get("", response_model=PaginatedResponse[CourseListResponse])
async def list_courses(
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    training_group: Optional[TrainingGroup] = None,
    status: Optional[ApprovalStatus] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    skip = (page - 1) * page_size
    courses, total = await course_service.get_courses(
        occupation=occupation, skill_level=skill_level,
        training_group=training_group, status=status,
        skip=skip, limit=page_size,
    )
    return PaginatedResponse(
        items=[
            CourseListResponse(
                id=str(c.id),
                title=c.title,
                occupation=c.occupation,
                skill_level=c.skill_level,
                training_group=c.training_group,
                lesson_count=len(c.lessons),
                ai_generated=c.ai_generated,
                status=c.status,
                assigned_department_ids=c.assigned_department_ids,
                is_mandatory=c.is_mandatory,
                created_at=c.created_at,
            )
            for c in courses
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/my-courses", response_model=list[CourseListResponse])
async def list_my_courses(
    only_mandatory: bool = False,
    user: User = Depends(get_current_user),
):
    """Return APPROVED courses available to the current user (filtered by department/occupation/skill)."""
    courses = await course_service.get_courses_for_user(
        department_id=user.department_id,
        occupation=user.occupation,
        skill_level=user.skill_level,
        only_mandatory=only_mandatory,
    )
    return [
        CourseListResponse(
            id=str(c.id),
            title=c.title,
            occupation=c.occupation,
            skill_level=c.skill_level,
            training_group=c.training_group,
            lesson_count=len(c.lessons),
            ai_generated=c.ai_generated,
            status=c.status,
            assigned_department_ids=c.assigned_department_ids,
            is_mandatory=c.is_mandatory,
            created_at=c.created_at,
        )
        for c in courses
    ]


@router.post("/{course_id}/generate-images")
async def generate_all_images(course_id: str, config: Optional[ImageGenConfig] = None):
    cfg = config or ImageGenConfig()
    try:
        result = await image_service.generate_all_lesson_images(course_id, cfg.model, cfg.size, cfg.quality)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.post("/{course_id}/lessons/{lesson_order}/generate-image")
async def generate_lesson_image(course_id: str, lesson_order: int, config: Optional[ImageGenConfig] = None):
    cfg = config or ImageGenConfig()
    try:
        result = await image_service.generate_lesson_image(course_id, lesson_order, cfg.model, cfg.size, cfg.quality)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


# ===== Upload ảnh/video thủ công cho bài học =====

IMAGES_DIR = "./uploads/images"
VIDEOS_DIR = "./uploads/videos"

_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
_VIDEO_EXTS = {".mp4", ".webm", ".mov", ".mkv"}
_MAX_IMAGE_BYTES = 10 * 1024 * 1024     # 10 MB
_MAX_VIDEO_BYTES = 300 * 1024 * 1024    # 300 MB


async def _save_upload(
    file: UploadFile, target_dir: str, prefix: str,
    allowed_exts: set[str], max_bytes: int,
) -> str:
    """Lưu file tải lên vào `target_dir`. Trả về tên file đã lưu."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(400, f"Định dạng không hỗ trợ: {ext}. Chấp nhận: {', '.join(sorted(allowed_exts))}")
    os.makedirs(target_dir, exist_ok=True)
    file_name = f"{prefix}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(target_dir, file_name)
    size = 0
    with open(file_path, "wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > max_bytes:
                out.close()
                try:
                    os.remove(file_path)
                except OSError:
                    pass
                limit_mb = max_bytes // (1024 * 1024)
                raise HTTPException(413, f"File vượt quá {limit_mb} MB")
            out.write(chunk)
    return file_name


async def _get_course_and_lesson_idx(course_id: str, lesson_order: int) -> tuple[Course, int]:
    try:
        course = await Course.get(PydanticObjectId(course_id))
    except Exception:
        course = None
    if not course:
        raise HTTPException(404, "Không tìm thấy khóa học")
    idx = next((i for i, l in enumerate(course.lessons) if l.order == lesson_order), -1)
    if idx < 0:
        raise HTTPException(404, f"Không tìm thấy bài học #{lesson_order}")
    return course, idx


@router.post("/{course_id}/lessons/{lesson_order}/upload-image")
async def upload_lesson_image(course_id: str, lesson_order: int, file: UploadFile = File(...)):
    """Tải lên ảnh minh họa cho 1 bài học (thay cho sinh ảnh bằng AI)."""
    course, idx = await _get_course_and_lesson_idx(course_id, lesson_order)
    file_name = await _save_upload(
        file, IMAGES_DIR, f"{course_id}_lesson{lesson_order}",
        _IMAGE_EXTS, _MAX_IMAGE_BYTES,
    )
    local_url = f"/api/v1/images/{file_name}"
    course.lessons[idx].image_url = local_url
    course.updated_at = datetime.now(timezone.utc)
    await course.save()
    return {
        "lesson_order": lesson_order,
        "lesson_title": course.lessons[idx].title,
        "image_url": local_url,
    }


@router.post("/{course_id}/lessons/{lesson_order}/upload-video")
async def upload_lesson_video(course_id: str, lesson_order: int, file: UploadFile = File(...)):
    """Tải lên video minh họa cho 1 bài học (thay cho sinh video bằng AI)."""
    course, idx = await _get_course_and_lesson_idx(course_id, lesson_order)
    file_name = await _save_upload(
        file, VIDEOS_DIR, f"{course_id}_lesson{lesson_order}",
        _VIDEO_EXTS, _MAX_VIDEO_BYTES,
    )
    local_url = f"/api/v1/videos/{file_name}"
    course.lessons[idx].video_url = local_url
    course.updated_at = datetime.now(timezone.utc)
    await course.save()
    return {
        "lesson_order": lesson_order,
        "lesson_title": course.lessons[idx].title,
        "video_url": local_url,
    }


@router.delete("/{course_id}/lessons/{lesson_order}/media")
async def clear_lesson_media(
    course_id: str, lesson_order: int,
    kind: str = Query(..., pattern="^(image|video)$"),
):
    """Xoá ảnh hoặc video của bài học (không xoá file trên disk — chỉ gỡ URL khỏi bài)."""
    course, idx = await _get_course_and_lesson_idx(course_id, lesson_order)
    if kind == "image":
        course.lessons[idx].image_url = None
    else:
        course.lessons[idx].video_url = None
    course.updated_at = datetime.now(timezone.utc)
    await course.save()
    return {"success": True, "lesson_order": lesson_order, "kind": kind}


@router.post("/{course_id}/generate-videos")
async def generate_all_videos(course_id: str, config: Optional[VideoGenConfig] = None):
    cfg = config or VideoGenConfig()
    try:
        result = await video_service.generate_all_lesson_videos(
            course_id, cfg.model_name, cfg.duration, cfg.mode, cfg.aspect_ratio, cfg.sound, cfg.num_segments,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.post("/{course_id}/lessons/{lesson_order}/generate-video")
async def generate_lesson_video(course_id: str, lesson_order: int, config: Optional[VideoGenConfig] = None):
    cfg = config or VideoGenConfig()
    try:
        result = await video_service.generate_lesson_video(
            course_id, lesson_order, cfg.model_name, cfg.duration, cfg.mode, cfg.aspect_ratio, cfg.sound, cfg.num_segments,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


async def _sse_wrap(generator):
    """Bao async generator thanh SSE stream."""
    try:
        async for event in generator:
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
    except Exception as e:
        err = {"type": "error", "message": str(e)}
        yield f"data: {json.dumps(err, ensure_ascii=False)}\n\n"


@router.post("/{course_id}/lessons/{lesson_order}/generate-video-stream")
async def generate_lesson_video_stream(
    course_id: str, lesson_order: int, config: Optional[VideoGenConfig] = None,
):
    """SSE streaming endpoint: tra ve progress events real-time."""
    cfg = config or VideoGenConfig()
    gen = video_service.generate_lesson_video_stream(
        course_id, lesson_order, cfg.model_name, cfg.duration, cfg.mode,
        cfg.aspect_ratio, cfg.sound, cfg.num_segments,
    )
    return StreamingResponse(
        _sse_wrap(gen),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/{course_id}/generate-videos-stream")
async def generate_all_videos_stream(
    course_id: str, config: Optional[VideoGenConfig] = None,
):
    """SSE streaming endpoint cho batch sinh video tat ca bai hoc."""
    cfg = config or VideoGenConfig()
    gen = video_service.generate_all_lesson_videos_stream(
        course_id, cfg.model_name, cfg.duration, cfg.mode,
        cfg.aspect_ratio, cfg.sound, cfg.num_segments,
    )
    return StreamingResponse(
        _sse_wrap(gen),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ===========================================================================
# Background task + polling approach (on dinh hon SSE)
# ===========================================================================


@router.post("/{course_id}/lessons/{lesson_order}/generate-video-start")
async def start_lesson_video_task(
    course_id: str, lesson_order: int, config: Optional[VideoGenConfig] = None,
):
    """Bat dau task sinh video nen, tra ve task_id ngay de FE polling."""
    cfg = config or VideoGenConfig()
    video_task_store.cleanup_old_tasks()
    task_id = video_task_store.create_task()

    gen = video_service.generate_lesson_video_stream(
        course_id, lesson_order, cfg.model_name, cfg.duration, cfg.mode,
        cfg.aspect_ratio, cfg.sound, cfg.num_segments,
    )
    asyncio.create_task(video_task_store.run_video_task(task_id, gen))
    return {"task_id": task_id, "status": "pending"}


@router.post("/{course_id}/generate-videos-start")
async def start_all_videos_task(
    course_id: str, config: Optional[VideoGenConfig] = None,
):
    """Bat dau task sinh video cho tat ca bai hoc, tra ve task_id ngay."""
    cfg = config or VideoGenConfig()
    video_task_store.cleanup_old_tasks()
    task_id = video_task_store.create_task()

    gen = video_service.generate_all_lesson_videos_stream(
        course_id, cfg.model_name, cfg.duration, cfg.mode,
        cfg.aspect_ratio, cfg.sound, cfg.num_segments,
    )
    asyncio.create_task(video_task_store.run_video_task(task_id, gen))
    return {"task_id": task_id, "status": "pending"}


@router.get("/video-tasks/{task_id}")
async def get_video_task_status(task_id: str):
    """FE poll endpoint nay de lay trang thai task."""
    task = video_task_store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or expired")
    return task


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str):
    course = await course_service.get_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseResponse(id=str(course.id), **course.model_dump(exclude={"id"}))


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(course_id: str, data: CourseUpdate):
    course = await course_service.update_course(course_id, data)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseResponse(id=str(course.id), **course.model_dump(exclude={"id"}))


@router.patch("/{course_id}/status", response_model=CourseResponse)
async def update_course_status(course_id: str, data: StatusUpdateRequest):
    try:
        status = ApprovalStatus(data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")
    course = await course_service.update_course_status(
        course_id, status, data.reviewed_by, data.review_notes,
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseResponse(id=str(course.id), **course.model_dump(exclude={"id"}))


@router.delete("/{course_id}", response_model=StatusResponse)
async def delete_course(course_id: str):
    success = await course_service.delete_course(course_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course not found")
    return StatusResponse(success=True, message="Course deleted")
