"""Login endpoint untuk admin dashboard — username+password to API key.

Cara kerja:
- User input username + password di frontend
- Backend cek ADMIN_USERS_JSON env (list of {username, password})
- Kalau match, return settings.ADMIN_API_KEY (single shared key buat backend auth)
- Frontend simpen api_key di localStorage, pake di X-API-Key header berikutnya

Sengaja gak pake bcrypt hashing — demo only. Production version harus:
- Bcrypt password storage
- Per-user API keys + audit log
- JWT tokens dengan expiry
- Rate limiting di login endpoint (brute force protection)
"""
import json
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin-auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    api_key: str
    username: str


def _get_admin_users() -> list[dict]:
    """Parse ADMIN_USERS_JSON env var. Returns empty list kalau gak set / invalid."""
    raw = (settings.ADMIN_USERS_JSON or "").strip()
    if not raw:
        return []
    try:
        users = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.warning("ADMIN_USERS_JSON invalid JSON: %s", e)
        return []
    if not isinstance(users, list):
        logger.warning("ADMIN_USERS_JSON bukan list, ignored")
        return []
    return users


@router.post("/login", response_model=LoginResponse)
def admin_login(req: LoginRequest):
    """Login admin via username+password, return API key untuk subsequent requests."""
    if not settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin disabled: ADMIN_API_KEY belum di-set di server.",
        )

    users = _get_admin_users()
    if not users:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin login disabled: ADMIN_USERS_JSON belum di-set. Pakai langsung X-API-Key header.",
        )

    for user in users:
        if (
            user.get("username") == req.username
            and user.get("password") == req.password
        ):
            logger.info("Admin login success: username=%s", req.username)
            return LoginResponse(
                api_key=settings.ADMIN_API_KEY,
                username=req.username,
            )

    logger.warning("Admin login failed: username=%s", req.username)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Username atau password salah.",
    )
