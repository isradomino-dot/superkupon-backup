# Step 2 — Capture Traffic

Capture HTTPS traffic dari app target ke mitmproxy. Karena modern apps pakai SSL pinning, kita inject Frida untuk bypass.

## 2.1. Start mitmproxy dengan Custom Addon

```powershell
cd D:\Users\user27\coupon-aggregator\backend

.\recon\mitmproxy\start.ps1
```

Atau manual:
```powershell
mitmweb --listen-host 0.0.0.0 --listen-port 8080 `
  -s recon\mitmproxy\addon_capture.py `
  --set confdir=recon\mitmproxy\.mitmproxy
```

Web UI mitmproxy → http://127.0.0.1:8081 — buat liat traffic live.

## 2.2. Attach Frida ke App (Bypass SSL Pinning)

Buka app target di emulator dulu, baru attach Frida.

```powershell
# DANA
.\recon\frida\attach.ps1 -App "id.dana"

# OVO
.\recon\frida\attach.ps1 -App "id.ovo"

# Tix ID
.\recon\frida\attach.ps1 -App "com.tix.id"
```

Atau manual:
```powershell
frida -U -l recon\frida\ssl_pinning_bypass.js -f id.dana --no-pause
```

Output harus muncul:
```
[*] SSL Pinning Bypass loaded
[+] Hooked: CertificatePinner.check
[+] Hooked: OkHttpClient (OkHTTP3)
[+] Hooked: X509TrustManager
[+] Hooked: TrustManagerImpl.verifyChain
```

Kalau ada hook yang gagal di-bind = SSL pinning custom (lihat playbook per app).

## 2.3. Trigger Endpoint yang Mau Di-capture

**Buka app target di emulator** dan navigasi ke section yang mau di-recon:

| App | Path UI | Tujuan endpoint |
|-----|---------|-----------------|
| DANA | Beranda → "Promo" / "Kejutan" | List promo aktif |
| OVO | Beranda → "Penawaran" / "Promo" | List merchant + diskon |
| Tix ID | Beranda → "Promo" tab | List promo bioskop |

**Saat lo navigasi UI, mitmweb akan log semua HTTP request.** Filter di mitmweb:
- `~d "dana.id"` → filter domain
- `~m GET` → filter method
- `~b "promo"` → filter response body contain "promo"

## 2.4. Export sebagai HAR

Setelah selesai navigasi, di mitmweb:

1. Klik **Save** icon → pilih **HAR format**
2. Simpan ke: `D:\Users\user27\coupon-aggregator\backend\recon\captures\<merchant>_session_<NNN>.har`

Format penamaan: `dana_session_001.har`, `ovo_session_001.har`, dst.

Custom addon `addon_capture.py` juga auto-save **filtered HAR** ke folder `captures/` setiap menutup mitmproxy.

## 2.5. Audit Log

Saat capture, custom addon write `captures/audit.jsonl`:

```json
{"ts": "2026-05-27T10:30:00", "session_id": "dana_001", "device": "emulator-5554", "account": "test+couponrecon@gmail.com", "endpoints_captured": 12, "tier_promo_public": 3, "tier_user_profile": 5}
```

**Wajib lengkapi audit log per session.**

## 2.6. Troubleshooting

| Gejala | Penyebab | Fix |
|--------|----------|-----|
| App crash saat dibuka | SSL pinning bypass terlalu agresif | Pakai `--no-pause` di Frida, retry dengan hook spesifik |
| Traffic kosong di mitmproxy | Proxy nggak ke-set | Recheck Settings → WiFi → Proxy = `10.0.2.2:8080` |
| `frida-ps -U` empty | Frida server nggak jalan | `adb shell "/data/local/tmp/frida-server &"` |
| Cert errors masih ada | App pakai custom pinning (BoringSSL, Conscrypt) | Lihat playbook per app, bisa butuh hook tambahan |
| App detect Frida & exit | Anti-Frida detection | Pakai `frida --runtime=v8` atau `frida-gadget` injection (advanced) |

## Next

Setelah punya HAR file → lanjut [Step 3 — Analyze](03_analyze_endpoints.md).
