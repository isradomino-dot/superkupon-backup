from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from typing import Generator

from app.config import settings


def _build_engine_args(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    }


engine = create_engine(settings.DATABASE_URL, future=True, **_build_engine_args(settings.DATABASE_URL))
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

    SQLite (dev): pakai metadata.create_all langsung.
    PostgreSQL (production): pakai Alembic migrations (alembic upgrade head).
    """
    from app import models  # noqa: F401 — register models
    if settings.DATABASE_URL.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
    # untuk Postgres: lihat backend/alembic + docs/POSTGRESQL_MIGRATION.md
