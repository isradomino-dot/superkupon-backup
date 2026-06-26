"""Member auth endpoints — self-register, login, logout, me.

Beda dari `admin_auth.py` (yang pakai env-based ADMIN_USERS_JSON untuk staff/admin
dashboard /admin). Endpoint ini untuk MEMBER public yang register di superkupon.vercel.app.

Flow:
- POST /auth/register — self-register member, status auto-active untuk MVP
- POST /auth/login    — validate username/email + password, issue session token
- POST /auth/logout   — invalidate session token
- GET  /auth/me       — return current user info (butuh Bearer token)
"""
import logging
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, UserSession
from app.utils.auth import (
    compute_session_expiry,
    generate_session_token,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_]{3,32}$")


# ============================================================
# Request / Response models
# ============================================================


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    # Bisa email atau username — sistem auto-detect berdasarkan format
    identifier: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    role: str
    status: str
    created_at: datetime
    last_login_at: Optional[datetime] = None


class LoginResponse(BaseModel):
    session_token: str
    expires_at: datetime
    user: UserOut


class RegisterResponse(BaseModel):
    user: UserOut
    message: str


class LogoutResponse(BaseModel):
    ok: bool = True
    message: str = "Logout berhasil"


# ============================================================
# Dependency: get current user from Bearer token
# ============================================================


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Validate Bearer token → return User. Raises 401 kalau invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid format (expect 'Bearer <token>')",
        )

    token = authorization[7:].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty session token",
        )

    session = db.query(UserSession).filter_by(token=token).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token",
        )

    if session.expires_at < datetime.utcnow():
        # Expired — cleanup + reject
        db.delete(session)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired, please login again",
        )

    user = db.query(User).filter_by(id=session.user_id).first()
    if not user:
        # User di-delete tapi session masih ada — cleanup + reject
        db.delete(session)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.status == "banned":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun dinonaktifkan",
        )

    if user.status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun masih nunggu approval admin",
        )

    return user


# ============================================================
# Endpoints
# ============================================================


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Self-register member account. Default status="active" untuk MVP."""
    # Validate username format
    if not USERNAME_PATTERN.match(req.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username harus 3-32 karakter, hanya huruf/angka/underscore",
        )

    # Check duplicates
    email_lower = req.email.lower().strip()
    username_lower = req.username.lower().strip()

    existing_email = db.query(User).filter_by(email=email_lower).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah terdaftar. Coba login atau pakai email lain.",
        )

    existing_username = db.query(User).filter_by(username=username_lower).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username sudah dipakai. Coba username lain.",
        )

    # Create user
    user = User(
        email=email_lower,
        username=username_lower,
        password_hash=hash_password(req.password),
        role="member",
        status="active",  # MVP: auto-active. Phase 2: bisa di-set "pending" buat admin approval.
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info("New member registered: username=%s email=%s", user.username, user.email)

    return RegisterResponse(
        user=UserOut(
            id=user.id,
            email=user.email,
            username=user.username,
            role=user.role,
            status=user.status,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        ),
        message="Selamat! Akun lo udah aktif. Silakan login.",
    )


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, user_agent: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Login dengan username/email + password. Return session token."""
    identifier = req.identifier.lower().strip()

    # Try email first, then username
    user = db.query(User).filter_by(email=identifier).first()
    if not user:
        user = db.query(User).filter_by(username=identifier).first()

    if not user or not verify_password(req.password, user.password_hash):
        # Generic message — jangan kasih tau apakah email/username exist (anti enumeration)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email/username atau password salah",
        )

    if user.status == "banned":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun lo dinonaktifkan. Hubungi admin.",
        )

    if user.status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun lo masih nunggu approval admin.",
        )

    # Create session
    session = UserSession(
        token=generate_session_token(),
        user_id=user.id,
        expires_at=compute_session_expiry(),
        user_agent=user_agent[:500] if user_agent else None,
    )
    db.add(session)

    # Update last_login
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    db.refresh(user)

    logger.info("Member login: username=%s", user.username)

    return LoginResponse(
        session_token=session.token,
        expires_at=session.expires_at,
        user=UserOut(
            id=user.id,
            email=user.email,
            username=user.username,
            role=user.role,
            status=user.status,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        ),
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Logout — delete session token dari DB. Idempotent (selalu return ok)."""
    if not authorization or not authorization.startswith("Bearer "):
        return LogoutResponse()  # silent — udah gak logged-in juga

    token = authorization[7:].strip()
    if not token:
        return LogoutResponse()

    session = db.query(UserSession).filter_by(token=token).first()
    if session:
        db.delete(session)
        db.commit()
        logger.info("Member logout: user_id=%s", session.user_id)

    return LogoutResponse()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    """Return current authenticated user. Butuh valid Bearer token."""
    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role,
        status=user.status,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )
