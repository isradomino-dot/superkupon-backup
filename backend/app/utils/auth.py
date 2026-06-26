"""Auth helpers: bcrypt password hashing + session token generation.

Pattern:
- Password disimpan sebagai bcrypt hash (slow + salted).
- Session token: random 32-byte hex string, stored di DB (table user_sessions).
- Token diValidasi via lookup ke DB — bisa di-revoke instant tanpa nunggu JWT expiry.

Verifikasi user butuh 2 step:
1. Lookup session token → dapat user_id
2. Lookup user → check status (active/pending/banned)
"""
import logging
import secrets
from datetime import datetime, timedelta

import bcrypt

logger = logging.getLogger(__name__)

SESSION_TOKEN_BYTES = 32  # → 64 char hex
SESSION_DURATION = timedelta(days=30)


def hash_password(password: str) -> str:
    """Bcrypt-hash a plaintext password. Returns string (decoded utf-8)."""
    if not password:
        raise ValueError("Password tidak boleh kosong")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify plaintext password against bcrypt hash. Constant-time check."""
    if not password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except (ValueError, TypeError) as exc:
        # Malformed hash atau encoding issue — log + treat as mismatch
        logger.warning("verify_password failed: %s", exc)
        return False


def generate_session_token() -> str:
    """Generate cryptographically-secure random session token (64 char hex)."""
    return secrets.token_hex(SESSION_TOKEN_BYTES)


def compute_session_expiry() -> datetime:
    """Default session expiry — 30 days from now."""
    return datetime.utcnow() + SESSION_DURATION
