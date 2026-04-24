"""Outbound webhook dispatcher.

Lightweight: each event call fires HTTP POSTs to all matching active webhooks
in the background, never blocking the calling endpoint.
"""
import asyncio
import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from app.models.webhook import Webhook, WebhookEvent

logger = logging.getLogger(__name__)


def _sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


async def _send_one(webhook: Webhook, event: WebhookEvent, payload: dict[str, Any]) -> None:
    body = json.dumps({
        "event": event.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": payload,
    }, ensure_ascii=False).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "X-ATVSLD-Event": event.value,
    }
    if webhook.secret:
        headers["X-ATVSLD-Signature"] = _sign(webhook.secret, body)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(webhook.url, content=body, headers=headers)
            webhook.last_status_code = r.status_code
            webhook.last_triggered_at = datetime.now(timezone.utc)
            if 200 <= r.status_code < 300:
                webhook.success_count += 1
                webhook.last_error = None
            else:
                webhook.failure_count += 1
                webhook.last_error = f"HTTP {r.status_code}: {r.text[:200]}"
    except Exception as e:
        webhook.failure_count += 1
        webhook.last_error = str(e)[:300]
        webhook.last_triggered_at = datetime.now(timezone.utc)
        logger.warning("Webhook %s → %s failed: %s", webhook.name, webhook.url, e)
    finally:
        try:
            await webhook.save()
        except Exception:
            pass


async def fire_event(event: WebhookEvent, payload: dict[str, Any]) -> None:
    """Fire-and-forget all active webhooks subscribed to this event."""
    try:
        hooks = await Webhook.find({
            "is_active": True,
            "events": event.value,
        }).to_list()
    except Exception as e:
        logger.warning("Webhook lookup failed: %s", e)
        return

    if not hooks:
        return

    # Send concurrently in background
    asyncio.create_task(_dispatch_all(hooks, event, payload))


async def _dispatch_all(hooks: list[Webhook], event: WebhookEvent, payload: dict[str, Any]) -> None:
    await asyncio.gather(*[_send_one(h, event, payload) for h in hooks], return_exceptions=True)
