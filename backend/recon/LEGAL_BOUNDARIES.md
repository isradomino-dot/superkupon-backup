# ⚠️ LEGAL BOUNDARIES — Wajib Baca Sebelum Mulai Recon

Workflow di folder `recon/` ini menggunakan teknik **mobile app reverse engineering** (mitmproxy + Frida + SSL pinning bypass). Tools ini legal & widely used di security research (OWASP MASTG, DEF CON, mobile pentesting), TAPI penggunaannya bisa masuk teritori ilegal kalau melewati batas berikut.

## Yang DIBOLEHKAN (in-scope untuk proyek ini)

| ✅ Allowed | Penjelasan |
|---|---|
| Recon di **device/emulator sendiri** | Genymotion, Android Studio AVD, atau HP fisik milik sendiri |
| Pakai **akun test sendiri** | Akun DANA/OVO/Tixid yang lo daftarin sendiri pakai nomor sendiri |
| Capture **endpoint promo/marketing publik** | Endpoint yang serve data promo yang sama dengan landing page web (data publik, format mobile) |
| **Dokumentasi struktur endpoint** | Method, path, request shape, response shape — untuk reverse-engineering pipeline |
| **Replicate sebagai HTTP scraper** | Pakai `httpx`/`requests` dari Python untuk fetch endpoint yang sama, dengan akun test sendiri |
| **Bypass SSL pinning di test device** | Untuk inspect traffic di device milik sendiri (standard pentesting practice) |

## Yang DILARANG (out-of-scope, ILEGAL)

| 🚫 Forbidden | Penalti |
|---|---|
| Capture traffic dari **device/akun user lain** | UU ITE Pasal 30 (akses ilegal) — pidana |
| Bypass authentication untuk **akses data orang lain** | UU ITE Pasal 30 + Pasal 32 (modifikasi data) — pidana |
| **Account farming** atau massal request pakai banyak akun fake | UU ITE Pasal 35 + ToS violation — pidana + perdata |
| Modifikasi response untuk **fraud** (claim promo palsu, double redeem) | Pidana penipuan + UU ITE |
| **Distribusi tool reverse engineering** ke publik untuk bypass anti-bot | ToS violation skala besar — perdata berat |
| **Scrape data PII** (nama, email, phone user) | UU PDP — denda + pidana |
| Reverse signature/encryption untuk **mass automation** > rate normal user | Akan dilihat sebagai DoS / abuse |

## Aturan Operasional

1. **Single device, single test account.** Recon hanya di 1 emulator + 1 akun test per app.
2. **Rate limit manusiawi.** Jangan hammer endpoint setelah ketemu — itu memicu deteksi & memperburuk situasi legal.
3. **Drop PII di pipeline.** Kalau response ngeluarin data user (nama, email, transaction history), filter sebelum simpan ke DB.
4. **Capture log audit-able.** Semua session recon disimpan dengan timestamp + device ID + akun yang dipakai. Disimpan di `backend/recon/captures/`.
5. **Stop kalau target deteksi.** Kalau app mulai return error/captcha/block, hentikan. Jangan paksa bypass lebih dalam.
6. **Tidak distribusi ke production users.** Hasil recon dipakai untuk **internal scraper engine** yang fetch promo dengan akun test sendiri, output di-aggregate ke user akhir (yang hanya melihat info publik kupon, bukan akses langsung ke app target).

## Risk Tier per Endpoint

Setiap captured endpoint diklasifikasi di analyzer:

| Tier | Contoh | Boleh dipakai? |
|------|--------|----------------|
| `promo-public` | `/v1/promo/list`, `/banners/active` | ✅ Yes |
| `marketing-feed` | `/v1/feed/highlights` | ✅ Yes (filter PII) |
| `merchant-catalog` | `/v1/merchants/active-promos` | ✅ Yes |
| `user-profile` | `/v1/user/me`, `/balance` | 🚫 No |
| `transaction` | `/v1/transactions/*` | 🚫 No |
| `auth` | `/v1/login`, `/otp` | 🚫 No (capture sekali untuk dokumentasi, **jangan replicate**) |

## Sebelum Mulai — Checklist

- [ ] Sudah baca dokumen ini sampai habis
- [ ] Emulator/device test sudah disiapkan (bukan device daily-use)
- [ ] Akun test sudah dibuat (nomor SIM test, bukan nomor pribadi)
- [ ] Saldo akun test minimal (jangan top-up besar)
- [ ] Audit log siap dicatat
- [ ] Paham scope yang boleh & dilarang di atas

Kalau ada item belum centang → **JANGAN MULAI**.

---

## Jalur Alternatif yang LEBIH LEGAL

Sebelum masuk recon, evaluasi dulu apakah affiliate API resmi cukup:

- **Involve Asia** — affiliate network, cover Shopee/Tokopedia/Lazada/dll → `https://involve.asia/`
- **Shopee Affiliate Open API** → `https://affiliate.shopee.co.id/`
- **Tokopedia Affiliate** → via Mitra Tokopedia
- **Direct partnership** — kontak BD masing-masing platform

Affiliate API = **legal + monetizable + stable**. Recon = backup kalau API resmi tidak cover use case spesifik (mis. promo regional yang nggak masuk feed affiliate).
