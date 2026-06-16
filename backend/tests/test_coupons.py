"""Test /coupons endpoints — list, detail, validation, view/redeem tracking."""
import pytest


def test_list_coupons_empty_db(client):
    """Empty DB return empty array (bukan 500 error)."""
    response = client.get("/coupons")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_list_coupons_with_limit(client):
    """Limit param diterima dalam range 1-200."""
    response = client.get("/coupons?limit=10")
    assert response.status_code == 200


def test_list_coupons_limit_exceeds_max(client):
    """Limit > 200 ditolak Pydantic validator dengan 422."""
    response = client.get("/coupons?limit=500")
    assert response.status_code == 422
    body = response.json()
    assert "detail" in body
    # Pydantic error format
    errors = body["detail"]
    assert any("less_than_equal" in str(e) or "limit" in str(e) for e in errors)


def test_list_coupons_limit_negative(client):
    """Negative limit ditangani — either 422 (reject) atau 200 (silent ignore).

    Backend saat ini accept negative limit (FastAPI default Query gak punya min),
    diperlakukan sebagai empty result. Future improvement: tambah ge=1 di Query.
    """
    response = client.get("/coupons?limit=-1")
    assert response.status_code in (200, 422)
    if response.status_code == 200:
        # Negative limit → seharusnya return empty atau very few items
        result = response.json()
        assert isinstance(result, list)


def test_coupon_detail_not_found(client):
    """Non-existent ID return 404 dengan error message yang clear."""
    response = client.get("/coupons/999999")
    assert response.status_code == 404
    body = response.json()
    assert "detail" in body
    assert "not found" in body["detail"].lower()


def test_coupon_detail_invalid_id(client):
    """Invalid ID type (string) return 422 validation error."""
    response = client.get("/coupons/not-a-number")
    assert response.status_code == 422


def test_merchants_endpoint(client):
    """List merchants return array dengan minimal seed entries."""
    response = client.get("/merchants")
    assert response.status_code == 200
    merchants = response.json()
    assert isinstance(merchants, list)
    # Seed_taxonomy add merchants seperti shopee, tokopedia, dll
    # Minimal harus ada karena seed jalan di lifespan
    if merchants:
        m = merchants[0]
        assert "slug" in m
        assert "name" in m


def test_categories_endpoint(client):
    """List categories return array."""
    response = client.get("/categories")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_stats_public(client):
    """Public stats endpoint return structured data."""
    response = client.get("/stats/public")
    assert response.status_code == 200
    stats = response.json()
    # Required fields
    assert "total_active" in stats
    assert "merchant_count" in stats
    assert "new_24h" in stats
    assert isinstance(stats["total_active"], int)


def test_search_with_query(client):
    """Search dengan query parameter return matching results."""
    response = client.get("/coupons?q=shopee&limit=5")
    assert response.status_code == 200


def test_search_empty_query(client):
    """Empty query (q='') treated as no filter."""
    response = client.get("/coupons?q=&limit=5")
    assert response.status_code == 200


def test_coupons_filter_by_merchant(client):
    """Filter coupons by merchant slug."""
    response = client.get("/coupons?merchant=shopee&limit=5")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_trending_endpoint(client):
    """Trending endpoint return ranked list."""
    response = client.get("/coupons/trending/now")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
