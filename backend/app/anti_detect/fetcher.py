import asyncio
import logging
from urllib import robotparser
from urllib.parse import urlparse
from typing import Optional

import httpx

from app.anti_detect.user_agents import build_headers
from app.anti_detect.proxy import get_pool, ProxyState
from app.config import settings

logger = logging.getLogger(__name__)

_robots_cache: dict[str, robotparser.RobotFileParser] = {}
_last_request_at: dict[str, float] = {}


async def _check_robots(url: str, ua: str) -> bool:
    """Return True kalau URL diperbolehkan oleh robots.txt."""
    parsed = urlparse(url)
    host = f"{parsed.scheme}://{parsed.netloc}"

    if host not in _robots_cache:
        rp = robotparser.RobotFileParser()
        rp.set_url(f"{host}/robots.txt")
        try:
            await asyncio.to_thread(rp.read)
        except Exception as e:
            logger.warning(f"robots.txt fetch failed for {host}: {e} — assuming allowed")
            return True
        _robots_cache[host] = rp

    return _robots_cache[host].can_fetch(ua, url)


async def _rate_limit(host: str) -> None:
    now = asyncio.get_event_loop().time()
    last = _last_request_at.get(host, 0)
    delta = now - last
    if delta < settings.SCRAPER_RATE_LIMIT_SECONDS:
        await asyncio.sleep(settings.SCRAPER_RATE_LIMIT_SECONDS - delta)
    _last_request_at[host] = asyncio.get_event_loop().time()


async def fetch(
    url: str,
    *,
    method: str = "GET",
    respect_robots: bool = True,
    timeout: Optional[int] = None,
    **kwargs,
) -> httpx.Response:
    """HTTP fetcher dengan UA rotation, rate limit, robots.txt check."""
    headers = build_headers()
    parsed = urlparse(url)
    host = parsed.netloc

    if respect_robots and not await _check_robots(url, headers["User-Agent"]):
        raise PermissionError(f"robots.txt disallows {url}")

    await _rate_limit(host)

    pool = get_pool()
    proxy_state: ProxyState | None = None
    proxy_url: str | None = None
    if pool:
        proxy_state = await pool.acquire()
        proxy_url = proxy_state.url
        logger.debug(f"Using proxy: {proxy_state.endpoint.label}")

    client_kwargs: dict = {
        "timeout": timeout or settings.SCRAPER_TIMEOUT_SECONDS,
        "follow_redirects": True,
        "headers": headers,
    }
    if proxy_url:
        client_kwargs["proxy"] = proxy_url

    try:
        async with httpx.AsyncClient(**client_kwargs) as client:
            resp = await client.request(method, url, **kwargs)
            resp.raise_for_status()
            if pool and proxy_state:
                pool.report(proxy_state, success=True)
            return resp
    except httpx.HTTPStatusError as e:
        if pool and proxy_state:
            pool.report(proxy_state, success=False, error_status=e.response.status_code)
        raise
    except Exception:
        if pool and proxy_state:
            pool.report(proxy_state, success=False)
        raise
