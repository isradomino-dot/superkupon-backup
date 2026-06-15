"""Admin endpoint untuk proxy pool monitoring."""
from fastapi import APIRouter, Depends, HTTPException

from app.anti_detect.proxy import get_pool
from app.api._auth import require_admin

router = APIRouter(
    prefix="/admin/proxy",
    tags=["admin-proxy"],
    dependencies=[Depends(require_admin)],
)


@router.get("/stats")
def proxy_stats():
    pool = get_pool()
    if pool is None:
        return {"enabled": False, "note": "PROXY_PROVIDER=none. Set di .env untuk aktivasi."}
    return {"enabled": True, **pool.stats()}


@router.post("/health-check")
async def proxy_health_check():
    pool = get_pool()
    if pool is None:
        raise HTTPException(400, "Proxy pool not configured")
    return await pool.health_check()
