"""Residential proxy pool dengan rotation, health check, dan cooldown.

Cara pakai:
    pool = ProxyPool.from_settings()
    proxy = await pool.acquire()
    async with httpx.AsyncClient(proxies=proxy.url) as client:
        ...
    pool.report(proxy, success=True)

Provider yang di-support (lihat proxy_providers.py):
  - bright_data    — Bright Data (premium residential)
  - oxylabs        — Oxylabs (premium)
  - iproyal        — IPRoyal (mid-tier residential)
  - static_list    — list URL proxy manual (testing / free pool)
  - none           — disabled (direct fetch, default V1)
"""
from __future__ import annotations

import asyncio
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Iterator

import httpx

from app.anti_detect.proxy_providers import build_provider, ProxyEndpoint
from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ProxyState:
    endpoint: ProxyEndpoint
    success_count: int = 0
    failure_count: int = 0
    last_used: float = 0
    cooldown_until: float = 0

    @property
    def url(self) -> str:
        return self.endpoint.url

    @property
    def is_cooling_down(self) -> bool:
        return time.time() < self.cooldown_until

    @property
    def health_score(self) -> float:
        total = self.success_count + self.failure_count
        if total == 0:
            return 1.0
        return self.success_count / total

    def __repr__(self) -> str:
        return (
            f"<Proxy {self.endpoint.label} health={self.health_score:.2f} "
            f"used={self.success_count + self.failure_count}>"
        )


class ProxyPool:
    """Round-robin pool dengan failure-aware cooldown."""

    def __init__(self, endpoints: list[ProxyEndpoint], cooldown_seconds: int = 300):
        self._states: list[ProxyState] = [ProxyState(endpoint=e) for e in endpoints]
        self._cursor = 0
        self._lock = asyncio.Lock()
        self._cooldown = cooldown_seconds

    @classmethod
    def from_settings(cls) -> "ProxyPool | None":
        if settings.PROXY_PROVIDER == "none" or not settings.PROXY_PROVIDER:
            return None
        provider = build_provider(settings.PROXY_PROVIDER)
        endpoints = provider.endpoints()
        if not endpoints:
            logger.warning(f"Proxy provider '{settings.PROXY_PROVIDER}' returned no endpoints")
            return None
        logger.info(f"ProxyPool: {len(endpoints)} endpoints from '{settings.PROXY_PROVIDER}'")
        return cls(endpoints, cooldown_seconds=settings.PROXY_COOLDOWN_SECONDS)

    @property
    def size(self) -> int:
        return len(self._states)

    @property
    def available_count(self) -> int:
        return sum(1 for s in self._states if not s.is_cooling_down)

    async def acquire(self) -> ProxyState:
        """Ambil proxy berikutnya yang sehat. Wrap-around dengan rotation."""
        async with self._lock:
            if not self._states:
                raise RuntimeError("Proxy pool empty")

            for _ in range(len(self._states)):
                state = self._states[self._cursor]
                self._cursor = (self._cursor + 1) % len(self._states)
                if not state.is_cooling_down:
                    state.last_used = time.time()
                    return state

            healthiest = max(self._states, key=lambda s: s.health_score)
            healthiest.cooldown_until = 0
            healthiest.last_used = time.time()
            logger.warning("All proxies cooling down — force-using healthiest")
            return healthiest

    def report(self, state: ProxyState, success: bool, error_status: int | None = None) -> None:
        if success:
            state.success_count += 1
            return
        state.failure_count += 1
        if error_status in {403, 407, 429, 502, 503} or state.failure_count % 3 == 0:
            state.cooldown_until = time.time() + self._cooldown
            logger.warning(f"Proxy cooling down: {state} (status={error_status})")

    def stats(self) -> dict:
        return {
            "total": self.size,
            "available": self.available_count,
            "cooling_down": self.size - self.available_count,
            "endpoints": [
                {
                    "label": s.endpoint.label,
                    "success": s.success_count,
                    "failure": s.failure_count,
                    "health": round(s.health_score, 3),
                    "cooling_down": s.is_cooling_down,
                }
                for s in self._states
            ],
        }

    async def health_check(self, test_url: str = "https://httpbin.org/ip") -> dict:
        """Quick check semua endpoint — set cooldown untuk yang dead."""
        results = []
        for state in self._states:
            try:
                async with httpx.AsyncClient(
                    proxy=state.url,
                    timeout=10,
                ) as client:
                    r = await client.get(test_url)
                    ok = r.status_code == 200
                    results.append({"label": state.endpoint.label, "ok": ok, "status": r.status_code})
                    self.report(state, success=ok, error_status=None if ok else r.status_code)
            except Exception as e:
                results.append({"label": state.endpoint.label, "ok": False, "error": str(e)[:80]})
                self.report(state, success=False)
        return {"results": results, "summary": self.stats()}


_pool_singleton: ProxyPool | None = None


def get_pool() -> ProxyPool | None:
    global _pool_singleton
    if _pool_singleton is None and settings.PROXY_PROVIDER and settings.PROXY_PROVIDER != "none":
        _pool_singleton = ProxyPool.from_settings()
    return _pool_singleton
