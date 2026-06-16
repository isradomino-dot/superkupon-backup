"""Test /admin/* endpoints — auth via X-API-Key.

Reviewer #3 concern: lock /admin from public access.
Covers: 401 without key, 200 with key, 503 if ADMIN_API_KEY empty.
"""
import os
import pytest

from .conftest import TEST_ADMIN_API_KEY


# ============================================================
# Endpoints yang HARUS protected (all GET admin routes)
# ============================================================
ADMIN_ENDPOINTS = [
    ("GET", "/admin/scrapers"),
    ("GET", "/admin/scrape-logs"),
    ("GET", "/admin/recon/sessions"),
    ("GET", "/admin/proxy/stats"),
]

ADMIN_POST_ENDPOINTS = [
    ("POST", "/admin/scrape-all"),
    ("POST", "/admin/scrape/telegram_promo_aggregator"),
]


@pytest.mark.parametrize("method,path", ADMIN_ENDPOINTS + ADMIN_POST_ENDPOINTS)
def test_admin_blocked_without_key(client, method, path):
    """Semua admin endpoint return 401 tanpa X-API-Key."""
    response = client.request(method, path)
    assert response.status_code == 401, (
        f"{method} {path} harus 401 tanpa key, dapat {response.status_code}"
    )
    body = response.json()
    assert "detail" in body
    assert "X-API-Key" in body["detail"] or "Invalid" in body["detail"]


@pytest.mark.parametrize("method,path", ADMIN_ENDPOINTS)
def test_admin_blocked_with_wrong_key(client, method, path):
    """Wrong X-API-Key tetap return 401."""
    headers = {"X-API-Key": "wrong-key-not-match"}
    response = client.request(method, path, headers=headers)
    assert response.status_code == 401


@pytest.mark.parametrize("method,path", ADMIN_ENDPOINTS)
def test_admin_works_with_correct_key(client, admin_headers, method, path):
    """Correct X-API-Key allow access (200 atau valid response)."""
    response = client.request(method, path, headers=admin_headers)
    # 200 OK or 4xx for bad input — but NOT 401
    assert response.status_code != 401, (
        f"{method} {path} harusnya allow dengan correct key, dapat 401"
    )


def test_admin_scrapers_list_works(client, admin_headers):
    """/admin/scrapers harus return list of registered scrapers."""
    response = client.get("/admin/scrapers", headers=admin_headers)
    assert response.status_code == 200
    scrapers = response.json()
    assert isinstance(scrapers, list)
    assert len(scrapers) > 0
    # Pastiin google_news_promo terdaftar
    target_ids = {s.get("target_id") for s in scrapers}
    assert "google_news_promo" in target_ids
    assert "telegram_promo_aggregator" in target_ids
    assert "involve_asia_api" in target_ids


def test_admin_endpoints_di_openapi(client):
    """Admin endpoint tetep di OpenAPI spec tapi dengan dependencies (auth)."""
    response = client.get("/openapi.json")
    spec = response.json()
    paths = spec.get("paths", {})
    admin_paths = [p for p in paths if p.startswith("/admin")]
    assert len(admin_paths) >= 4, f"Admin paths terlalu sedikit: {admin_paths}"


def test_admin_disabled_if_env_empty(monkeypatch):
    """Fail-closed pattern: kalau ADMIN_API_KEY kosong, ALL admin endpoints 503.

    Ini critical security pattern — prod deploy yang lupa set env
    harus block semua admin, bukan auto-allow.
    """
    # Patch settings ADMIN_API_KEY empty
    from app import config
    monkeypatch.setattr(config.settings, "ADMIN_API_KEY", "")

    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as c:
        response = c.get("/admin/scrapers", headers={"X-API-Key": "any"})
        assert response.status_code == 503
        body = response.json()
        assert "Admin API disabled" in body["detail"]
