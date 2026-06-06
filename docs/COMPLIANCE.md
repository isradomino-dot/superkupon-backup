# COMPLIANCE & LEGAL BOUNDARIES

Dokumen ini wajib dibaca **sebelum menambah scraper target baru**. Tujuannya menjaga proyek tetap di zona legal dan menghindari masalah dengan UU ITE / UU PDP / ToS platform target.

## 1. Klasifikasi Tier Target

| Tier | Definisi | Contoh | Status |
|------|----------|--------|--------|
| **public** | Halaman promo yang sengaja dibuat publik oleh merchant (tujuan: marketing). | Shopee promo landing, blog kupon Indonesia | ✅ Allowed |
| **semi-public** | API resmi via partnership (affiliate program). | Shopee Affiliate API, Involve Asia | ✅ Preferred |
| **gray** | Web scrape di area abu-abu (ToS samar / belum jelas). | Endpoint web internal yang tidak didokumentasi | ⚠️ Cek case-by-case |
| **red** | Butuh login user, scrape data pribadi, atau mobile-only restricted. | Promo personal di app DANA via session user | 🚫 Forbidden |

## 2. Aturan Wajib

1. **Hormati `robots.txt`** — `app/anti_detect/fetcher.py` parse robots.txt sebelum fetch.
2. **Rate limit per domain** — default 1 request / 3 detik per target. Naikin hanya kalau target eksplisit allow.
3. **User-Agent transparent** — jangan impersonate browser asli untuk bypass anti-bot di target yang anti_bot=high. Kalau target ban scraper, **jangan paksa** — pindah ke affiliate API.
4. **Jangan simpan PII** — kalau tidak sengaja kena data user (email, phone, alamat), drop sebelum normalize.
5. **Disclaimer wajib di output publik:**
   > Kupon di-aggregate dari halaman promo publik & channel resmi merchant. Kami bukan afiliasi resmi kecuali disebutkan. Validitas kupon dapat berubah sewaktu-waktu — silakan cek di merchant asli.

## 3. Path Monetisasi yang LEGAL

Daripada main kucing-kucingan dengan anti-bot, **path scalable & legal** untuk produk ini:

1. **Affiliate API** — Involve Asia, Shopee Affiliate, Tokopedia Affiliate, ShopBack API
2. **Direct partnership** — kontak BD merchant, tawarkan placement
3. **User-generated** — fitur user-submit kupon + voting (Honey-style community)
4. **RSS / public feeds** — banyak blog kupon Indonesia punya RSS publik

## 4. Yang Boleh Dilakukan Mobile App Recon

Phase 5 (mobile API reverse engineering) **hanya** untuk:
- Mapping endpoint promo publik yang dipanggil app
- Replikasi sebagai HTTP request **dengan akun test sendiri**, bukan akun user
- Tujuan: dokumentasi struktur data, bukan account farming

**Tidak boleh:**
- Login pakai akun user lain
- Bypass SSL pinning di production phone user
- Distribusi tool reverse engineering ke publik

## 5. Kalau Ragu — Tanya

Kalau target baru tidak jelas masuk tier mana, default ke **disabled** dan diskusi dulu.
