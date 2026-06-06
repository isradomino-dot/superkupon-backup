# Tix ID — Recon Playbook

## Profil App

| Atribut | Value |
|---------|-------|
| Package | `com.tix.id` |
| Platform | Android / iOS |
| Common API hosts | `api.tix.id`, `graph.tix.id` |
| Likely SSL pinning | OkHttp3 default (less hardened dibanding DANA/OVO) |
| Auth flow | Phone + OTP, no PIN required for browse |
| Difficulty | **Easier** — Tix ID lebih ramah recon |

## Section 1 — Scope

✅ **In-scope:**
- Promo bioskop & studio (CGV, Cinepolis, XXI partner, dll)
- Voucher discount tiket
- Banner home & detail movie
- Promo bayar metode pembayaran (BCA, Mandiri, ShopeePay, dll)
- Movie + cinema partner dengan harga khusus

🚫 **Out-of-scope:**
- `/auth/*`, `/login`, `/otp`
- `/booking/*` (ticket booking flow)
- `/payment/*`
- `/user/*`
- `/order/*`

## Section 2 — Capture Flow

1. Buka Tix ID dengan mitmproxy + Frida
2. Navigasi: **Beranda → tab "Promo"**
3. Scroll daftar promo
4. Tap kategori promo (Bank Partner, Diskon Tiket, Combo Deal)
5. Tap satu promo card → capture detail
6. **Kembali ke home** → tap satu film → capture detail page (sering ada promo movie-specific)
7. **STOP** sebelum tap "Pesan Tiket" / "Pilih Kursi"

Filter mitmweb:
```
~d "tix.id" & (~u "/promo" | ~u "/voucher" | ~u "/campaign" | ~u "/banner")
```

## Section 3 — Endpoint Pattern Umum

| Endpoint pattern | Tier | Catatan |
|------------------|------|---------|
| `GET /v1/promo/list` | promo-public | All promo aktif |
| `GET /v1/promo/{id}/detail` | promo-public | Detail promo + T&C |
| `GET /v1/banner/home` | promo-public | Banner home |
| `GET /v1/voucher/available` | promo-public | Voucher claimable |
| `GET /v1/cinema/{id}/promo` | promo-public | Promo per cinema |
| `GET /v1/movie/{id}/promo` | promo-public | Promo per movie |
| `POST /v1/booking/*` | transaction | 🚫 Skip |

## Section 4 — Auth

### 4.1. Token
Tix ID umumnya lebih simple:
- `Authorization: Bearer <jwt-token>`
- JWT TTL panjang (7 hari) — refresh manual ringan

### 4.2. Signature
**Kabar bagus:** banyak endpoint promo Tix ID **tidak** require signature. Hanya bearer token cukup. Verify dengan replay test — kalau bisa replicated tanpa X-Sign header → tidak perlu reverse signing logic.

### 4.3. Headers Mandatory

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <jwt>` |
| `User-Agent` | `Tix/X.X.X (Android XX; ...)` — copy persis dari capture |
| `Accept-Language` | `id-ID` |
| `X-App-Version` | `2.x.x` — sync dengan app version |

## Section 5 — Quirks

| Quirk | Solusi |
|-------|--------|
| Movie list paginated 20/page | Loop page sampai response empty |
| Promo banner rotate harian | Daily re-capture untuk catch new banners |
| Beberapa promo bank-specific (mis. promo BCA only) | Tag di field_mapping: `payment_method` |
| Image URLs di-host di CDN beda (cdn.tix.id) | Cache di scraper, atau langsung serve URL aslinya |

## Section 6 — Rate Limit

| Endpoint | Recommended interval |
|----------|----------------------|
| `/v1/promo/list` | **60 min** (Tix ID toleran) |
| `/v1/banner/home` | **120 min** |
| `/v1/cinema/*/promo` | **240 min** (jarang berubah) |

## Section 7 — Fallback

- **Instagram resmi `@tix_id`** — banyak post promo di-blast di IG; bisa scrape via official IG Graph API (kalau punya partner access) atau via `instaloader`
- **Twitter `@tix_id`** — sama, dengan API resmi
- **Affiliate dengan studio bioskop** (CGV, Cinepolis sometimes punya program afiliasi tiket online)
