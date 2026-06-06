# Cara Tambah Scraper Baru — Step by Step

## 1. Audit Target Dulu (Phase 1)

Sebelum nulis kode, isi entry baru di [`backend/app/audit/targets.yaml`](../backend/app/audit/targets.yaml):

```yaml
- id: my_target_id              # unique slug
  name: "Display Name"
  merchant: my_merchant
  url: "https://..."
  tier: public                  # public | semi-public | gray | red
  anti_bot: low                 # none | low | medium | high
  render: static                # static | dynamic
  method: http                  # http | playwright | api | telegram
  status: dev
  notes: |
    Catatan tentang struktur halaman, anti-bot, dll.
```

**Wajib cek tier!** Lihat [`COMPLIANCE.md`](COMPLIANCE.md):
- `tier: red` → 🚫 jangan dilanjut
- `tier: gray` → diskusi dulu
- `tier: public` / `semi-public` → lanjut

## 2. Tulis Scraper File

Buat `backend/app/scrapers/my_target.py`:

```python
from typing import List
from bs4 import BeautifulSoup

from app.config import settings
from app.anti_detect.fetcher import fetch
from app.scrapers.base import BaseScraper
from app.schemas import CouponRaw
from app.pipelines.normalizer import normalize_discount


class MyTargetScraper(BaseScraper):
    target_id = "my_target_id"
    merchant_slug = "my_merchant"
    name = "My Target Promo"
    interval_minutes = 120
    tier = "public"

    async def fetch_raw(self) -> str:
        if settings.SCRAPER_USE_MOCK:
            return "<html>...</html>"  # mock HTML untuk dev
        resp = await fetch("https://example.com/promo")
        return resp.text

    def parse(self, raw: str) -> List[CouponRaw]:
        soup = BeautifulSoup(raw, "lxml")
        items: List[CouponRaw] = []

        for card in soup.select(".promo-card"):
            title = card.select_one(".title").get_text(strip=True)
            disc_type, disc_value = normalize_discount(title)

            items.append(CouponRaw(
                code=card.select_one(".code").get_text(strip=True),
                title=title,
                discount_type=disc_type,
                discount_value=disc_value,
                merchant_slug=self.merchant_slug,
                source_url="https://example.com/promo",
                source_target=self.target_id,
            ))

        return items
```

Reference: lihat [`app/scrapers/sample_blog.py`](../backend/app/scrapers/sample_blog.py) untuk template lengkap.

## 3. Daftarkan di Registry

Edit `backend/app/scrapers/registry.py`:

```python
from app.scrapers.my_target import MyTargetScraper

REGISTRY: Dict[str, Type[BaseScraper]] = {
    # ... existing entries ...
    MyTargetScraper.target_id: MyTargetScraper,
}
```

## 4. Test Lokal

```powershell
# Test 1 scraper via API
Invoke-RestMethod -Method Post http://localhost:8000/admin/scrape/my_target_id

# Cek hasilnya
Invoke-RestMethod http://localhost:8000/coupons?merchant=my_merchant
```

## 5. Tambah Logo & Display Name (Optional)

Edit `backend/app/main.py` di `_seed_taxonomy()`:

```python
seed_merchants = [
    # ...
    ("my_merchant", "My Merchant", "https://example.com", "/logos/my_merchant.png"),
]
```

Drop logo PNG/SVG ke `web/public/logos/my_merchant.png`.

## 6. Restart Backend

Scheduler akan auto-pickup scraper baru. Done.

---

## Tips

- **Anti-bot tinggi?** Pakai Playwright (`render: dynamic`, `method: playwright`). Contoh setup ada di skeleton `backend/app/scrapers/shopee.py`.
- **API resmi tersedia?** Selalu prefer ini — tier `semi-public`. Lebih stable, lebih legal.
- **Source dari sosmed/Telegram?** Gunakan Telethon (Python Telegram client) — sudah ada di stack.
- **Selector pecah?** ScrapeLog akan catat error. Cek via `GET /admin/scrape-logs`.
