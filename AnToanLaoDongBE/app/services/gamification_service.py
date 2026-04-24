"""Award points + badges for worker actions."""
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.models.gamification import BadgeAward, PointEvent, UserScore
from app.models.user import User


# Catalog of badges that the system knows how to award
BADGE_CATALOG = {
    "first_login": {
        "title": "Khởi đầu",
        "description": "Đăng nhập lần đầu vào hệ thống",
        "icon": "Login",
    },
    "first_lesson_complete": {
        "title": "Bước đầu học tập",
        "description": "Hoàn thành bài học đầu tiên",
        "icon": "MenuBook",
    },
    "course_complete": {
        "title": "Hoàn thành khoá học",
        "description": "Hoàn thành một khoá học đầy đủ",
        "icon": "School",
    },
    "first_pass": {
        "title": "Vượt qua kỳ thi",
        "description": "Đạt kỳ thi đầu tiên",
        "icon": "EmojiEvents",
    },
    "excellent": {
        "title": "Xuất sắc",
        "description": "Đạt loại xuất sắc trong kỳ thi",
        "icon": "Star",
    },
    "perfect_score": {
        "title": "Điểm tuyệt đối",
        "description": "Đạt 10/10 trong một kỳ thi",
        "icon": "WorkspacePremium",
    },
    "streak_5": {
        "title": "Chuyên cần",
        "description": "Hoàn thành 5 khoá học",
        "icon": "Whatshot",
    },
}


# Default points for common reasons
POINTS_FOR = {
    "lesson_complete": 5,
    "course_complete": 30,
    "exam_pass": 50,
    "exam_excellent": 80,
    "exam_perfect": 100,
    "practical_pass": 60,
    "first_login": 10,
}


async def _get_or_create(user_id: str) -> UserScore:
    score = await UserScore.find_one(UserScore.user_id == user_id)
    if score:
        return score
    user = None
    try:
        user = await User.get(PydanticObjectId(user_id))
    except Exception:
        pass
    score = UserScore(
        user_id=user_id,
        employee_id=user.employee_id if user else "",
        full_name=user.full_name if user else "",
        department_id=user.department_id if user else None,
    )
    await score.insert()
    return score


async def award_points(
    user_id: str,
    reason: str,
    points: int,
    note: Optional[str] = None,
) -> UserScore:
    score = await _get_or_create(user_id)
    score.total_points += points
    score.level = 1 + score.total_points // 100
    score.history.append(PointEvent(reason=reason, points=points, note=note))
    score.updated_at = datetime.now(timezone.utc)
    await score.save()
    return score


async def award_badge(user_id: str, badge_code: str) -> UserScore:
    score = await _get_or_create(user_id)
    # Idempotent: skip if already awarded
    if any(b.code == badge_code for b in score.badges):
        return score
    info = BADGE_CATALOG.get(badge_code)
    if not info:
        return score
    score.badges.append(BadgeAward(
        code=badge_code,
        title=info["title"],
        description=info["description"],
        icon=info.get("icon", "EmojiEvents"),
    ))
    score.updated_at = datetime.now(timezone.utc)
    await score.save()
    return score


async def on_exam_passed(user_id: str, score_value: float, classification: str) -> None:
    """Hook called by exam_service after a passing submission."""
    try:
        # Points
        if score_value >= 9.99:
            await award_points(user_id, "exam_perfect", POINTS_FOR["exam_perfect"])
            await award_badge(user_id, "perfect_score")
        elif classification == "excellent":
            await award_points(user_id, "exam_excellent", POINTS_FOR["exam_excellent"])
            await award_badge(user_id, "excellent")
        else:
            await award_points(user_id, "exam_pass", POINTS_FOR["exam_pass"])

        # First-pass badge
        await award_badge(user_id, "first_pass")
    except Exception:
        pass


async def on_lesson_completed(user_id: str) -> None:
    try:
        await award_points(user_id, "lesson_complete", POINTS_FOR["lesson_complete"])
        await award_badge(user_id, "first_lesson_complete")
    except Exception:
        pass


async def on_course_completed(user_id: str, courses_completed: int) -> None:
    try:
        await award_points(user_id, "course_complete", POINTS_FOR["course_complete"])
        await award_badge(user_id, "course_complete")
        if courses_completed >= 5:
            await award_badge(user_id, "streak_5")
    except Exception:
        pass


async def get_user_score(user_id: str) -> Optional[UserScore]:
    return await UserScore.find_one(UserScore.user_id == user_id)


async def get_leaderboard(department_id: Optional[str] = None, limit: int = 20) -> list[UserScore]:
    query: dict = {}
    if department_id:
        query["department_id"] = department_id
    return await UserScore.find(query).sort("-total_points").limit(limit).to_list()
