"""Internal Q&A forum.

Workers ask, training officers (or other workers) answer.
"""
from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


class ForumReply(BaseModel):
    id: str = Field(default_factory=lambda: str(datetime.now(timezone.utc).timestamp() * 1000))
    author_id: str
    author_name: str
    author_role: str
    content: str
    upvotes: list[str] = []  # user_ids who upvoted
    is_answer: bool = False  # marked by topic author or staff as the accepted answer
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ForumTopic(Document):
    title: str
    body: str
    tags: list[str] = []
    occupation: Optional[str] = None

    author_id: str
    author_name: str
    author_role: str

    replies: list[ForumReply] = []
    view_count: int = 0
    upvotes: list[str] = []
    is_resolved: bool = False
    is_pinned: bool = False
    is_locked: bool = False

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "forum_topics"
        indexes = ["author_id", "tags", "occupation", "is_resolved", "is_pinned", "created_at"]
