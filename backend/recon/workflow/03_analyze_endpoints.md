# Step 3 — Analyze Endpoints

Parse HAR capture, klasifikasi tier per endpoint, filter PII, simpan ke endpoint catalog.

## 3.1. Parse HAR

```powershell
cd D:\Users\user27\coupon-aggregator\backend
.\.venv\Scripts\Activate.ps1

python -m recon.analyzer.cli parse `
  recon\captures\dana_session_001.har `
  --output recon\captures\dana_endpoints.json
```

Output:
```
[*] Parsing recon\captures\dana_session_001.har
[*] Found 47 requests
[*] Filtered to 32 unique endpoints (deduped by method+path)
[*] Classified:
    promo-public      : 4
    marketing-feed    : 7
    merchant-catalog  : 3
    user-profile      : 8   [⚠️  SKIPPED — out of scope]
    transaction       : 6   [⚠️  SKIPPED — out of scope]
    auth              : 4   [⚠️  SKIPPED — out of scope]
[*] Saved 14 in-scope endpoints to recon\captures\dana_endpoints.json
```

## 3.2. Lihat Hasil Klasifikasi

```powershell
python -m recon.analyzer.cli list recon\captures\dana_endpoints.json
```

Output sample:
```
┌─────────────────────────────────────────────────┬────────┬──────────────────┬─────────────┐
│ URL                                             │ Method │ Tier             │ Sample Size │
├─────────────────────────────────────────────────┼────────┼──────────────────┼─────────────┤
│ https://api.dana.id/v1/promo/list               │ GET    │ promo-public     │ 12 promos   │
│ https://api.dana.id/v1/banners/active           │ GET    │ promo-public     │ 6 banners   │
│ https://api.dana.id/v1/feed/highlights          │ GET    │ marketing-feed   │ 8 items     │
│ https://api.dana.id/v1/merchants/with-promo     │ GET    │ merchant-catalog │ 23 merchant │
└─────────────────────────────────────────────────┴────────┴──────────────────┴─────────────┘
```

## 3.3. Inspect Sample Response

```powershell
python -m recon.analyzer.cli inspect recon\captures\dana_endpoints.json `
  --endpoint "/v1/promo/list"
```

Output: pretty-print request headers + response body sample. Cek manual:
- Apakah ada field PII (user_id, phone, email)?
- Apakah ada signature/timestamp/nonce di header yang butuh di-reverse?
- Apakah response stable across multiple captures?

## 3.4. Filter PII

Auto-filter sudah jalan di parser, tapi kalau ada field yang lolos:

```powershell
python -m recon.analyzer.cli filter recon\captures\dana_endpoints.json `
  --drop-field "user_id,phone,email,device_id,fingerprint" `
  --output recon\captures\dana_endpoints_clean.json
```

## 3.5. Identify Auth/Signature Requirements

Cek header yang harus dipertahankan saat replicate:

```powershell
python -m recon.analyzer.cli auth-deps recon\captures\dana_endpoints.json `
  --endpoint "/v1/promo/list"
```

Output:
```
Required headers untuk replicate /v1/promo/list:
  - Authorization: Bearer <token>          [token dari /login — DURATION: 1 jam]
  - X-Signature: <hmac-sha256>             [HMAC, key dari OAuth flow]
  - X-Timestamp: <unix-ms>                 [unix timestamp, drift toleransi ±300s]
  - X-Device-Id: <static-uuid>             [static per install, regen jika invalid]
  - User-Agent: DANA/2.x.x (Android)       [exact match required]
```

Kalau ada signature/HMAC custom → butuh decode lebih dalam (lihat playbook per app).

## 3.6. Save Endpoint Catalog

Final output: `recon/captures/<merchant>_endpoints_clean.json`:

```json
{
  "merchant": "dana",
  "captured_at": "2026-05-27T10:30:00",
  "in_scope_endpoints": [
    {
      "id": "dana_promo_list",
      "url": "https://api.dana.id/v1/promo/list",
      "method": "GET",
      "tier": "promo-public",
      "auth_required": true,
      "auth_strategy": "bearer + hmac-signature",
      "sample_response_path": "captures/samples/dana_promo_list_sample.json",
      "field_mapping": {
        "code": "$.data.promotions[*].voucher_code",
        "title": "$.data.promotions[*].title",
        "description": "$.data.promotions[*].terms_short",
        "discount_value": "$.data.promotions[*].discount_amount",
        "discount_type": "$.data.promotions[*].discount_unit",
        "expires_at": "$.data.promotions[*].valid_until",
        "merchant_logo": "$.data.promotions[*].partner_logo"
      }
    }
  ]
}
```

## Next

Endpoint catalog ready → lanjut [Step 4 — Build Scraper](04_build_scraper.md).
