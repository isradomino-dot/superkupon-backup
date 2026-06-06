# DANA — Recon Playbook

Methodology untuk recon endpoint promo DANA. Bukan step-by-step exploit — referensi metodologi pentesting standar.

## Profil App

| Atribut | Value |
|---------|-------|
| Package | `id.dana` |
| Platform | Android / iOS |
| Common API hosts | `api.dana.id`, `m.dana.id`, `graph.dana.id` |
| Likely SSL pinning | OkHttp3 + custom (varies by version) |
| Likely anti-tamper | DexGuard / proprietary obfuscation |
| Auth flow | OAuth-like dengan PIN + device binding |

## Section 1 — Scope yang Boleh Direcon

✅ **In-scope:**
- Promo & voucher list (Beranda → "Kejutan" / "Promo")
- Banner & campaign aktif
- Merchant partner dengan promo (filter by partner_with_promo)
- Cashback program list

🚫 **Out-of-scope** (skip semua endpoint ini saat capture):
- `/auth/*`, `/login`, `/pin`, `/otp`
- `/balance`, `/saldo`, `/wallet`
- `/transaction/*`, `/transfer`, `/payment`
- `/user/profile`, `/user/me`
- KYC endpoints (`/kyc`, `/identity`)

## Section 2 — Capture Flow

1. Buka emulator dengan mitmproxy + Frida attached
2. Navigasi DANA app: **Home → tab "Kejutan" / "Promo"**
3. Scroll lambat, biarkan setiap card load
4. Tap "Lihat Semua Promo" — load list lengkap
5. Tap satu promo (untuk capture detail endpoint)
6. **STOP di sini** — jangan tap "Redeem" / "Pakai Sekarang" (itu masuk transaction)

Filter mitmweb:
```
~d "dana.id" & (~u "/promo" | ~u "/voucher" | ~u "/campaign" | ~u "/banner")
```

## Section 3 — Endpoint yang Biasanya Muncul

Berdasarkan public reverse engineering (hash placeholder, exact path bisa beda per versi):

| Endpoint pattern | Tier | Catatan |
|------------------|------|---------|
| `GET /v1/promotion/list` | promo-public | List promo aktif |
| `GET /v1/voucher/available` | promo-public | Voucher claimable |
| `GET /v1/banner/active?placement=home` | promo-public | Banner home |
| `GET /v1/merchant/with-promo` | merchant-catalog | Merchant + promo aktif |
| `GET /v1/campaign/detail/{id}` | promo-public | Detail kampanye |
| `POST /v1/auth/refresh-token` | auth | ⚠️ Capture sekali, **jangan replicate dengan akun lain** |
| `POST /v1/voucher/claim` | transaction | 🚫 Skip — itu state mutation |

## Section 4 — Auth & Signature Reverse

DANA biasanya pakai layered auth:

### 4.1. Token Layer (OAuth-style)
- `Authorization: Bearer <access_token>`
- Access token TTL ±1 jam
- Refresh via `/v1/auth/refresh-token` dengan refresh_token + device_id

**Strategi recon legal:**
- Login manual sekali di app dengan akun test
- Hook `SharedPreferences.getString("access_token", ...)` via Frida untuk grab token
- Simpan ke `.env` sebagai `TOKEN_DANA_TEST`
- Manual refresh kalau expire (jangan automated refresh loop)

### 4.2. Request Signature (HMAC)
DANA umumnya pakai HMAC-SHA256 dengan format:
```
signature = HMAC(secret_key, METHOD + "|" + PATH + "|" + TIMESTAMP + "|" + BODY_HASH)
```

**Cara reverse (di Frida):**
```javascript
Java.perform(function () {
    var Mac = Java.use("javax.crypto.Mac");
    Mac.doFinal.overload("[B").implementation = function (input) {
        var algo = this.getAlgorithm();
        if (algo.indexOf("HMAC") >= 0) {
            var payload = Java.use("java.lang.String").$new(input, "UTF-8");
            console.log("[HMAC " + algo + "] payload=" + payload);
        }
        var result = this.doFinal(input);
        console.log("[HMAC result] hex=" + bytesToHex(result));
        return result;
    };

    function bytesToHex(bytes) {
        var hex = "";
        for (var i = 0; i < bytes.length; i++) {
            var b = (bytes[i] & 0xff).toString(16);
            hex += (b.length === 1 ? "0" : "") + b;
        }
        return hex;
    }
});
```

Output (sample shape):
```
[HMAC HmacSHA256] payload=GET|/v1/promotion/list|1716800000000|d41d8cd...
[HMAC result] hex=a3f8b7c2e5d9...
```

Dari sini lo bisa:
1. Identifikasi payload structure
2. Cari sumber `secret_key` (biasanya: derived dari `device_id + app_secret_constant`)
3. Reproduce di Python `_sign_request()`

### 4.3. Device ID Binding

DANA bind ke device fingerprint. Untuk replicate dari Python scraper, pakai device_id yang **sama** dengan emulator test:
```powershell
# Get device_id dari emulator
adb shell settings get secure android_id
```

Simpan di `.env`:
```
DANA_DEVICE_ID=<android-id-dari-emulator>
DANA_SIGNING_KEY=<key-dari-reverse>
```

## Section 5 — Known Quirks

| Issue | Workaround |
|-------|------------|
| Custom pinning di luar OkHttp default | Pakai Frida hook tambahan untuk `id.dana.network.SecurityCheck` (decompile dulu nama class) |
| Anti-debug check pada startup | Pakai `frida -f id.dana --no-pause` (spawn mode), bukan attach mode |
| Region check (geo-fence) | Set emulator location ke koordinat ID (mis. Jakarta: -6.2,106.8) |
| App version check | Pin ke versi tertentu (download APK lama dari APKMirror), update field `User-Agent` di header |

## Section 6 — Rate Limit yang Aman

| Endpoint | Default DANA mobile | Recommended scraper interval |
|----------|---------------------|------------------------------|
| `/v1/promotion/list` | ±1 req tiap user buka beranda (~min) | **120 min** |
| `/v1/banner/active` | ±2 req per session | **180 min** |
| `/v1/merchant/with-promo` | ±1 req per filter change | **240 min** |

**Kalau dapat HTTP 429 atau 403 dengan message "abnormal traffic":**
1. STOP — jangan retry
2. Naikkan interval 2x
3. Re-recon kalau persisten — kemungkinan signature scheme sudah berubah

## Section 7 — Fallback Legal Path

Kalau recon ribet atau auth scheme terlalu sensitif:
- **Cek Involve Asia** — DANA kadang masuk affiliate inventory mereka
- **Cek partnership langsung** — DANA Bisnis ada program afiliasi untuk merchant
- **Telegram channel @danaindonesia** — promo official di-broadcast (capture via Telethon)
