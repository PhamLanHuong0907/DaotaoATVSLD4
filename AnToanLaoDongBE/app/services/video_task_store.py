"""
In-memory store cho video generation tasks chay nen.
Moi task co trang thai: pending | running | done | error
FE poll GET /video-tasks/{task_id} de biet tien do.
"""
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# Task store: {task_id: {...}}
_tasks: dict[str, dict[str, Any]] = {}
_lock = asyncio.Lock()


def create_task() -> str:
    """Tao task_id moi va khoi tao state."""
    task_id = uuid.uuid4().hex
    _tasks[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "progress": [],           # list[str] - lich su log
        "current_step": "Đang khởi tạo...",
        "result": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    return task_id


def get_task(task_id: str) -> dict | None:
    return _tasks.get(task_id)


def append_progress(task_id: str, message: str, step: str | None = None) -> None:
    task = _tasks.get(task_id)
    if not task:
        return
    task["progress"].append(message)
    # Chi giu 50 dong log gan nhat
    task["progress"] = task["progress"][-50:]
    task["current_step"] = message
    task["updated_at"] = datetime.now(timezone.utc).isoformat()
    if step:
        task["step"] = step


def set_status(task_id: str, status: str) -> None:
    task = _tasks.get(task_id)
    if task:
        task["status"] = status
        task["updated_at"] = datetime.now(timezone.utc).isoformat()


def set_result(task_id: str, result: Any) -> None:
    task = _tasks.get(task_id)
    if task:
        task["result"] = result
        task["status"] = "done"
        task["current_step"] = "Hoàn tất"
        task["updated_at"] = datetime.now(timezone.utc).isoformat()


def set_error(task_id: str, error: str) -> None:
    task = _tasks.get(task_id)
    if task:
        task["error"] = error
        task["status"] = "error"
        task["current_step"] = f"Lỗi: {error}"
        task["updated_at"] = datetime.now(timezone.utc).isoformat()


def cleanup_old_tasks(max_age_hours: int = 2) -> None:
    """Don dep task cu hon max_age_hours."""
    now = datetime.now(timezone.utc)
    to_delete = []
    for tid, task in _tasks.items():
        try:
            updated = datetime.fromisoformat(task["updated_at"])
            if (now - updated).total_seconds() > max_age_hours * 3600:
                to_delete.append(tid)
        except Exception:
            pass
    for tid in to_delete:
        del _tasks[tid]
    if to_delete:
        logger.info(f"Cleaned up {len(to_delete)} old video tasks")


async def run_video_task(task_id: str, video_stream_generator):
    """
    Chay async generator sinh video trong background.
    Day progress events vao task state qua append_progress.
    """
    set_status(task_id, "running")
    try:
        async for event in video_stream_generator:
            etype = event.get("type")
            msg = event.get("message", "")
            if etype == "progress" and msg:
                append_progress(task_id, msg, event.get("step"))
            elif etype == "done":
                set_result(task_id, event.get("result"))
                return
            elif etype == "error":
                set_error(task_id, msg or "Lỗi không xác định")
                return
    except Exception as e:
        logger.exception(f"Video task {task_id} failed")
        set_error(task_id, str(e))
