from abc import ABC, abstractmethod
from datetime import datetime
from typing import List

from app.config import settings
from app.schemas import CouponRaw


def should_use_mock(target_id: str) -> bool:
    """Per-scraper resolver: tentuin scraper ini pakai mock atau real fetch.

    Logic:
    1. Kalau SCRAPER_USE_MOCK=false (global flip) -> SEMUA scraper real fetch
    2. Kalau target_id ada di SCRAPER_REAL_OVERRIDES -> scraper ini real fetch
       (walau SCRAPER_USE_MOCK=true global)
    3. Default -> pakai mock

    Pattern: gradual rollout per-scraper. Aktifin Telegram dulu (real impl ready),
    biarin sample_blog/multi_blog tetep mock sampai real impl.
    """
    if not settings.SCRAPER_USE_MOCK:
        return False
    overrides = {x.strip() for x in settings.SCRAPER_REAL_OVERRIDES.split(",") if x.strip()}
    if target_id in overrides:
        return False
    return True


class BaseScraper(ABC):
    """Kontrak dasar setiap scraper target."""

    target_id: str = "base"
    merchant_slug: str = ""
    name: str = "Base Scraper"
    interval_minutes: int = 60
    tier: str = "public"  # public | semi-public | gray | red
    enabled: bool = True

    @abstractmethod
    async def fetch_raw(self) -> str | dict | list:
        """Ambil data mentah (HTML / JSON)."""
        raise NotImplementedError

    @abstractmethod
    def parse(self, raw) -> List[CouponRaw]:
        """Parse data mentah → daftar CouponRaw."""
        raise NotImplementedError

    async def run(self) -> List[CouponRaw]:
        raw = await self.fetch_raw()
        items = self.parse(raw)
        for item in items:
            item.source_target = self.target_id
            if not item.merchant_slug:
                item.merchant_slug = self.merchant_slug
        return items
