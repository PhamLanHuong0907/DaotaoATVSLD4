"""Practice mode — random approved questions, instant feedback, no submission record.

For self-study. Does NOT affect pass rate or generate certificates.
"""
import random
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.enums import ApprovalStatus, DifficultyLevel, QuestionType, TrainingGroup
from app.models.question import Question
from app.models.user import User

router = APIRouter(prefix="/practice", tags=["Practice"])


class PracticeOption(BaseModel):
    label: str
    text: str


class PracticeQuestion(BaseModel):
    question_id: str
    content: str
    question_type: QuestionType
    difficulty: DifficultyLevel
    options: list[PracticeOption] = []  # answer hidden


class PracticeSession(BaseModel):
    questions: list[PracticeQuestion]
    total: int


class CheckRequest(BaseModel):
    question_id: str
    selected_label: Optional[str] = None         # for multiple_choice
    selected_bool: Optional[bool] = None         # for true_false
    text_answer: Optional[str] = None            # for scenario


class CheckResult(BaseModel):
    question_id: str
    is_correct: bool
    correct_answer: str       # human-friendly
    explanation: Optional[str] = None


@router.get("/start", response_model=PracticeSession)
async def start_practice(
    count: int = 10,
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    training_group: Optional[TrainingGroup] = None,
    difficulty: Optional[DifficultyLevel] = None,
    user: User = Depends(get_current_user),
):
    """Start a practice session: returns N random APPROVED questions matching filters.

    Behavior:
      - Filters passed via query string are applied as-is.
      - For workers, occupation/skill_level default to the user's profile.
      - If the strict query returns nothing, progressively drop filters
        (skill_level → occupation → difficulty/group) until something matches,
        ending with "any approved question".
    """
    if count < 1 or count > 50:
        raise HTTPException(status_code=400, detail="count must be 1-50")

    is_worker = (user.role.value if hasattr(user.role, "value") else str(user.role)) == "worker"

    # IMPORTANT: use enum .value here. Beanie's raw dict find does NOT
    # auto-convert Python enums into their stored string form.
    base: dict = {"status": ApprovalStatus.APPROVED.value}
    if difficulty:
        base["difficulty"] = difficulty.value
    if training_group:
        base["training_group"] = training_group.value

    occ = occupation if occupation is not None else (user.occupation if is_worker else None)
    sl = skill_level if skill_level is not None else (user.skill_level if is_worker else None)

    # Build progressive fallback chain
    strict = dict(base)
    if occ:
        strict["occupation"] = occ
    if sl is not None:
        strict["skill_level"] = sl

    attempts: list[dict] = [strict]
    if "skill_level" in strict:
        without_level = dict(strict)
        without_level.pop("skill_level")
        attempts.append(without_level)
    if "occupation" in strict:
        without_occ = dict(strict)
        without_occ.pop("occupation", None)
        without_occ.pop("skill_level", None)
        attempts.append(without_occ)
    attempts.append(base)
    attempts.append({"status": ApprovalStatus.APPROVED.value})

    pool: list[Question] = []
    for q_dict in attempts:
        pool = await Question.find(q_dict).to_list()
        if pool:
            break

    if not pool:
        raise HTTPException(
            status_code=404,
            detail="Chưa có câu hỏi nào được phê duyệt trong ngân hàng. Vui lòng liên hệ cán bộ đào tạo.",
        )

    chosen = random.sample(pool, min(count, len(pool)))

    questions = []
    for q in chosen:
        # Shuffle options for MCQ to make practice fairer
        opts = []
        if q.question_type == QuestionType.MULTIPLE_CHOICE:
            shuffled = q.options.copy()
            random.shuffle(shuffled)
            opts = [PracticeOption(label=o.label, text=o.text) for o in shuffled]
        questions.append(PracticeQuestion(
            question_id=str(q.id),
            content=q.content,
            question_type=q.question_type,
            difficulty=q.difficulty,
            options=opts,
        ))

    return PracticeSession(questions=questions, total=len(questions))


@router.post("/check", response_model=CheckResult)
async def check_answer(
    data: CheckRequest,
    _: User = Depends(get_current_user),
):
    """Check a single answer immediately. Returns correctness + explanation."""
    from beanie import PydanticObjectId
    try:
        q = await Question.get(PydanticObjectId(data.question_id))
    except Exception:
        q = None
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    is_correct = False
    correct_answer = ""

    if q.question_type == QuestionType.MULTIPLE_CHOICE:
        correct = next((o for o in q.options if o.is_correct), None)
        if correct:
            correct_answer = f"{correct.label}. {correct.text}"
            if data.selected_label and data.selected_label.strip().upper() == correct.label.strip().upper():
                is_correct = True
    elif q.question_type == QuestionType.TRUE_FALSE:
        correct_answer = "Đúng" if q.correct_answer_bool else "Sai"
        if data.selected_bool is not None:
            is_correct = data.selected_bool == q.correct_answer_bool
    elif q.question_type == QuestionType.SCENARIO_BASED:
        correct_answer = " | ".join(q.expected_key_points) if q.expected_key_points else ""
        if data.text_answer and q.expected_key_points:
            text = data.text_answer.lower()
            matched = sum(1 for kp in q.expected_key_points if kp.lower() in text)
            is_correct = matched >= max(1, len(q.expected_key_points) // 2)

    return CheckResult(
        question_id=str(q.id),
        is_correct=is_correct,
        correct_answer=correct_answer,
        explanation=q.explanation,
    )
