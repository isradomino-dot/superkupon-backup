import logging
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from typing import Generator

from app.config import settings, BASE_DIR

logger = logging.getLogger(__name__)


def is_postgres() -> bool:
    """Detect kalau engine pakai Postgres (vs SQLite fallback). Dipake buat fitur Postgres-only spt pg_trgm."""
    return engine.dialect.name == "postgresql"


def _normalize_url(url: str) -> str:
    """Normalize DB URL untuk SQLAlchemy + psycopg3.

    Railway/Heroku/Render kasih DATABASE_URL dengan prefix:
      postgres://...    (legacy Heroku)
      postgresql://...  (modern PaaS)

    SQLAlchemy default driver = psycopg2 (gak ke-install).
    Project pakai psycopg3, jadi paksa pake driver `postgresql+psycopg://`.

    Fallback: kalo DATABASE_URL kosong/invalid (misal Postgres belum
    di-link di Railway), pakai SQLite di tmp folder supaya app tetap nyala.
    """
    # Fallback ke SQLite kalo URL kosong / whitespace doang / format aneh
    if not url or not url.strip() or "://" not in url:
        fallback = f"sqlite:////tmp/coupon_fallback.db"
        logger.warning(
            "DATABASE_URL empty/invalid (%r), falling back to SQLite: %s. "
            "Data akan reset tiap restart — link Postgres service untuk persist.",
            url, fallback,
        )
        return fallback
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and "+" not in url.split("://", 1)[0]:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _build_engine_args(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    }


DATABASE_URL = _normalize_url(settings.DATABASE_URL)
engine = create_engine(DATABASE_URL, future=True, **_build_engine_args(DATABASE_URL))
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Bootstrap DB schema.

    MVP mode: create_all untuk SQLite + Postgres.
    Production yg robust: pakai Alembic migrations (`alembic upgrade head`).
    """
    from app import models  # noqa: F401 — register models
    Base.metadata.create_all(bind=engine)

    # pg_trgm: fuzzy search extension untuk toleransi typo (Postgres-only).
    # Bikin GIN index di merchant.name + slug supaya similarity() query cepat.
    if is_postgres():
        with engine.connect() as conn:
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_merchants_name_trgm "
                    "ON merchants USING gin (lower(name) gin_trgm_ops)"
                ))
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_merchants_slug_trgm "
                    "ON merchants USING gin (lower(slug) gin_trgm_ops)"
                ))
                conn.commit()
                logger.info("pg_trgm + GIN trigram indexes ready")
            except Exception as e:
                logger.warning(f"pg_trgm setup skipped: {e}")
