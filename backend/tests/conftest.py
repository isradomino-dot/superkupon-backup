"""Pytest fixtures untuk SuperKupon backend tests.

Strategi:
- Set env vars sebelum import app — biar settings ke-pickup
- Pakai SQLite in-memory database — fast & isolated per test
- TestClient buat HTTP testing tanpa start server
- Auto-disable scheduler & DB init di lifespan biar tests cepet
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path
from typing import Generator

import pytest

# ============================================================
# Set env vars SEBELUM import app — critical agar settings ke-pickup
# ============================================================
TEST_ADMIN_API_KEY = "test-admin-key-12345"
TEST_DB_PATH = Path(tempfile.gettempdir()) / "superkupon_test.db"

os.environ["ADMIN_API_KEY"] = TEST_ADMIN_API_KEY
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["APP_ENV"] = "test"
os.environ["DEBUG"] = "true"
os.environ["SCRAPER_USE_MOCK"] = "true"
os.environ["SCRAPER_REAL_OVERRIDES"] = ""  # Force all-mock for tests

# Pastikan backend/ ada di path untuk import "app"
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_db():
    """Remove test DB file di awal & akhir session."""
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    yield
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
        except Exception:
            pass


@pytest.fixture(scope="session")
def app():
    """FastAPI app instance — diset sebagai session scope biar gak re-import."""
    from app.main import app as _app
    # Init DB schema buat fresh test db
    from app.db import init_db
    init_db()
    return _app


@pytest.fixture
def client(app):
    """HTTP test client tanpa start server."""
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin_headers() -> dict[str, str]:
    """Header buat hit /admin/* endpoints."""
    return {"X-API-Key": TEST_ADMIN_API_KEY}


@pytest.fixture
def db_session():
    """SQLAlchemy session buat unit test pipeline/dedup directly."""
    from app.db import SessionLocal
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def reset_rate_limiter():
    """Clear in-memory rate limit bucket biar gak interfere antar test."""
    from app.api._ratelimit import _buckets
    _buckets.clear()
    yield
    _buckets.clear()
