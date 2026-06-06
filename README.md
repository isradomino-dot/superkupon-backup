# Coupon Aggregator — V1 MVP

Aggregator kupon digital Indonesia (Shopee, DANA, OVO, Tix ID, dll) — backend FastAPI + frontend Next.js PWA yang bisa diinstall sebagai app di Android.

> ⚠️ **Wajib baca:** [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) sebelum menambah scraper target baru.

---

## Arsitektur Singkat

```
┌──────────────────┐         ┌──────────────────┐
│  Next.js 15 PWA  │  HTTP   │  FastAPI Backend │
│  (web + Android  │ ◄─────► │  + APScheduler   │
│   installable)   │         │  + SQLite        │
└──────────────────┘         └────────┬─────────┘
                                      │
                              ┌───────▼────────┐
                              │ Scraper Engine │
                              │  (5 targets)   │
                              └────────────────┘
```

Detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Quick Start — Lokal (Windows / PowerShell)

### 1. Setup Backend

```powershell
cd D:\Users\user27\coupon-aggregator\backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

Buat file `.env` di root project (lihat `.env.example`):
```powershell
Copy-Item ..\.env.example ..\.env
```

Jalankan backend:
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend siap di [http://localhost:8000](http://localhost:8000).
- Swagger docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- API root: [http://localhost:8000/](http://localhost:8000/)

Scheduler otomatis jalan saat startup — semua scraper di-trigger seketika lalu dijadwalkan per interval masing-masing.

Trigger scrape manual:
```powershell
Invoke-RestMethod -Method Post http://localhost:8000/admin/scrape-all
```

### 2. Setup Frontend

Buka terminal baru:
```powershell
cd D:\Users\user27\coupon-aggregator\web

npm install
npm run dev
```

Frontend siap di [http://localhost:3000](http://localhost:3000).

### 3. Install sebagai App di Android (PWA)

1. Buka [http://localhost:3000](http://localhost:3000) di Chrome Android (atau LAN IP komputer lo, mis. `http://192.168.1.10:3000`)
2. Tap titik tiga di pojok kanan atas → **"Tambahkan ke Layar Utama"** / **"Install app"**
3. Icon "SuperKupon" muncul di home screen — buka, jalannya seperti native app

---

## Quick Start — Docker (1-command)

```powershell
cd D:\Users\user27\coupon-aggregator

docker compose up --build -d
```

Lalu buka [http://localhost:3000](http://localhost:3000).

---

## Endpoint REST API

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/coupons` | List kupon (filter: `merchant`, `category`, `q`, `limit`, `offset`) |
| GET | `/coupons/{id}` | Detail kupon |
| GET | `/coupons/stats/summary` | Statistik kupon |
| GET | `/merchants` | List merchant |
| GET | `/merchants-with-counts` | Merchant + jumlah kupon |
| GET | `/merchants/{slug}` | Detail merchant |
| GET | `/categories` | List kategori |
| GET | `/admin/scrapers` | List semua scraper terdaftar |
| POST | `/admin/scrape/{target_id}` | Trigger 1 scraper manual |
| POST | `/admin/scrape-all` | Trigger semua scraper |
| GET | `/admin/scrape-logs` | History scrape log |

Full schema → [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI auto-generated FastAPI).

---

## Cara Tambah Scraper Baru

1. Buat file `backend/app/scrapers/nama_target.py`
2. Inherit `BaseScraper`:
   ```python
   from app.scrapers.base import BaseScraper
   from app.schemas import CouponRaw

   class MyScraper(BaseScraper):
       target_id = "my_target_id"
       merchant_slug = "merchant_x"
       name = "Merchant X Promo"
       interval_minutes = 120
       tier = "public"  # ⚠️ baca COMPLIANCE.md

       async def fetch_raw(self):
           # HTTP fetch atau pakai Playwright
           ...

       def parse(self, raw):
           return [CouponRaw(...), ...]
   ```
3. Daftarkan di `backend/app/scrapers/registry.py`
4. Tambah entry di `backend/app/audit/targets.yaml`
5. Restart backend — scheduler auto-pickup

---

## Aktivasi Telegram Bot Notifier

1. Buat bot via [@BotFather](https://t.me/BotFather)
2. Dapatkan token & channel ID
3. Isi di `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456:abc...
   TELEGRAM_CHANNEL_ID=@nama_channel
   ```
4. Tambahkan bot ke channel sebagai admin
5. Restart backend — notifier aktif otomatis tiap kupon baru ditemukan

> **Catatan:** integrasi notifier ke pipeline scraper masih stub di `app/scheduler.py`. Lihat TODO di file `app/bot/telegram_bot.py`.

---

## Roadmap Selanjutnya

V1 (current) → V2 → V3 — detail di [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

**Next steps (rekomendasi):**

1. **Phase 5 — Mobile API Recon** *(SUDAH DIBANGUN)* — toolkit lengkap di [`backend/recon/`](backend/recon/). Workflow 4-step (env setup → capture → analyze → build scraper), mitmproxy custom addon, universal SSL pinning bypass via Frida, Python analyzer + scraper code generator, playbook per app (DANA/OVO/Tixid). **Wajib baca:** [`backend/recon/LEGAL_BOUNDARIES.md`](backend/recon/LEGAL_BOUNDARIES.md).
2. **Affiliate API integration** — `involve_asia_api` & `shopee_affiliate_api` sudah disiapkan di `targets.yaml`. Apply partner program di:
   - [Involve Asia](https://involve.asia/)
   - [Shopee Affiliate](https://affiliate.shopee.co.id/)
3. **PostgreSQL migration** untuk production (ganti `DATABASE_URL`).
4. **Residential proxy pool** kalau mau scrape real target high-anti-bot.
5. **React Native / Expo app** kalau mau native Android/iOS (versi PWA current sudah cukup untuk launching).

---

## V2 / V3 Layer — Production & Premium

| Layer | Status | Detail |
|-------|--------|--------|
| **V2.1 PostgreSQL Migration** | ✅ Built | Alembic migrations, docker-compose postgres service, [`docs/POSTGRESQL_MIGRATION.md`](docs/POSTGRESQL_MIGRATION.md) |
| **V2.2 Residential Proxy Pool** | ✅ Built | ProxyManager + rotation + health check, adapters: Bright Data / Oxylabs / IPRoyal / static, admin endpoint `/admin/proxy/stats` |
| **V3.1 ML Extraction (LLM/NER)** | ✅ Built | Claude API extractor dengan prompt caching, regex fallback, Telegram channel + social media scrapers |
| **V3.2 React Native / Expo App** | ✅ Built | Native Android/iOS app di [`mobile/`](mobile/) — Expo SDK 52, file-based routing, EAS build-ready |
| **V3.3 Browser Extension** | ✅ Built | Manifest V3 di [`extension/`](extension/) — auto-detect checkout Shopee/Tokopedia/Blibli/Lazada/Bukalapak, floating widget, auto-try code |

### V2.1 PostgreSQL — Quick Switch

```powershell
# 1. Start postgres via docker-compose
docker compose up -d postgres

# 2. Update .env
# DATABASE_URL=postgresql+psycopg://coupon:coupon@localhost:5432/coupon

# 3. Run migration
cd backend
alembic upgrade head
```

### V2.2 Proxy Pool — Enable

```powershell
# .env:
# PROXY_PROVIDER=bright_data   (atau oxylabs / iproyal / static_list)
# BRIGHT_DATA_USERNAME=...
# BRIGHT_DATA_PASSWORD=...

# Test:
Invoke-RestMethod -Method Post http://localhost:8000/admin/proxy/health-check
Invoke-RestMethod http://localhost:8000/admin/proxy/stats
```

### V3.1 LLM Extraction — Enable

```powershell
# .env:
# ANTHROPIC_API_KEY=sk-ant-...
# LLM_MODEL=claude-sonnet-4-6

# Auto-aktif untuk telegram_channel & social_media scrapers
# Fallback regex jalan kalau API_KEY kosong / call gagal
```

Prompt caching otomatis aktif (system prompt + few-shot examples di-cache 5min, ~75% read cost reduction).

### V3.2 Mobile App — Run

```powershell
cd mobile
npm install
npm start
# Tekan 'a' untuk Android emulator
```

### V3.3 Browser Extension — Install

1. `chrome://extensions/` → enable Developer mode
2. Load unpacked → pilih folder [`extension/`](extension/)
3. Klik icon extension → set API base URL
4. Buka checkout Shopee/Tokopedia/dll → widget "KH" muncul di pojok

---

## Phase 5 — Mobile API Recon (DANA/OVO/Tixid)

Toolkit lengkap untuk reverse engineering endpoint promo dari mobile app:

```powershell
# 1. Install tool tambahan
pip install mitmproxy frida-tools

# 2. Setup environment (emulator + CA + frida-server)
# Detail: backend\recon\workflow\01_environment_setup.md

# 3. Start mitmproxy dengan custom recon addon
cd backend
.\recon\mitmproxy\start.ps1

# 4. Attach Frida ke app target (SSL pinning bypass otomatis)
.\recon\frida\attach.ps1 -App "id.dana"

# 5. Navigate app target → tab Promo → capture endpoints
# (mitmweb UI di http://127.0.0.1:8081)

# 6. Parse hasil capture
python -m recon.analyzer.cli parse recon\captures\session_<id>.jsonl `
  -o recon\captures\dana.endpoints.json

# 7. List & inspect endpoints
python -m recon.analyzer.cli list recon\captures\dana.endpoints.json

# 8. Auto-generate scraper Python
python -m recon.analyzer.cli generate recon\captures\dana.endpoints.json `
  --endpoint dana_promo_public_v1_promotion_list `
  --merchant dana `
  --output app\scrapers\dana_mobile.py

# 9. Register di app\scrapers\registry.py, set token di .env, restart backend
```

**Admin API endpoint untuk monitoring recon:**
- `GET /admin/recon/sessions` — history session capture
- `GET /admin/recon/catalogs` — list endpoint catalogs
- `GET /admin/recon/catalogs/{filename}` — detail catalog
- `GET /admin/recon/scope-summary` — compliance ratio (in-scope vs out-of-scope)

**Compliance gate:** [`backend/recon/LEGAL_BOUNDARIES.md`](backend/recon/LEGAL_BOUNDARIES.md) — wajib baca sebelum mulai. Boundary ketat: own device + own test account + endpoint promo publik saja.

Per-app playbook (methodology, auth flow, signature reverse hints):
- [DANA](backend/recon/playbooks/dana.md) — OAuth + HMAC + device binding
- [OVO](backend/recon/playbooks/ovo.md) — Bearer + X-Sign + geo-aware
- [Tix ID](backend/recon/playbooks/tixid.md) — JWT only, easier target

---

## Folder Structure

```
coupon-aggregator/
├── backend/                    # FastAPI + SQLite + APScheduler
│   ├── app/
│   │   ├── main.py             # Entry point
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── models.py           # SQLAlchemy ORM
│   │   ├── schemas.py          # Pydantic
│   │   ├── scheduler.py        # APScheduler
│   │   ├── api/                # REST routers (coupons, merchants, admin)
│   │   ├── scrapers/           # Per-target scrapers
│   │   ├── pipelines/          # Normalize + dedup
│   │   ├── anti_detect/        # UA/header rotation + robots.txt
│   │   ├── bot/                # Telegram notifier
│   │   └── audit/targets.yaml  # Phase 1 audit
│   ├── recon/                  # 🆕 Phase 5 — Mobile API recon toolkit
│   │   ├── LEGAL_BOUNDARIES.md # ⚠️ Wajib baca
│   │   ├── workflow/           # 4-step guide
│   │   ├── mitmproxy/          # Custom addon + filters + launcher
│   │   ├── frida/              # SSL pinning bypass + hooks
│   │   ├── analyzer/           # HAR parser + classifier + scraper gen
│   │   ├── playbooks/          # Per-app (DANA, OVO, Tix ID)
│   │   └── captures/           # Output HAR + audit log (gitignored)
│   ├── alembic/                # V2.1 — Postgres migrations
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
├── web/                        # Next.js 15 PWA
│   ├── src/
│   │   ├── app/                # App router (page, merchant, category)
│   │   ├── components/
│   │   └── lib/                # API client + types
│   ├── public/manifest.json    # PWA manifest
│   ├── package.json
│   └── Dockerfile
├── mobile/                     # 🆕 V3.2 — Expo React Native (Android/iOS)
│   ├── app/                    # Expo router screens
│   ├── src/                    # components, lib, theme
│   └── app.json
├── extension/                  # 🆕 V3.3 — Browser extension (Manifest V3)
│   ├── manifest.json
│   ├── background.js           # Service worker
│   ├── content/                # Injected widget + apply runner
│   ├── popup/                  # Settings UI
│   └── sites/                  # Per-merchant adapters
├── docs/
│   ├── COMPLIANCE.md           # ⚠️ Legal boundaries
│   ├── ARCHITECTURE.md
│   ├── ADDING_NEW_SCRAPER.md
│   └── POSTGRESQL_MIGRATION.md # V2.1 migration guide
├── docker-compose.yml
├── .env.example
└── README.md (this file)
```

---

## Disclaimer

Project ini di-design sebagai aggregator kupon dari **sumber publik** (promo landing page, channel sosmed resmi, affiliate API). Untuk monetisasi & legalitas, **path utama yang direkomendasikan = affiliate API resmi** (Involve Asia, Shopee Affiliate, dll) — bukan web scraping target high-anti-bot.

Kupon yang ditampilkan adalah hasil aggregate otomatis. Validitas dapat berubah sewaktu-waktu — selalu verifikasi di merchant asli sebelum digunakan.
