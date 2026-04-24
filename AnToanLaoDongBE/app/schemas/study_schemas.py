from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ChatRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    message: str
    occupation: Optional[str] = None
    skill_level: Optional[int] = None


class ChatResponse(BaseModel):
    session_id: str
    response: str


class ExplainWrongAnswersRequest(BaseModel):
    submission_id: str


class SuggestReviewRequest(BaseModel):
    submission_id: str


class PracticeQuestionsRequest(BaseModel):
    topic: str
    occupation: str
    skill_level: int
    count: int = 5


class StudySessionResponse(BaseModel):
    id: str
    user_id: str
    session_type: str
    messages: list[dict] = []
    occupation: Optional[str] = None
    skill_level: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class StudySessionListResponse(BaseModel):
    id: str
    user_id: str
    session_type: str
    message_count: int
    created_at: datetime
