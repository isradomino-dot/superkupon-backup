"""Auth dependencies untuk sensitive endpoints (admin, recon, proxy admin).

Pakai pattern fail-closed: kalau ADMIN_API_KEY gak di-set di env,
semua admin endpoint DIBLOK total — bukan dibuka. Ini untuk hindari
accidental exposure di production deployment baru.

Cara pakai di router:
    from app.api._auth import require_admin
    router = APIRouter(
        prefix="/admin",
        tags=["admin"],
        dependencies=[Depends(require_admin)],
    )

Atau per-endpoint:
    @router.post("/scrape-all", dependencies=[Depends(require_admin)])
"""
from fastapi import Header, HTTPException, status

from app.config import settings


def require_admin(x_api_key: str | None = Header(None, alias="X-API-Key")) -> None:
    """Verify X-API-Key header matches ADMIN_API_KEY env var.

    Returns None on success, raises HTTPException otherwise.

    Behavior:
    - ADMIN_API_KEY empty di server  -> 503 Service Unavailable (admin disabled)
    - Header missing / mismatch       -> 401 Unauthorized
    - Match                            -> allow request
    """
    expected = settings.ADMIN_API_KEY
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Admin API disabled: ADMIN_API_KEY belum di-set di server env. "
                "Set ADMIN_API_KEY=<random-secret> di Railway/Render env vars."
            ),
        )
    if not x_api_key or x_api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header.",
        )
