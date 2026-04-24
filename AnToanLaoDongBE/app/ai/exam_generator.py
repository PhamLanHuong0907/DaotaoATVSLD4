import random
import logging
from typing import Optional

from beanie import PydanticObjectId

from app.models.question import Question
from app.models.exam_template import ExamTemplate
from app.models.exam import Exam, ExamQuestion
from app.models.enums import ApprovalStatus

logger = logging.getLogger(__name__)


async def generate_exam_from_template(
    template: ExamTemplate,
    exam_period_id: Optional[str] = None,
) -> list[ExamQuestion]:
    """
    Select questions from the question bank based on template distribution rules.
    Ensures no duplicate questions within the same exam period.
    """
    # Get question IDs already used in this exam period
    used_question_ids = set()
    if exam_period_id:
        existing_exams = await Exam.find(
            Exam.exam_period_id == exam_period_id
        ).to_list()
        for ex in existing_exams:
            for q in ex.questions:
                used_question_ids.add(q.question_id)

    selected_questions: list[ExamQuestion] = []
    order = 1

    for dist in template.distributions:
        # Build query - truyền enum object trực tiếp cho Beanie 2.x
        query = {"status": ApprovalStatus.APPROVED}
        if template.skill_level is not None:
            query["skill_level"] = template.skill_level
        if dist.topic_tag:
            query["topic_tags"] = dist.topic_tag
        if dist.question_type:
            query["question_type"] = dist.question_type
        if dist.difficulty:
            query["difficulty"] = dist.difficulty

        logger.info(f"Query for distribution: {query}")

        # Fetch candidates
        candidates = await Question.find(query).to_list()
        logger.info(f"Found {len(candidates)} candidates")


        # Filter out already used questions
        candidates = [
            q for q in candidates
            if str(q.id) not in used_question_ids
        ]

        # Also filter out already selected in this exam
        selected_ids = {sq.question_id for sq in selected_questions}
        candidates = [q for q in candidates if str(q.id) not in selected_ids]

        # Randomly select required count
        count_needed = dist.count
        if len(candidates) < count_needed:
            logger.warning(
                f"Not enough questions for distribution rule "
                f"(topic={dist.topic_tag}, type={dist.question_type}, "
                f"difficulty={dist.difficulty}): need {count_needed}, "
                f"found {len(candidates)}"
            )
            count_needed = len(candidates)

        selected = random.sample(candidates, count_needed)

        for q in selected:
            # Build correct answer string
            correct_answer = ""
            if q.question_type.value == "multiple_choice":
                for opt in q.options:
                    if opt.is_correct:
                        correct_answer = opt.label
                        break
            elif q.question_type.value == "true_false":
                correct_answer = str(q.correct_answer_bool).lower()
            elif q.question_type.value == "scenario_based":
                correct_answer = "|".join(q.expected_key_points)

            # Build options for exam (without is_correct)
            exam_options = [
                {"label": opt.label, "text": opt.text}
                for opt in q.options
            ]

            selected_questions.append(ExamQuestion(
                question_id=str(q.id),
                order=order,
                content=q.content,
                question_type=q.question_type.value,
                options=exam_options,
                correct_answer=correct_answer,
                points=1.0,
            ))
            order += 1

    # Shuffle all questions
    random.shuffle(selected_questions)
    # Re-assign order after shuffle
    for i, sq in enumerate(selected_questions):
        sq.order = i + 1

    return selected_questions
