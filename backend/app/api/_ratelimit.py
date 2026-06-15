"""Simple in-memory rate limiter untuk endpoint publik kayak view/redeem tracking.

Single-instance only — kalau scale horizontal (multi pod Railway), tiap pod punya
counter terpisah. Total throughput = max_calls * jumlah_pod. Untuk MVP cukup.

Upgrade path: pakai redis-py + INCR/EXPIRE kalau multi-instance dibutuhkan.

Cara pakai:
    from app.api._ratelimit import rate_limit, get_client_ip

    @router.post("/{coupon_id}/view")
    def track_view(coupon_id: int, request: Request, ...):
        ip = get_client_ip(request)
        rate_limit(f"view:{ip}", max_calls=30, window_seconds=60.0)
        ...
"""
from collections import defaultdict
from time import monotonic
from typing import DefaultDict, List

from fastapi import HTTPException, Request, status

# Bucket: key -> list of monotonic timestamps (ascending)
_buckets: DefaultDict[str, List[float]] = defaultdict(list)


def rate_limit(key: str, max_calls: int, window_seconds: float) -> None:
    """Token bucket sliding window. Raise 429 kalau over limit.

    Args:
        key: unique identifier (mis. "view:1.2.3.4" atau "redeem:1.2.3.4")
        max_calls: max calls allowed dalam window
        window_seconds: window size dalam detik
    """
    now = monotonic()
    bucket = _buckets[key]

    # Drop expired entries (older than window)
    cutoff = now - window_seconds
    while bucket and bucket[0] < cutoff:
        bucket.pop(0)

    if len(bucket) >= max_calls:
        retry_after = int(bucket[0] + window_seconds - now) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Rate limit exceeded: max {max_calls} per {int(window_seconds)}s. "
                f"Coba lagi dalam {retry_after} detik."
            ),
            headers={"Retry-After": str(retry_after)},
        )

    bucket.append(now)


def get_client_ip(request: Request) -> str:
    """Get client IP, respect X-Forwarded-For dari Railway/Vercel/Cloudflare proxy."""
    # X-Forwarded-For format: "client, proxy1, proxy2" — ambil paling kiri
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    # Fallback ke real_ip header
    real_ip = request.headers.get("x-real-ip", "")
    if real_ip:
        return real_ip.strip()
    # Last fallback: direct client (mungkin localhost dev)
    return request.client.host if request.client else "unknown"
