# ARCHITECTURE — V1 (MVP) → V2 → V3

## V1 (current — implementasi MVP)

```
┌─────────────────────────────────────────────────────────────┐
│                  Backend (FastAPI + SQLite)                  │
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│   │  Scheduler   │───▶│   Scrapers   │───▶│  Pipeline    │ │
│   │ (APScheduler)│    │ (registry)   │    │ (norm+dedup) │ │
│   └──────────────┘    └──────┬───────┘    └──────┬───────┘ │
│                              │                    │         │
│                              ▼                    ▼         │
│                       ┌──────────────┐    ┌──────────────┐ │
│                       │ Anti-Detect  │    │   SQLite DB  │ │
│                       │ (UA/headers) │    │              │ │
│                       └──────────────┘    └──────┬───────┘ │
│                                                   │         │
│                              ┌────────────────────┘         │
│                              ▼                              │
│                       ┌──────────────┐                      │
│                       │  REST API    │                      │
│                       │  (FastAPI)   │                      │
│                       └──────┬───────┘                      │
└──────────────────────────────┼──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
         ┌──────────────┐              ┌──────────────┐
         │  Next.js PWA │              │ Telegram Bot │
         │ (installable │              │  (notifier)  │
         │  Android)    │              │              │
         └──────────────┘              └──────────────┘
```

## Scraper Lifecycle

```
1. Scheduler trigger (interval per target)
       ↓
2. Fetcher (httpx / Playwright) → raw HTML/JSON
       ↓
3. Parser (target-specific) → CouponRaw[]
       ↓
4. Normalizer → schema unified
       ↓
5. Dedup (hash + fuzzy) → buang yang sudah ada
       ↓
6. Validator → cek expired, format kode
       ↓
7. Save ke DB (Coupon + ScrapeLog)
       ↓
8. Webhook → Telegram bot kalau ada kupon baru
       ↓
9. API expose ke frontend
```

## V2 (next — production-ready)

Perubahan dari V1:
- SQLite → PostgreSQL
- APScheduler → Celery + Redis broker
- Single FastAPI → FastAPI + worker pool terpisah
- Tambah residential proxy pool
- Tambah Playwright stealth untuk anti-bot tier high

## V3 (AAA Premium)

Lihat brief studio sebelumnya — full distributed dengan ML, multi-source, mobile app native.

## Struktur Folder

```
coupon-aggregator/
├── backend/                  # Python FastAPI + scrapers
│   ├── app/
│   │   ├── main.py           # FastAPI entry
│   │   ├── config.py         # Settings (env)
│   │   ├── db.py             # SQLAlchemy session
│   │   ├── models.py         # ORM models
│   │   ├── schemas.py        # Pydantic
│   │   ├── scheduler.py      # APScheduler
│   │   ├── api/              # REST routers
│   │   ├── scrapers/         # Scraper per target
│   │   ├── pipelines/        # Normalize, dedup, validate
│   │   ├── anti_detect/      # UA/header rotation
│   │   ├── bot/              # Telegram bot
│   │   └── audit/            # targets.yaml
│   ├── requirements.txt
│   └── Dockerfile
├── web/                      # Next.js 15 PWA
│   ├── src/
│   │   ├── app/              # App router
│   │   ├── components/       # Reusable UI
│   │   └── lib/              # API client
│   ├── public/manifest.json  # PWA manifest
│   └── package.json
├── docs/
│   ├── COMPLIANCE.md         # ⚠️ Wajib baca
│   ├── ARCHITECTURE.md       # File ini
│   └── ADDING_NEW_SCRAPER.md
├── docker-compose.yml
└── README.md
```
