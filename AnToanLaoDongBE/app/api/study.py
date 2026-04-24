import math
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.study_schemas import (
    ChatRequest, ChatResponse,
    ExplainWrongAnswersRequest, SuggestReviewRequest,
    PracticeQuestionsRequest,
    StudySessionResponse, StudySessionListResponse,
)
from app.services import study_service

router = APIRouter(prefix="/study", tags=["Study & Tutoring"])


@router.get("/materials")
async def get_study_materials(
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
):
    """Get self-study materials (approved courses and documents)."""
    return await study_service.get_study_materials(occupation, skill_level)


@router.post("/chat", response_model=ChatResponse)
async def chat_with_tutor(data: ChatRequest):
    """Chat with AI tutor."""
    response_text, session_id = await study_service.chat(
        user_id=data.user_id,
        message=data.message,
        session_id=data.session_id,
        occupation=data.occupation,
        skill_level=data.skill_level,
    )
    return ChatResponse(session_id=session_id, response=response_text)


@router.post("/explain-wrong-answers")
async def explain_wrong_answers(data: ExplainWrongAnswersRequest):
    """AI explains wrong answers from an exam submission."""
    try:
        explanation = await study_service.explain_wrong_answers(data.submission_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"explanation": explanation}


@router.post("/suggest-review")
async def suggest_review(data: SuggestReviewRequest):
    """AI suggests review topics based on exam results."""
    try:
        suggestions = await study_service.suggest_review(data.submission_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return suggestions


@router.post("/practice-questions")
async def generate_practice_questions(data: PracticeQuestionsRequest):
    """Generate practice questions for self-study."""
    questions = await study_service.get_practice_questions(
        topic=data.topic,
        occupation=data.occupation,
        skill_level=data.skill_level,
        count=data.count,
    )
    return {"questions": questions}


@router.get("/sessions", response_model=list[StudySessionListResponse])
async def list_study_sessions(
    user_id: str = Query(...),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    skip = (page - 1) * page_size
    sessions, _ = await study_service.get_study_sessions(user_id, skip, page_size)
    return [
        StudySessionListResponse(
            id=str(s.id),
            user_id=s.user_id,
            session_type=s.session_type,
            message_count=len(s.messages),
            created_at=s.created_at,
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=StudySessionResponse)
async def get_study_session(session_id: str):
    session = await study_service.get_study_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return StudySessionResponse(
        id=str(session.id),
        user_id=session.user_id,
        session_type=session.session_type,
        messages=[m.model_dump() for m in session.messages],
        occupation=session.occupation,
        skill_level=session.skill_level,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )
