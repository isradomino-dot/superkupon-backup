"""Social media unstructured-text scraper.

Demonstrasi: kombinasi public sources (IG/X/TikTok caption) yang di-mock
untuk PoC. Production butuh API resmi:
  - Meta Graph API (Instagram Basic Display + Business)
  - Twitter/X API v2 (paid)
  - TikTok for Business API

Untuk V1 PoC, scraper ini pakai mock data + ML extractor untuk demo end-to-end.
"""
from __future__ import annotations

from datetime import datetime
from typing import List

from app.config import settings
from app.ml.coupon_extractor import extract_coupons
from app.scrapers.base import BaseScraper, should_use_mock
from app.schemas import CouponRaw


_MOCK_POSTS = [
    {
        "platform": "instagram",
        "url": "https://instagram.com/p/example1",
        "caption": (
            "✨ FLASH SALE TOKOPEDIA ✨\n"
            "Diskon 25% s/d Rp 75.000 untuk pengguna baru.\n"
            "Kode: NEWBIE25, min belanja Rp 200rb. Berlaku s/d 30 Juni 2026."
        ),
    },
    {
        "platform": "twitter",
        "url": "https://x.com/example/status/123",
        "caption": (
            "Promo GrabFood weekend! Diskon Rp 40.000 pakai kode WEEKEND40, "
            "min order Rp 75rb. Valid s/d 31 Mei 2026."
        ),
    },
    {
        "platform": "tiktok",
        "url": "https://tiktok.com/@example/video/456",
        "caption": (
            "Buy 1 Get 1 di KFC pakai aplikasi! Cashback ShopeePay 20%, max Rp 25.000. "
            "Berlaku 1 Juni 2026."
        ),
    },
]


class SocialMediaScraper(BaseScraper):
    target_id = "social_media_aggregator"
    merchant_slug = "multi"
    name = "Social Media (IG/X/TikTok)"
    interval_minutes = 180
    tier = "public"

    async def fetch_raw(self) -> list[dict]:
        if should_use_mock(self.target_id):
            return _MOCK_POSTS

        # TODO production:
        #   - Meta Graph API: GET /{ig-user-id}/media?fields=caption,permalink,timestamp
        #   - Twitter API v2: GET /2/users/{id}/tweets?expansions=...
        raise NotImplementedError(
            "Production butuh Meta Graph API / X API credentials. "
            "Lihat docs/SOCIAL_MEDIA_SETUP.md."
        )

    def parse(self, raw: list[dict]) -> List[CouponRaw]:
        results: List[CouponRaw] = []
        for post in raw:
            caption = post.get("caption", "")
            if not caption:
                continue
            extracted = extract_coupons(caption, source_target=self.target_id)
            for c in extracted:
                c.source_url = post.get("url")
            results.extend(extracted)
        return results
