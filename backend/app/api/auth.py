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
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from sqlalchemy import desc, func

from app.db import get_db
from app.models import Coupon, PasswordResetRequest, User, UserClaim, UserSession
from app.utils.auth import (
    compute_session_expiry,
    generate_session_token,
    hash_password,
    verify_password,
)

PASSWORD_RESET_DURATION_HOURS = 1

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


# ============================================================
# Forgot Password — Admin Mediated Pattern
# ============================================================


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    ok: bool = True
    message: str = (
        "Kalau email lo terdaftar, request reset password udah dikirim ke admin. "
        "Hubungi admin via WhatsApp untuk dapet token reset."
    )


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=64)
    new_password: str = Field(..., min_length=6, max_length=128)


class ResetPasswordResponse(BaseModel):
    ok: bool = True
    message: str = "Password berhasil di-reset. Silakan login dengan password baru."


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    req: ForgotPasswordRequest,
    user_agent: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Request reset password — generate token, save ke DB untuk admin share.

    SECURITY: Response selalu sama (ok=True) terlepas email exists/tidak —
    anti enumeration attack. Token cuma di-create kalau email valid, tapi
    user gak tau (anti reconnaissance).
    """
    email_lower = req.email.lower().strip()
    user = db.query(User).filter_by(email=email_lower).first()

    if user and user.status != "banned":
        # Generate token + save request
        token = generate_session_token()
        expires_at = datetime.utcnow() + timedelta(hours=PASSWORD_RESET_DURATION_HOURS)
        reset = PasswordResetRequest(
            token=token,
            user_id=user.id,
            email_at_request=email_lower,
            expires_at=expires_at,
            requester_user_agent=user_agent[:500] if user_agent else None,
        )
        db.add(reset)
        db.commit()
        logger.info("Password reset request created: user_id=%s email=%s", user.id, email_lower)
    else:
        # Log tapi gak bikin entry — biar admin gak spam-able
        logger.info("Password reset for unknown/banned email: %s (no token created)", email_lower)

    # Selalu response sama
    return ForgotPasswordResponse()


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Verify token + update password. Token sekali pakai (used_at di-set)."""
    reset = db.query(PasswordResetRequest).filter_by(token=req.token).first()
    if not reset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token reset gak valid atau udah expired.",
        )

    if reset.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token reset udah pernah dipake. Request baru kalau perlu.",
        )

    if reset.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token reset udah expired. Request baru.",
        )

    user = db.query(User).filter_by(id=reset.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User gak ditemukan. Hubungi admin.",
        )

    if user.status == "banned":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun lo dinonaktifkan. Hubungi admin.",
        )

    # Update password + mark token used
    user.password_hash = hash_password(req.new_password)
    reset.used_at = datetime.utcnow()

    # Optional: invalidate semua session aktif user supaya force re-login
    db.query(UserSession).filter_by(user_id=user.id).delete()

    db.commit()
    logger.info("Password reset success: user_id=%s username=%s", user.id, user.username)

    return ResetPasswordResponse()


# ============================================================
# Profile & Stats (Member Dashboard)
# ============================================================


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=6, max_length=128)


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=32)
    email: Optional[EmailStr] = None


class RecordClaimRequest(BaseModel):
    coupon_id: int
    action: str = Field("copy", pattern="^(copy|visit)$")


class ClaimOut(BaseModel):
    id: int
    coupon_id: int
    action: str
    claimed_at: datetime
    coupon_code: Optional[str]
    coupon_title: str
    merchant_slug: str
    merchant_name: str
    category_slug: Optional[str]
    discount_type: str
    discount_value: float
    estimated_saving_idr: float


class CategoryCount(BaseModel):
    slug: str
    count: int


class MerchantCount(BaseModel):
    slug: str
    name: str
    count: int


class StatsOut(BaseModel):
    total_claims: int
    total_savings_idr: float
    favorite_category: Optional[str]
    favorite_merchant: Optional[str]
    claims_this_week: int
    claims_this_month: int
    top_categories: list[CategoryCount]
    top_merchants: list[MerchantCount]
    member_since: datetime
    days_active: int


def _estimate_saving(coupon: Coupon) -> float:
    """Estimasi penghematan Rupiah dari kupon (best-effort heuristic)."""
    if coupon.max_discount and coupon.max_discount > 0:
        return float(coupon.max_discount)
    if coupon.discount_type in ("fixed", "cashback"):
        return float(coupon.discount_value) if coupon.discount_value > 1000 else 0
    if coupon.discount_type == "percent":
        if coupon.discount_value > 0:
            return min(50000 * (coupon.discount_value / 100), 100000)
        return 0
    if coupon.discount_type == "free_shipping":
        return 25000
    if coupon.discount_type == "bogo":
        return 50000
    return 0


@router.post("/me/claims", response_model=ClaimOut, status_code=status.HTTP_201_CREATED)
def record_claim(
    req: RecordClaimRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record kupon claim — called pas user copy code atau visit merchant."""
    coupon = db.query(Coupon).filter_by(id=req.coupon_id).first()
    if not coupon:
        raise HTTPException(404, "Coupon not found")

    claim = UserClaim(
        user_id=user.id,
        coupon_id=coupon.id,
        action=req.action,
        coupon_code=coupon.code,
        coupon_title=coupon.title,
        merchant_slug=coupon.merchant.slug if coupon.merchant else "unknown",
        merchant_name=coupon.merchant.name if coupon.merchant else "Unknown",
        category_slug=coupon.category.slug if coupon.category else None,
        discount_type=coupon.discount_type,
        discount_value=float(coupon.discount_value or 0),
        estimated_saving_idr=_estimate_saving(coupon),
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    return ClaimOut(
        id=claim.id,
        coupon_id=claim.coupon_id,
        action=claim.action,
        claimed_at=claim.claimed_at,
        coupon_code=claim.coupon_code,
        coupon_title=claim.coupon_title,
        merchant_slug=claim.merchant_slug,
        merchant_name=claim.merchant_name,
        category_slug=claim.category_slug,
        discount_type=claim.discount_type,
        discount_value=claim.discount_value,
        estimated_saving_idr=claim.estimated_saving_idr,
    )


@router.get("/me/claims", response_model=list[ClaimOut])
def list_my_claims(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List my claims (paginated, latest first)."""
    rows = (
        db.query(UserClaim)
        .filter_by(user_id=user.id)
        .order_by(desc(UserClaim.claimed_at))
        .limit(min(limit, 100))
        .offset(offset)
        .all()
    )
    return [
        ClaimOut(
            id=c.id,
            coupon_id=c.coupon_id,
            action=c.action,
            claimed_at=c.claimed_at,
            coupon_code=c.coupon_code,
            coupon_title=c.coupon_title,
            merchant_slug=c.merchant_slug,
            merchant_name=c.merchant_name,
            category_slug=c.category_slug,
            discount_type=c.discount_type,
            discount_value=c.discount_value,
            estimated_saving_idr=c.estimated_saving_idr,
        )
        for c in rows
    ]


@router.get("/me/stats", response_model=StatsOut)
def get_my_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate stats untuk profile page."""
    base_q = db.query(UserClaim).filter_by(user_id=user.id)

    total_claims = base_q.count()
    total_savings = base_q.with_entities(
        func.coalesce(func.sum(UserClaim.estimated_saving_idr), 0)
    ).scalar() or 0

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    claims_this_week = base_q.filter(UserClaim.claimed_at >= week_ago).count()
    claims_this_month = base_q.filter(UserClaim.claimed_at >= month_ago).count()

    cat_rows = (
        db.query(UserClaim.category_slug, func.count(UserClaim.id).label("cnt"))
        .filter(UserClaim.user_id == user.id, UserClaim.category_slug.isnot(None))
        .group_by(UserClaim.category_slug)
        .order_by(desc("cnt"))
        .limit(5)
        .all()
    )
    top_categories = [CategoryCount(slug=r[0], count=r[1]) for r in cat_rows]

    mer_rows = (
        db.query(
            UserClaim.merchant_slug,
            UserClaim.merchant_name,
            func.count(UserClaim.id).label("cnt"),
        )
        .filter_by(user_id=user.id)
        .group_by(UserClaim.merchant_slug, UserClaim.merchant_name)
        .order_by(desc("cnt"))
        .limit(5)
        .all()
    )
    top_merchants = [MerchantCount(slug=r[0], name=r[1], count=r[2]) for r in mer_rows]

    favorite_category = top_categories[0].slug if top_categories else None
    favorite_merchant = top_merchants[0].name if top_merchants else None

    days_active = max(1, (now - user.created_at).days + 1)

    return StatsOut(
        total_claims=total_claims,
        total_savings_idr=float(total_savings),
        favorite_category=favorite_category,
        favorite_merchant=favorite_merchant,
        claims_this_week=claims_this_week,
        claims_this_month=claims_this_month,
        top_categories=top_categories,
        top_merchants=top_merchants,
        member_since=user.created_at,
        days_active=days_active,
    )


@router.patch("/me", response_model=UserOut)
def update_profile(
    req: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update username atau email."""
    if req.username is not None:
        new_username = req.username.lower().strip()
        if not USERNAME_PATTERN.match(new_username):
            raise HTTPException(400, "Username harus 3-32 karakter, hanya huruf/angka/underscore")
        if new_username != user.username:
            existing = db.query(User).filter_by(username=new_username).first()
            if existing and existing.id != user.id:
                raise HTTPException(409, "Username sudah dipakai")
            user.username = new_username

    if req.email is not None:
        new_email = req.email.lower().strip()
        if new_email != user.email:
            existing = db.query(User).filter_by(email=new_email).first()
            if existing and existing.id != user.id:
                raise HTTPException(409, "Email sudah terdaftar")
            user.email = new_email

    db.commit()
    db.refresh(user)

    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role,
        status=user.status,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )


@router.post("/me/change-password", response_model=LogoutResponse)
def change_password(
    req: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change password (butuh current password)."""
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(401, "Current password salah")

    user.password_hash = hash_password(req.new_password)
    # Invalidate semua session lain — force logout di device lain
    db.query(UserSession).filter(UserSession.user_id == user.id).delete()
    db.commit()

    logger.info("Member password changed: username=%s", user.username)
    return LogoutResponse(ok=True, message="Password berhasil diubah. Login lagi di device lain.")
