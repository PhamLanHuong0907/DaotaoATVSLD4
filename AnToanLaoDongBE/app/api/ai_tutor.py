"""AI tutor chat with simple RAG over approved training documents."""
import re
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.ai.tutor import chat_with_tutor
from app.api.deps import get_current_user
from app.models.chat_session import ChatMessage, ChatSession
from app.models.document import TrainingDocument
from app.models.enums import ApprovalStatus
from app.models.user import User

router = APIRouter(prefix="/ai-tutor", tags=["AI Tutor"])


# ---------- Lightweight retrieval ----------
# We use simple keyword scoring against the extracted_text of approved docs.
# (No vector DB needed for first iteration; OpenAI embeddings can be added later.)


def _tokenize(text: str) -> list[str]:
    text = text.lower()
    return [w for w in re.split(r"[^\w]+", text) if len(w) >= 3]


async def _retrieve_context(question: str, max_docs: int = 3, max_chars: int = 1500) -> tuple[str, list[str]]:
    keywords = set(_tokenize(question))
    if not keywords:
        return "", []

    docs = await TrainingDocument.find({
        "status": ApprovalStatus.APPROVED,
        "extracted_text": {"$ne": None},
    }).to_list()

    scored: list[tuple[int, TrainingDocument, str]] = []
    for d in docs:
        text = d.extracted_text or ""
        if not text:
            continue
        # Find best matching paragraph
        best_chunk = ""
        best_score = 0
        for chunk in text.split("\n\n"):
            if not chunk.strip():
                continue
            chunk_lower = chunk.lower()
            score = sum(1 for k in keywords if k in chunk_lower)
            if score > best_score:
                best_score = score
                best_chunk = chunk[:max_chars]
        if best_score > 0:
            scored.append((best_score, d, best_chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    chosen = scored[:max_docs]

    if not chosen:
        return "", []

    context_parts: list[str] = []
    sources: list[str] = []
    for _score, doc, chunk in chosen:
        context_parts.append(f"[{doc.title}]\n{chunk}")
        sources.append(doc.title)
    return "\n\n---\n\n".join(context_parts), sources


# ---------- Schemas ----------

class SendMessageRequest(BaseModel):
    session_id: Optional[str] = None  # null = create a new session
    message: str


class MessageResponse(BaseModel):
    role: str
    content: str
    sources: list[str] = []
    created_at: datetime


class SessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    messages: list[MessageResponse]
    created_at: datetime
    updated_at: datetime


class SessionListItem(BaseModel):
    id: str
    title: str
    last_message: Optional[str] = None
    updated_at: datetime


def _to_session(s: ChatSession) -> SessionResponse:
    return SessionResponse(
        id=str(s.id),
        user_id=s.user_id,
        title=s.title,
        messages=[
            MessageResponse(
                role=m.role, content=m.content, sources=m.sources, created_at=m.created_at,
            )
            for m in s.messages
        ],
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


# ---------- Endpoints ----------

@router.get("/sessions", response_model=list[SessionListItem])
async def list_sessions(user: User = Depends(get_current_user)):
    sessions = await ChatSession.find(
        ChatSession.user_id == str(user.id)
    ).sort("-updated_at").to_list()
    out: list[SessionListItem] = []
    for s in sessions:
        last = s.messages[-1] if s.messages else None
        out.append(SessionListItem(
            id=str(s.id),
            title=s.title,
            last_message=(last.content[:100] if last else None),
            updated_at=s.updated_at,
        ))
    return out


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, user: User = Depends(get_current_user)):
    s = await ChatSession.get(PydanticObjectId(session_id))
    if not s or s.user_id != str(user.id):
        raise HTTPException(404, "Session not found")
    return _to_session(s)


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user: User = Depends(get_current_user)):
    s = await ChatSession.get(PydanticObjectId(session_id))
    if not s or s.user_id != str(user.id):
        raise HTTPException(404, "Session not found")
    await s.delete()
    return {"success": True}


@router.post("/chat", response_model=SessionResponse)
async def chat(data: SendMessageRequest, user: User = Depends(get_current_user)):
    """Send a message to the AI tutor. Creates or appends to a session."""
    if not data.message.strip():
        raise HTTPException(400, "Empty message")

    # Load or create session
    session: Optional[ChatSession] = None
    if data.session_id:
        session = await ChatSession.get(PydanticObjectId(data.session_id))
        if not session or session.user_id != str(user.id):
            raise HTTPException(404, "Session not found")
    if not session:
        session = ChatSession(
            user_id=str(user.id),
            title=data.message[:50] if len(data.message) > 5 else "Cuộc trò chuyện mới",
        )
        await session.insert()

    # Append user message
    user_msg = ChatMessage(role="user", content=data.message)
    session.messages.append(user_msg)

    # Build retrieval context
    context, sources = await _retrieve_context(data.message)

    # Build short history
    history = [
        {"role": m.role, "content": m.content}
        for m in session.messages[-21:-1]  # everything except the just-added user message
    ]

    try:
        answer = await chat_with_tutor(
            user_message=data.message,
            chat_history=history,
            context=context if context else None,
        )
    except Exception as e:
        # Roll back the user message so the session stays consistent
        session.messages.pop()
        raise HTTPException(500, f"AI tutor error: {e}")

    assistant_msg = ChatMessage(role="assistant", content=answer or "", sources=sources)
    session.messages.append(assistant_msg)
    session.updated_at = datetime.now(timezone.utc)
    await session.save()

    return _to_session(session)
