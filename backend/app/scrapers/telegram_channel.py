"""Telegram public channel scraper — pakai web preview (t.me/s/...) tanpa Telethon.

Web preview punya semua post publik dalam HTML — tidak butuh API ID/auth.
Ini cocok untuk channel publik. Untuk channel private/Telethon, lihat
docs/TELETHON_SETUP.md (V3 advanced).
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import List
from bs4 import BeautifulSoup

from app.config import settings
from app.ml.coupon_extractor import extract_coupons
from app.scrapers.base import BaseScraper, should_use_mock
from app.schemas import CouponRaw

logger = logging.getLogger(__name__)


_MOCK_HTML = """
<html><body>
<div class="tgme_widget_message">
  <div class="tgme_widget_message_text">🔥 PROMO SHOPEE 11.11 🔥
Pakai kode SUPER11 dapat diskon 20% s/d Rp 50.000.
Min belanja Rp 100rb. Berlaku 11 Nov 2026.</div>
  <a class="tgme_widget_message_date" href="https://t.me/danaindonesia/12345">
    <time datetime="2026-05-20T10:30:00+00:00">2 hari lalu</time>
  </a>
</div>
<div class="tgme_widget_message">
  <div class="tgme_widget_message_text">💰 DANA Cashback Rp 50.000
Min top up Rp 200.000 via BCA. Kode: DANA50K. Valid s/d 31 Mei 2026.</div>
  <a class="tgme_widget_message_date" href="https://t.me/danaindonesia/12346">
    <time datetime="2026-05-21T08:00:00+00:00">1 hari lalu</time>
  </a>
</div>
<div class="tgme_widget_message">
  <div class="tgme_widget_message_text">Gofood diskon 30rb pakai GOMURAH30, min order 50rb.
Cashback OVO 15% untuk transport, max 20rb.</div>
  <a class="tgme_widget_message_date" href="https://t.me/danaindonesia/12347">
    <time datetime="2026-05-22T14:15:00+00:00">3 jam lalu</time>
  </a>
</div>
</body></html>
"""


class TelegramChannelScraper(BaseScraper):
    """Generic — bisa di-config per channel via subclass.

    Untuk multi-channel, instantiate dengan `channel_username` berbeda.
    """

    target_id = "telegram_promo_aggregator"
    merchant_slug = "multi"
    name = "Telegram Public Channel (aggregator)"
    interval_minutes = 60
    tier = "public"
    channel_username = "danaindonesia"

    @property
    def url(self) -> str:
        return f"https://t.me/s/{self.channel_username}"

    async def fetch_raw(self) -> str:
        if should_use_mock(self.target_id):
            return _MOCK_HTML

        from app.anti_detect.fetcher import fetch
        resp = await fetch(self.url, respect_robots=True)
        return resp.text

    def parse(self, raw: str) -> List[CouponRaw]:
        soup = BeautifulSoup(raw, "lxml")
        all_items: List[CouponRaw] = []

        messages = soup.select("div.tgme_widget_message")
        logger.info(f"Telegram channel {self.channel_username}: {len(messages)} posts found")

        for msg in messages:
            text_el = msg.select_one(".tgme_widget_message_text")
            if not text_el:
                continue
            text = text_el.get_text(separator="\n", strip=True)
            if len(text) < 20:
                continue

            post_link_el = msg.select_one(".tgme_widget_message_date")
            post_url = post_link_el.get("href") if post_link_el else self.url

            time_el = msg.select_one("time")
            posted_at = None
            if time_el and time_el.get("datetime"):
                try:
                    posted_at = datetime.fromisoformat(time_el["datetime"].replace("Z", "+00:00"))
                except ValueError:
                    pass

            extracted = extract_coupons(text, source_target=self.target_id)
            for c in extracted:
                c.source_url = post_url
            all_items.extend(extracted)

        return all_items
