"""
Telegram bot notifier — stub V1.
Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID di .env untuk aktivasi.

Usage di scheduler:
    from app.bot.telegram_bot import notify_new_coupons
    await notify_new_coupons(new_coupons)
"""
import logging
from typing import Iterable

import httpx

from app.config import settings
from app.models import Coupon

logger = logging.getLogger(__name__)


def _format_coupon(c: Coupon) -> str:
    parts = [f"🎟️ <b>{c.title}</b>"]
    if c.code:
        parts.append(f"Kode: <code>{c.code}</code>")
    if c.merchant:
        parts.append(f"Merchant: {c.merchant.name}")
    if c.expires_at:
        parts.append(f"Berlaku s/d: {c.expires_at.strftime('%d %b %Y')}")
    if c.source_url:
        parts.append(f'<a href="{c.source_url}">Detail</a>')
    return "\n".join(parts)


async def send_message(text: str) -> bool:
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHANNEL_ID:
        logger.debug("Telegram bot not configured — skip notify")
        return False

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": settings.TELEGRAM_CHANNEL_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            return True
    except Exception as e:
        logger.warning(f"Telegram send failed: {e}")
        return False


async def notify_new_coupons(coupons: Iterable[Coupon]) -> int:
    sent = 0
    for c in coupons:
        if await send_message(_format_coupon(c)):
            sent += 1
    return sent
