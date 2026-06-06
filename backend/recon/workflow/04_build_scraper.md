# Step 4 — Build Scraper dari Endpoint Catalog

Generate scraper Python yang plug ke `app/scrapers/` dari endpoint catalog hasil Step 3.

## 4.1. Auto-Generate Scraper Skeleton

```powershell
cd D:\Users\user27\coupon-aggregator\backend
.\.venv\Scripts\Activate.ps1

python -m recon.analyzer.cli generate `
  recon\captures\dana_endpoints_clean.json `
  --endpoint dana_promo_list `
  --merchant dana `
  --output app\scrapers\dana_mobile.py
```

Hasil: `app/scrapers/dana_mobile.py` — scraper class siap pakai, dengan field mapping otomatis dari catalog.

## 4.2. Manual Tuning yang Perlu

Generator menghasilkan skeleton lengkap, tapi 3 hal yang perlu manual:

### A. Auth Token Acquisition

Kalau endpoint butuh `Authorization: Bearer <token>`, tambah method `_get_auth_token()`:

```python
async def _get_auth_token(self) -> str:
    """Ambil token dari refresh token / login flow.

    SAFE PATH: pakai refresh token akun test yang sudah dilogin manual,
    simpan di secrets (env var TOKEN_DANA_TEST).
    JANGAN automated login flow — itu masuk teritori auth abuse.
    """
    return settings.TOKEN_DANA_TEST
```

Tambah ke `.env`:
```
TOKEN_DANA_TEST=<refresh-token-akun-test-lo>
```

### B. Request Signature (HMAC) — kalau ada

Kalau capture pakai signature header (X-Signature, X-Sign, dll), reverse logic-nya dari Frida hooks di playbook per-app. Hasil reverse jadi method:

```python
def _sign_request(self, path: str, body: str, ts: int) -> str:
    """Reproduce HMAC signature dari client.

    Reference: hasil reverse di recon/playbooks/dana.md section 4.2
    """
    secret = settings.DANA_SIGNING_KEY  # ⚠️ dari recon, simpan di env
    payload = f"{path}|{body}|{ts}"
    return hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
```

### C. Rate Limit Conservative

Mobile app endpoint sensitif ke rate abuse. **Default override ke 1 request / 30 detik**:

```python
class DanaMobileScraper(BaseScraper):
    interval_minutes = 120  # 2 jam per cycle, bukan tiap menit
    # ...

    async def fetch_raw(self):
        # Tambah jitter random
        await asyncio.sleep(random.uniform(2, 8))
        # ... actual fetch
```

## 4.3. Register ke Scraper Engine

Edit `app/scrapers/registry.py`:

```python
from app.scrapers.dana_mobile import DanaMobileScraper

REGISTRY: Dict[str, Type[BaseScraper]] = {
    # ... existing ...
    DanaMobileScraper.target_id: DanaMobileScraper,
}
```

## 4.4. Test Lokal

```powershell
# Set token di .env
Add-Content .env "`nTOKEN_DANA_TEST=<your-token>"
Add-Content .env "`nDANA_SIGNING_KEY=<your-key>"
Add-Content .env "`nSCRAPER_USE_MOCK=false"

# Restart backend
uvicorn app.main:app --reload --port 8000
```

Trigger manual:
```powershell
Invoke-RestMethod -Method Post http://localhost:8000/admin/scrape/dana_promo_mobile
```

Cek hasilnya:
```powershell
Invoke-RestMethod "http://localhost:8000/coupons?merchant=dana"
```

## 4.5. Monitoring Saat Production

| Metric | Threshold | Action |
|--------|-----------|--------|
| `scrape_logs.status = failed` >3x berturut | Token expired / endpoint berubah | Refresh token / re-recon |
| HTTP 401 / 403 | Auth invalid | Refresh token |
| HTTP 429 | Rate limited | Naikkan `interval_minutes`, tambah jitter |
| HTTP 400 + body mention "signature" | Signature scheme berubah | Re-recon, update signing logic |
| Response field hilang | App update ubah schema | Update field_mapping di catalog, regenerate |

## 4.6. Maintenance Cycle

Endpoint mobile app **akan berubah** (versi app update 1-3 bulan sekali). Plan:

1. **Tiap 4 minggu** — run capture ulang dengan versi app terbaru, diff endpoint catalog
2. **Tiap perubahan signature scheme** — re-Frida hook, update logic
3. **Tiap rotasi token expiry** — auto-refresh atau manual refresh akun test

Workflow:
```powershell
# Re-capture
.\recon\mitmproxy\start.ps1
# (use app, navigate to promo)

# Diff endpoint catalog
python -m recon.analyzer.cli diff `
  recon\captures\dana_endpoints_clean.json `
  recon\captures\dana_endpoints_new.json

# Kalau diff signifikan, regenerate scraper
python -m recon.analyzer.cli generate recon\captures\dana_endpoints_new.json ...
```

## Done

Loop kembali ke Step 2 untuk app lain (OVO, Tixid, dll), atau kembangkan ke source lain (web SPA, Telegram channel).
