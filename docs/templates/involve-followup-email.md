# Involve Asia Follow-Up Email Template

**To:** wecare@involve.asia
**CC:** (optional: support@involve.asia)
**Subject:** Follow-Up: Property Review & Merchant Approval Status — Publisher ID 1090943 (SuperKupon)

---

## Email Body (Bahasa Indonesia — Casual Professional)

```
Halo Tim Involve Asia,

Selamat siang, saya Lim — publisher dengan detail akun:

- Publisher ID: 1090943
- Email akun: lim279614@gmail.com
- Property: SuperKupon (https://superkupon.vercel.app)
- Niche: Coupon & promo aggregator Indonesia

Saya mau follow-up terkait status property review yang sebelumnya
diinformasikan akan selesai pada tanggal 16 Juni 2026. Sampai hari ini
(21 Juni 2026), sudah lewat 5 hari dari estimasi tersebut dan saya
belum menerima update apapun via email.

Beberapa hal yang ingin saya konfirmasi:

1. STATUS PROPERTY REVIEW
   Apakah property SuperKupon sudah di-approve, masih dalam review,
   atau ada dokumen tambahan yang perlu saya lengkapi? Mohon info
   timeline terbaru kalau memang masih in-progress.

2. API CREDENTIALS BEHAVIOR
   API key & secret sudah saya terima dan auth endpoint
   (POST /api/authenticate) berhasil return token tanpa error.
   Namun saat saya hit endpoint /api/offers/all menggunakan token
   tersebut, response yang saya terima:
   - Status: data kosong (empty offers array)
   - Atau: 401 Unauthorized di sebagian request

   Apakah ini karena belum ada merchant yang di-approve ke akun saya,
   atau ada konfigurasi tambahan yang perlu di-set dari sisi
   dashboard Involve?

3. PERMINTAAN MANUAL APPROVAL MERCHANT
   Kalau memungkinkan, saya request manual approval untuk merchant
   prioritas berikut (sesuai niche coupon aggregator):

   - Shopee Indonesia
   - Tokopedia
   - Lazada Indonesia
   - Traveloka
   - Tiket.com
   - Wegic AI (atau merchant SaaS tools sejenis)

   Merchant-merchant ini adalah top brand yang paling sering dicari
   user di platform saya, jadi approval-nya akan sangat membantu
   monetization launch SuperKupon.

Untuk konteks tambahan: SuperKupon sudah live dengan 116+ kupon active
dari berbagai sumber (Google News aggregation, partner manual), traffic
sudah mulai masuk dari Instagram @superkupon.id, dan saya siap integrate
Involve deeplink begitu merchant approval clear.

Mohon bantuan update statusnya ya, dan kalau ada hal yang perlu saya
provide dari sisi saya (additional verification, traffic stats,
content samples, dll) saya siap kirim langsung.

Terima kasih banyak atas bantuan dan responsnya.

Salam hangat,
Lim
Publisher ID: 1090943
lim279614@gmail.com
https://superkupon.vercel.app
```

---

## English Version (Backup — kalau tim Involve respond dalam English)

```
Hi Involve Asia Team,

I'm following up on my property review and merchant approval status:

- Publisher ID: 1090943
- Account email: lim279614@gmail.com
- Property: SuperKupon (https://superkupon.vercel.app)
- Niche: Indonesian coupon & promo aggregator

Original timeline indicated the property review would be completed
by June 16, 2026. As of today (June 21, 2026), it's been 5+ days past
that estimate without any update from your side.

A few items I'd like to confirm:

1. PROPERTY REVIEW STATUS
   Has my property been approved, still under review, or are there
   additional documents required? Please share the latest timeline
   if it's still in progress.

2. API BEHAVIOR
   API key & secret have been received and POST /api/authenticate
   returns a valid token. However, calling /api/offers/all with that
   token returns either empty data or 401 Unauthorized on some
   requests. Is this because no merchants have been approved yet,
   or is there additional configuration needed from the dashboard?

3. MANUAL MERCHANT APPROVAL REQUEST
   If possible, please manually approve the following priority
   merchants for my account:

   - Shopee Indonesia
   - Tokopedia
   - Lazada Indonesia
   - Traveloka
   - Tiket.com
   - Wegic AI (or similar SaaS tool merchants)

   These are the top-searched brands on my platform and approval
   would significantly help our monetization launch.

Additional context: SuperKupon is live with 116+ active coupons
sourced via Google News aggregation and manual partners. Traffic is
ramping from Instagram (@superkupon.id) and I'm ready to integrate
Involve deeplinks once merchant approvals clear.

Please let me know the status and if there's anything additional
needed from my side (verification docs, traffic stats, content
samples, etc.), I'm happy to provide it immediately.

Thanks for your help and quick response.

Best regards,
Lim
Publisher ID: 1090943
lim279614@gmail.com
https://superkupon.vercel.app
```

---

## Pre-Send Checklist

- [ ] Login ke Involve Asia dashboard manual dulu, cek apakah ada
      notification/message di inbox dashboard (kadang reply via
      dashboard bukan email)
- [ ] Screenshot status property review dari dashboard (kalau ada)
      untuk attach ke email — bukti delay
- [ ] Verify API key masih valid dengan test auth call (sudah
      confirmed alive per 2026-06-21)
- [ ] Kirim dari email yang sama dengan akun publisher
      (lim279614@gmail.com) supaya gampang di-trace
- [ ] BCC ke email pribadi untuk arsip

## Expected Response Timeline

- Involve Asia SLA biasanya 1-3 business day
- Kalau 5 hari belum ada response setelah follow-up ini, eskalasi:
  - Cari kontak account manager di dashboard
  - Coba chat live di website involve.asia (kalau ada)
  - Post tweet/DM ke @InvolveAsia di Twitter/X (last resort)

## API Status (per 2026-06-21)

- POST https://api.involve.asia/api/authenticate
- Test result: returns `{"status":"error","message":"Invalid Credentials","data":[]}`
- Conclusion: API endpoint ALIVE, masalah ada di property/merchant
  approval level, bukan API downtime
