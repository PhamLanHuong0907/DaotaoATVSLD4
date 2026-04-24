"""Create / list / mark notifications."""
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.models.notification import Notification, NotificationType


async def create_notification(
    user_id: str,
    title: str,
    body: Optional[str] = None,
    type: NotificationType = NotificationType.GENERAL,
    link: Optional[str] = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        link=link,
    )
    await n.insert()
    return n


async def create_bulk(
    user_ids: list[str],
    title: str,
    body: Optional[str] = None,
    type: NotificationType = NotificationType.GENERAL,
    link: Optional[str] = None,
) -> int:
    docs = [
        Notification(user_id=uid, type=type, title=title, body=body, link=link)
        for uid in user_ids
    ]
    if docs:
        await Notification.insert_many(docs)
    return len(docs)


async def list_for_user(
    user_id: str,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Notification], int, int]:
    """Return (items, total, unread_count)."""
    query: dict = {"user_id": user_id}
    if unread_only:
        query["is_read"] = False
    total = await Notification.find(query).count()
    items = (
        await Notification.find(query)
        .sort("-created_at")
        .skip(skip)
        .limit(limit)
        .to_list()
    )
    unread_count = await Notification.find(
        {"user_id": user_id, "is_read": False}
    ).count()
    return items, total, unread_count


async def mark_read(notif_id: str, user_id: str) -> Optional[Notification]:
    n = await Notification.get(PydanticObjectId(notif_id))
    if not n or n.user_id != user_id:
        return None
    if not n.is_read:
        n.is_read = True
        n.read_at = datetime.now(timezone.utc)
        await n.save()
    return n


async def mark_all_read(user_id: str) -> int:
    res = await Notification.find(
        {"user_id": user_id, "is_read": False}
    ).update_many({"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}})
    return getattr(res, "modified_count", 0)
