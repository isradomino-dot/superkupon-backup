# Phase 5 — Mobile API Recon Toolkit

Workflow & tooling untuk reverse engineering endpoint promo dari app mobile (DANA, OVO, Tix ID, dll), supaya bisa di-replicate sebagai HTTP scraper di `app/scrapers/`.

## ⚠️ STOP — Baca Dulu

[**LEGAL_BOUNDARIES.md**](LEGAL_BOUNDARIES.md) — wajib paham scope & batasan legal sebelum mulai.

## Workflow 4-Step

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ 1. Environment   │  │ 2. Capture       │  │ 3. Analyze       │  │ 4. Build         │
│    Setup         │─▶│    Traffic       │─▶│    Endpoints     │─▶│    Scraper       │
│                  │  │                  │  │                  │  │                  │
│ - Emulator       │  │ - Start mitm     │  │ - Parse HAR      │  │ - Generate       │
│ - mitmproxy CA   │  │ - Inject Frida   │  │ - Classify tier  │  │   httpx code     │
│ - Frida server   │  │ - Use app        │  │ - Filter PII     │  │ - Plug into      │
│ - Test account   │  │ - Export HAR     │  │ - Save endpoint  │  │   scraper engine │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
       docs/01           docs/02              docs/03              docs/04
```

Detail per step:
- [`workflow/01_environment_setup.md`](workflow/01_environment_setup.md)
- [`workflow/02_capture_traffic.md`](workflow/02_capture_traffic.md)
- [`workflow/03_analyze_endpoints.md`](workflow/03_analyze_endpoints.md)
- [`workflow/04_build_scraper.md`](workflow/04_build_scraper.md)

## Struktur Folder

```
recon/
├── LEGAL_BOUNDARIES.md          # ⚠️ Wajib baca
├── README.md                     # File ini
├── workflow/                     # 4-step guide
│   ├── 01_environment_setup.md
│   ├── 02_capture_traffic.md
│   ├── 03_analyze_endpoints.md
│   └── 04_build_scraper.md
├── mitmproxy/
│   ├── addon_capture.py          # Custom addon: filter & save promo endpoints
│   ├── filters.yaml              # Domain/path whitelist per target app
│   └── start.ps1                 # PowerShell launcher
├── frida/
│   ├── ssl_pinning_bypass.js     # Universal SSL pinning bypass
│   ├── attach.ps1                # Frida launcher
│   └── README.md
├── analyzer/
│   ├── __init__.py
│   ├── har_parser.py             # Parse mitmproxy HAR → endpoint list
│   ├── classifier.py             # Tag tier: promo-public, user-profile, etc.
│   ├── replicator.py             # Generate Python scraper from captured req
│   └── cli.py                    # python -m recon.analyzer.cli parse|generate
├── playbooks/                    # Per-app methodology
│   ├── dana.md
│   ├── ovo.md
│   └── tixid.md
└── captures/                     # Output: HAR files + audit logs (gitignored)
```

## Quick Commands

```powershell
# Setup virtual env (sama dengan backend utama)
cd D:\Users\user27\coupon-aggregator\backend
.\.venv\Scripts\Activate.ps1
pip install mitmproxy frida-tools

# Start mitmproxy dengan custom addon
.\recon\mitmproxy\start.ps1

# Attach Frida ke app target (setelah app dibuka)
.\recon\frida\attach.ps1 -App "id.dana"

# Parse hasil capture jadi endpoint catalog
python -m recon.analyzer.cli parse recon\captures\dana_session_001.har --tier promo-public

# Generate scraper skeleton dari captured endpoint
python -m recon.analyzer.cli generate recon\captures\endpoint_dana_promo.json --merchant dana
```

## Output Akhir

Setelah Phase 5 selesai per app:
1. **HAR capture** disimpan di `captures/` (audit-able)
2. **Endpoint catalog JSON** — daftar endpoint + tier classification
3. **Scraper Python file** auto-generated di `app/scrapers/`
4. **Plug ke registry** — scheduler otomatis pickup

Ini path produksi yang menggantikan mock data di scraper saat ini.
