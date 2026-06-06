from abc import ABC, abstractmethod
from datetime import datetime
from typing import List

from app.schemas import CouponRaw


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
