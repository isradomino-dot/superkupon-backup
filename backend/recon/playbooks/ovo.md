# OVO — Recon Playbook

## Profil App

| Atribut | Value |
|---------|-------|
| Package | `id.ovo` |
| Platform | Android / iOS |
| Common API hosts | `api.ovo.id`, `graph.ovo.id`, `promo.ovo.id` |
| Likely SSL pinning | OkHttp3 + TrustKit |
| Auth flow | Phone + PIN + biometric |
| Special trait | Banyak promo di-trigger by merchant lokasi (geo-aware) |

## Section 1 — Scope

✅ **In-scope:**
- Promo merchant partner (food, lifestyle, transport)
- Deal & cashback (OVO Cash + OVO Points)
- Banner home
- Voucher OVO yang claimable
- Merchant-with-promo list

🚫 **Out-of-scope:**
- `/auth/*`, `/login`, `/pin`, `/biometric`
- `/wallet/*`, `/balance`, `/saldo`
- `/transaction/*`, `/payment/*`
- `/user/me`, `/profile`
- `/topup/*`, `/transfer/*`

## Section 2 — Capture Flow

1. Buka OVO app dengan mitmproxy + Frida
2. Navigasi: **Home → tab "Penawaran" / "Promo"**
3. Scroll merchant list (geo-aware: ganti location emulator dulu kalau mau dapat promo regional spesifik)
4. Tap kategori (Food, Transport, Lifestyle, dll)
5. Tap satu promo card → capture detail endpoint
6. **STOP** sebelum tap "Pakai" atau "Bayar"

Filter mitmweb:
```
~d "ovo.id" & (~u "/promo" | ~u "/deal" | ~u "/voucher" | ~u "/merchant")
```

## Section 3 — Endpoint Pattern Umum

| Endpoint pattern | Tier | Catatan |
|------------------|------|---------|
| `GET /v1/deal/list?category=food` | promo-public | Filter by category |
| `GET /v1/voucher/claimable` | promo-public | Voucher available untuk user |
| `GET /v1/merchant/nearby-with-promo?lat=...&lng=...` | merchant-catalog | Geo-aware |
| `GET /v1/campaign/feed` | marketing-feed | Mixed banner + promo |
| `GET /v1/cashback/program/list` | promo-public | OVO Cashback aktif |
| `POST /v1/voucher/claim` | transaction | 🚫 Skip |

## Section 4 — Auth & Signature

### 4.1. Token
- `Authorization: Bearer <access_token>` di header
- `X-User-ID: <user_id>` opsional (banyak endpoint promo cek ini)

⚠️  **`X-User-ID` adalah identifier akun test lo** — wajar dikirim untuk endpoint personal-flavored promo. JANGAN replicate dengan user_id orang lain.

### 4.2. Request Signature
OVO umumnya pakai signature header pattern:
- `X-Sign: <base64(hmac-sha256)>`
- `X-Timestamp: <unix-seconds>`
- `X-Nonce: <random-uuid>`

Drift tolerance timestamp ±5 menit.

### 4.3. Geo-Location Header
Beberapa endpoint mandatory `X-Latitude` + `X-Longitude`:
```
X-Latitude: -6.2088
X-Longitude: 106.8456
```
(Koordinat Jakarta sebagai default — sesuaikan dengan akun test lo)

## Section 5 — Tips Khusus OVO

| Quirk | Solusi |
|-------|--------|
| Promo bervariasi per kategori user (new / regular / premium) | Pakai akun test dengan tier "regular" supaya dapat coverage tengah |
| Banner di-shuffle setiap session | Capture multiple session untuk lengkap |
| Beberapa promo hanya muncul di tertentu jam | Setup re-capture tiap shift (pagi/siang/malam) |
| Code voucher dikirim ke push notification, bukan di response | Hook `FirebaseMessagingService.onMessageReceived` via Frida |

Hook FCM untuk capture voucher code di push:
```javascript
Java.perform(function () {
    var FMService = Java.use("com.google.firebase.messaging.FirebaseMessagingService");
    FMService.onMessageReceived.implementation = function (msg) {
        console.log("[FCM] from=" + msg.getFrom() + " data=" + JSON.stringify(msg.getData()));
        return this.onMessageReceived(msg);
    };
});
```

## Section 6 — Rate Limit

| Endpoint | Recommended interval |
|----------|----------------------|
| `/v1/deal/list` | **120 min** |
| `/v1/merchant/nearby-with-promo` | **240 min** (geo-static) |
| `/v1/campaign/feed` | **60 min** untuk catch banner rotation |

## Section 7 — Fallback

- Cek **Grab affiliate** (OVO sebagian besar integrate via Grab ekosistem post-merger)
- **Tokopedia** affiliate juga cover OVO promo karena IPO + grup yang sama
