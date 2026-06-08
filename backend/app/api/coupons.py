from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, func
from sqlalchemy.orm import Session, joinedload

from app.db import get_db, is_postgres
from app.models import Coupon, Merchant, Category
from app.schemas import CouponOut


def _fuzzy_merchant_match(db: Session, token: str, threshold: float = 0.35) -> Optional[str]:
    """Toleransi typo via pg_trgm similarity. Return slug merchant terdekat (atau None).

    "shoope" → "shopee" (sim ~0.83), "tokpedia" → "tokopedia" (~0.88), "lazda" → "lazada".

    Reject overreach: kalau panjang token >2 karakter beda dari merchant name,
    anggap user lagi gabungin kata (mis. "shopeeovo") — bukan typo.
    Tanpa check ini, "shopeeovo" salah cocokin Shopee dgn similarity 0.6.

    Postgres-only; fallback None di SQLite.
    """
    if not is_postgres() or len(token) < 4:
        return None
    sim = func.similarity(func.lower(Merchant.name), token)
    row = (
        db.query(Merchant.slug, Merchant.name, sim.label("score"))
        .filter(sim >= threshold)
        .order_by(sim.desc())
        .first()
    )
    if row and abs(len(row[1]) - len(token)) <= 2:
        return row[0]
    # Coba juga match terhadap slug langsung
    sim_slug = func.similarity(func.lower(Merchant.slug), token)
    row = (
        db.query(Merchant.slug, sim_slug.label("score"))
        .filter(sim_slug >= threshold)
        .order_by(sim_slug.desc())
        .first()
    )
    if row and abs(len(row[0]) - len(token)) <= 2:
        return row[0]
    return None

router = APIRouter(prefix="/coupons", tags=["coupons"])

# Kata umum yg muncul di banyak title/desc kupon → bukan signal pencarian.
# Kalau user ngetik "kupon shopee", "shopee" itu yg penting; "kupon" buang.
INDONESIAN_STOPWORDS = {
    "kupon", "promo", "diskon", "voucher", "kode",
    "cashback", "gratis", "ongkir", "untuk", "dengan",
    "yang", "dan", "atau", "dari", "ada", "aja",
    "pakai", "buat", "rp",
}


@router.get("", response_model=List[CouponOut])
def list_coupons(
    db: Session = Depends(get_db),
    merchant: Optional[str] = Query(None, description="Filter by merchant slug"),
    category: Optional[str] = Query(None, description="Filter by category slug"),
    q: Optional[str] = Query(None, description="Search title/description/code"),
    status: Optional[str] = Query(None, description="active|expiring_soon|expired or null = active+expiring"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    min_quality: int = Query(0, ge=0, le=100),
    sort: str = Query("newest", description="newest|popular|discount|expiring|quality"),
    discount_type: Optional[str] = Query(None, description="percent|fixed|cashback|free_shipping|bogo"),
    min_discount: float = Query(0, ge=0, description="Min discount_value"),
    region: Optional[str] = Query(None, description="jakarta|bandung|surabaya|national|international|local (group: jakarta+bandung+surabaya+national)"),
):
    query = (
        db.query(Coupon)
        .options(joinedload(Coupon.merchant), joinedload(Coupon.category))
    )

    # Parse q: buang stopwords + auto-detect kalau token cocok dengan merchant/category slug.
    # Tujuannya: "shopee" → filter merchant=shopee (bukan substring match yg ngembaliin BCA-cashback-di-shopee duluan).
    q_tokens: list[str] = []
    if q:
        tokens_raw = [t for t in q.lower().split() if len(t) >= 2]
        q_tokens = [t for t in tokens_raw if t not in INDONESIAN_STOPWORDS]
        # Kalau semuanya stopword, fallback ke raw (mendingan ada hasil drpd 0)
        if not q_tokens:
            q_tokens = tokens_raw

        if q_tokens and not merchant:
            for t in list(q_tokens):
                row = db.query(Merchant.slug).filter(func.lower(Merchant.slug) == t).first()
                if row:
                    merchant = row[0]
                    q_tokens.remove(t)
                    break
            # Tier 2: fuzzy fallback kalau exact slug ga match — handle typo spt "shoope" → "shopee"
            if not merchant:
                for t in list(q_tokens):
                    fuzzy_slug = _fuzzy_merchant_match(db, t)
                    if fuzzy_slug:
                        merchant = fuzzy_slug
                        q_tokens.remove(t)
                        break
        if q_tokens and not category:
            for t in list(q_tokens):
                row = db.query(Category.slug).filter(func.lower(Category.slug) == t).first()
                if row:
                    category = row[0]
                    q_tokens.remove(t)
                    break

    if status:
        query = query.filter(Coupon.status == status)
    else:
        query = query.filter(Coupon.status.in_(["active", "expiring_soon"]))

    query = query.filter(
        or_(Coupon.expires_at.is_(None), Coupon.expires_at >= datetime.utcnow())
    )

    if merchant:
        query = query.join(Merchant).filter(Merchant.slug == merchant)
    if category:
        query = query.join(Category).filter(Category.slug == category)
    for token in q_tokens:
        pattern = f"%{token}%"
        query = query.filter(
            or_(
                Coupon.title.ilike(pattern),
                Coupon.description.ilike(pattern),
                Coupon.code.ilike(pattern),
                Coupon.merchant.has(
                    or_(
                        Merchant.name.ilike(pattern),
                        Merchant.slug.ilike(pattern),
                    )
                ),
            )
        )
    if min_quality > 0:
        query = query.filter(Coupon.quality_score >= min_quality)
    if discount_type:
        query = query.filter(Coupon.discount_type == discount_type)
    if min_discount > 0:
        query = query.filter(Coupon.discount_value >= min_discount)
    if region:
        if region == "local":
            query = query.filter(Coupon.region.in_(["jakarta", "bandung", "surabaya", "national"]))
        else:
            query = query.filter(Coupon.region == region)

    if sort == "popular":
        query = query.order_by(Coupon.view_count.desc(), Coupon.scraped_at.desc())
    elif sort == "expiring":
        query = query.order_by(Coupon.expires_at.asc().nulls_last())
    elif sort == "quality":
        query = query.order_by(Coupon.quality_score.desc(), Coupon.scraped_at.desc())
    elif sort == "discount":
        query = query.order_by(Coupon.discount_value.desc(), Coupon.scraped_at.desc())
    else:
        query = query.order_by(Coupon.scraped_at.desc())

    return query.offset(offset).limit(limit).all()


@router.get("/by-ids", response_model=List[CouponOut])
def get_coupons_by_ids(
    ids: str = Query("", description="Comma-separated coupon IDs (e.g. '1,2,3')"),
    db: Session = Depends(get_db),
):
    """Batch fetch — untuk favorites/bookmarks page."""
    if not ids:
        return []
    id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()][:200]
    if not id_list:
        return []
    return (
        db.query(Coupon)
        .options(joinedload(Coupon.merchant), joinedload(Coupon.category))
        .filter(Coupon.id.in_(id_list))
        .all()
    )


@router.get("/trending/now", response_model=List[CouponOut])
def trending_now(
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """Top kupon yang paling rame di-engage (view + redeem dgn bobot redeem 5x).

    Engagement score = view_count + (redeem_count * 5). Tie-break by quality_score.
    Hanya kupon active + belum expired.
    """
    from sqlalchemy import case
    score = func.coalesce(Coupon.view_count, 0) + func.coalesce(Coupon.redeem_count, 0) * 5
    return (
        db.query(Coupon)
        .options(joinedload(Coupon.merchant), joinedload(Coupon.category))
        .filter(Coupon.status.in_(["active", "expiring_soon"]))
        .filter(or_(Coupon.expires_at.is_(None), Coupon.expires_at >= datetime.utcnow()))
        .filter(score > 0)
        .order_by(score.desc(), Coupon.quality_score.desc())
        .limit(limit)
        .all()
    )


@router.post("/{coupon_id}/view")
def track_view(coupon_id: int, db: Session = Depends(get_db)):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(404, "Coupon not found")
    coupon.view_count += 1
    db.commit()
    return {"ok": True, "view_count": coupon.view_count}


@router.post("/{coupon_id}/redeem")
def track_redeem(coupon_id: int, db: Session = Depends(get_db)):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(404, "Coupon not found")
    coupon.redeem_count += 1
    db.commit()
    return {"ok": True, "redeem_count": coupon.redeem_count}


@router.get("/{coupon_id}", response_model=CouponOut)
def get_coupon(coupon_id: int, db: Session = Depends(get_db)):
    coupon = (
        db.query(Coupon)
        .options(joinedload(Coupon.merchant), joinedload(Coupon.category))
        .filter(Coupon.id == coupon_id)
        .first()
    )
    if not coupon:
        raise HTTPException(404, "Coupon not found")
    return coupon


@router.get("/stats/summary")
def coupon_stats(db: Session = Depends(get_db)):
    total = db.query(Coupon).count()
    active = db.query(Coupon).filter(Coupon.status == "active").count()
    expired = db.query(Coupon).filter(Coupon.status == "expired").count()
    by_merchant = (
        db.query(Merchant.slug, Merchant.name)
        .join(Coupon)
        .filter(Coupon.status == "active")
        .distinct()
        .all()
    )
    return {
        "total": total,
        "active": active,
        "expired": expired,
        "merchants": [{"slug": s, "name": n} for s, n in by_merchant],
    }
