"""Forum / Q&A endpoints."""
import math
import uuid
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_user, require_staff
from app.models.forum import ForumReply, ForumTopic
from app.models.user import User
from app.utils.pagination import PaginatedResponse

router = APIRouter(prefix="/forum", tags=["Forum"])


class TopicCreate(BaseModel):
    title: str
    body: str
    tags: list[str] = []
    occupation: Optional[str] = None


class TopicListItem(BaseModel):
    id: str
    title: str
    tags: list[str] = []
    author_name: str
    author_role: str
    reply_count: int
    view_count: int
    upvote_count: int
    is_resolved: bool
    is_pinned: bool
    created_at: datetime
    updated_at: datetime


class ReplyOut(BaseModel):
    id: str
    author_id: str
    author_name: str
    author_role: str
    content: str
    upvote_count: int
    is_upvoted_by_me: bool
    is_answer: bool
    created_at: datetime


class TopicDetail(BaseModel):
    id: str
    title: str
    body: str
    tags: list[str] = []
    occupation: Optional[str] = None
    author_id: str
    author_name: str
    author_role: str
    replies: list[ReplyOut] = []
    view_count: int
    upvote_count: int
    is_upvoted_by_me: bool
    is_resolved: bool
    is_pinned: bool
    is_locked: bool
    created_at: datetime
    updated_at: datetime


class ReplyCreate(BaseModel):
    content: str


def _topic_to_list_item(t: ForumTopic) -> TopicListItem:
    return TopicListItem(
        id=str(t.id),
        title=t.title,
        tags=t.tags,
        author_name=t.author_name,
        author_role=t.author_role,
        reply_count=len(t.replies),
        view_count=t.view_count,
        upvote_count=len(t.upvotes),
        is_resolved=t.is_resolved,
        is_pinned=t.is_pinned,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


def _topic_to_detail(t: ForumTopic, viewer_id: str) -> TopicDetail:
    return TopicDetail(
        id=str(t.id),
        title=t.title,
        body=t.body,
        tags=t.tags,
        occupation=t.occupation,
        author_id=t.author_id,
        author_name=t.author_name,
        author_role=t.author_role,
        replies=[
            ReplyOut(
                id=r.id,
                author_id=r.author_id,
                author_name=r.author_name,
                author_role=r.author_role,
                content=r.content,
                upvote_count=len(r.upvotes),
                is_upvoted_by_me=viewer_id in r.upvotes,
                is_answer=r.is_answer,
                created_at=r.created_at,
            )
            for r in t.replies
        ],
        view_count=t.view_count,
        upvote_count=len(t.upvotes),
        is_upvoted_by_me=viewer_id in t.upvotes,
        is_resolved=t.is_resolved,
        is_pinned=t.is_pinned,
        is_locked=t.is_locked,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


@router.post("/topics", response_model=TopicDetail)
async def create_topic(data: TopicCreate, user: User = Depends(get_current_user)):
    if not data.title.strip() or not data.body.strip():
        raise HTTPException(400, "Title and body are required")
    topic = ForumTopic(
        title=data.title.strip(),
        body=data.body.strip(),
        tags=[t.strip() for t in data.tags if t.strip()],
        occupation=data.occupation,
        author_id=str(user.id),
        author_name=user.full_name,
        author_role=user.role.value if hasattr(user.role, "value") else str(user.role),
    )
    await topic.insert()
    return _topic_to_detail(topic, str(user.id))


@router.get("/topics", response_model=PaginatedResponse[TopicListItem])
async def list_topics(
    tag: Optional[str] = None,
    resolved: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: User = Depends(get_current_user),
):
    query: dict = {}
    if tag:
        query["tags"] = tag
    if resolved is not None:
        query["is_resolved"] = resolved
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"body": {"$regex": search, "$options": "i"}},
        ]
    skip = (page - 1) * page_size
    total = await ForumTopic.find(query).count()
    items = (
        await ForumTopic.find(query)
        .sort([("is_pinned", -1), ("updated_at", -1)])
        .skip(skip)
        .limit(page_size)
        .to_list()
    )
    return PaginatedResponse(
        items=[_topic_to_list_item(t) for t in items],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/topics/{topic_id}", response_model=TopicDetail)
async def get_topic(topic_id: str, user: User = Depends(get_current_user)):
    t = await ForumTopic.get(PydanticObjectId(topic_id))
    if not t:
        raise HTTPException(404, "Topic not found")
    t.view_count += 1
    await t.save()
    return _topic_to_detail(t, str(user.id))


@router.delete("/topics/{topic_id}")
async def delete_topic(topic_id: str, user: User = Depends(get_current_user)):
    t = await ForumTopic.get(PydanticObjectId(topic_id))
    if not t:
        raise HTTPException(404, "Topic not found")
    is_admin_or_officer = user.role.value in ("admin", "training_officer") if hasattr(user.role, "value") else str(user.role) in ("admin", "training_officer")
    if t.author_id != str(user.id) and not is_admin_or_officer:
        raise HTTPException(403, "Forbidden")
    await t.delete()
    return {"success": True}


@router.post("/topics/{topic_id}/upvote", response_model=TopicDetail)
async def upvote_topic(topic_id: str, user: User = Depends(get_current_user)):
    t = await ForumTopic.get(PydanticObjectId(topic_id))
    if not t:
        raise HTTPException(404, "Topic not found")
    uid = str(user.id)
    if uid in t.upvotes:
        t.upvotes.remove(uid)
    else:
        t.upvotes.append(uid)
    t.updated_at = datetime.now(timezone.utc)
    await t.save()
    return _topic_to_detail(t, uid)


@router.post("/topics/{topic_id}/replies", response_model=TopicDetail)
async def add_reply(
    topic_id: str,
    data: ReplyCreate,
    user: User = Depends(get_current_user),
):
    t = await ForumTopic.get(PydanticObjectId(topic_id))
    if not t:
        raise HTTPException(404, "Topic not found")
    if t.is_locked:
        raise HTTPException(400, "Topic is locked")
    if not data.content.strip():
        raise HTTPException(400, "Empty reply")

    reply = ForumReply(
        id=uuid.uuid4().hex[:16],
        author_id=str(user.id),
        author_name=user.full_name,
        author_role=user.role.value if hasattr(user.role, "value") else str(user.role),
        content=data.content.strip(),
    )
    t.replies.append(reply)
    t.updated_at = datetime.now(timezone.utc)
    await t.save()

    # Notify topic author (if reply isn't from themselves)
    if t.author_id != str(user.id):
        try:
            from app.services.notification_service import create_notification
            from app.models.notification import NotificationType
            await create_notification(
                user_id=t.author_id,
                type=NotificationType.GENERAL,
                title=f"{user.full_name} đã trả lời câu hỏi của bạn",
                body=t.title,
                link=f"/forum/{t.id}",
            )
        except Exception:
            pass

    return _topic_to_detail(t, str(user.id))


@router.post("/topics/{topic_id}/replies/{reply_id}/upvote", response_model=TopicDetail)
async def upvote_reply(
    topic_id: str,
    reply_id: str,
    user: User = Depends(get_current_user),
):
    t = await ForumTopic.get(PydanticObjectId(topic_id))
    if not t:
        raise HTTPException(404, "Topic not found")
    uid = str(user.id)
    found = False
    for r in t.replies:
        if r.id == reply_id:
            found = True
            if uid in r.upvotes:
                r.upvotes.remove(uid)
            else:
                r.upvotes.append(uid)
            break
    if not found:
        raise HTTPException(404, "Reply not found")
    await t.save()
    return _topic_to_detail(t, uid)


@router.post("/topics/{topic_id}/replies/{reply_id}/mark-answer", response_model=TopicDetail)
async def mark_as_answer(
    topic_id: str,
    reply_id: str,
    user: User = Depends(get_current_user),
):
    """Mark a reply as the accepted answer. Only topic author or staff."""
    t = await ForumTopic.get(PydanticObjectId(topic_id))
    if not t:
        raise HTTPException(404, "Topic not found")
    is_staff = user.role.value in ("admin", "training_officer") if hasattr(user.role, "value") else str(user.role) in ("admin", "training_officer")
    if t.author_id != str(user.id) and not is_staff:
        raise HTTPException(403, "Forbidden")
    found = False
    for r in t.replies:
        if r.id == reply_id:
            r.is_answer = True
            found = True
        else:
            r.is_answer = False
    if not found:
        raise HTTPException(404, "Reply not found")
    t.is_resolved = True
    t.updated_at = datetime.now(timezone.utc)
    await t.save()
    return _topic_to_detail(t, str(user.id))


@router.post("/topics/{topic_id}/lock", response_model=TopicDetail)
async def lock_topic(topic_id: str, user: User = Depends(require_staff())):
    t = await ForumTopic.get(PydanticObjectId(topic_id))
    if not t:
        raise HTTPException(404, "Topic not found")
    t.is_locked = not t.is_locked
    await t.save()
    return _topic_to_detail(t, str(user.id))


@router.post("/topics/{topic_id}/pin", response_model=TopicDetail)
async def pin_topic(topic_id: str, user: User = Depends(require_staff())):
    t = await ForumTopic.get(PydanticObjectId(topic_id))
    if not t:
        raise HTTPException(404, "Topic not found")
    t.is_pinned = not t.is_pinned
    await t.save()
    return _topic_to_detail(t, str(user.id))
