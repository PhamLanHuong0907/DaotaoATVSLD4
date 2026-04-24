"""Persistent AI tutor chat sessions for individual workers."""
from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str
    sources: list[str] = []  # document titles cited in this message
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatSession(Document):
    user_id: str
    title: str = "Cuộc trò chuyện mới"
    messages: list[ChatMessage] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "chat_sessions"
        indexes = ["user_id", "updated_at"]
