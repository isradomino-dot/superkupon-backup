from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from typing import Generator

from app.config import settings


def _normalize_url(url: str) -> str:
    """Normalize DB URL untuk SQLAlchemy + psycopg3.

    Railway/Heroku/Render kasih DATABASE_URL dengan prefix:
      postgres://...    (legacy Heroku)
      postgresql://...  (modern PaaS)

    SQLAlchemy default driver = psycopg2 (gak ke-install).
    Project pakai psycopg3, jadi paksa pake driver `postgresql+psycopg://`.
    """
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
