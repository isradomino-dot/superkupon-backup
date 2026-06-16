"""Test /health endpoint — basic smoke test."""
import pytest


def test_health_returns_ok(client):
    """Backend hidup dan respond cepat."""
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body.get("status") == "ok"


def test_health_no_auth_required(client):
    """Health endpoint harus publik (gak butuh auth)."""
    response = client.get("/health")
    assert response.status_code == 200
    assert "X-API-Key" not in response.request.headers


def test_health_response_time(client):
    """Health endpoint harus fast (<1 detik)."""
    import time
    start = time.monotonic()
    response = client.get("/health")
    elapsed = time.monotonic() - start
    assert response.status_code == 200
    assert elapsed < 1.0, f"Health endpoint terlalu lama: {elapsed:.2f}s"


def test_docs_available(client):
    """Swagger docs harus accessible di production."""
    response = client.get("/docs")
    assert response.status_code == 200
    assert "swagger" in response.text.lower()


def test_openapi_spec_valid(client):
    """OpenAPI spec harus return valid JSON dengan paths."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert "paths" in spec
    assert len(spec["paths"]) > 10, "OpenAPI harus punya minimal 10 endpoints"
    # Critical endpoints harus ada
    assert "/health" in spec["paths"]
    assert "/coupons" in spec["paths"]
    assert "/stats/public" in spec["paths"]
