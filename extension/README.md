# SuperKupon — Browser Extension (Honey-style)

Chrome / Edge / Brave extension yang otomatis menampilkan kupon yang tersedia saat user buka checkout/cart di Shopee, Tokopedia, Blibli, Lazada, Bukalapak.

## Stack

- Manifest V3 (modern Chrome extension API)
- Service worker (background.js) — handle fetch ke backend FastAPI
- Content scripts (per-site adapter) — inject floating widget di checkout
- Popup UI — konfigurasi API base + status

## Quick Install (Development)

1. Buka `chrome://extensions/` (atau `edge://extensions`)
2. Aktifkan **Developer mode** (toggle pojok kanan atas)
3. Klik **Load unpacked**
4. Pilih folder `D:\Users\user27\coupon-aggregator\extension`
5. Pin extension ke toolbar
6. Klik icon → set **API Base URL** ke `http://localhost:8000` (sesuaikan)

## Cara Pakai

1. Buka backend FastAPI di `http://localhost:8000`
2. Browse ke checkout/cart page merchant yang didukung
3. Floating button "KH" muncul di pojok kanan bawah
4. Klik → daftar kupon untuk merchant tersebut muncul
5. Tombol per kupon:
   - **Salin** — copy code ke clipboard
   - **Coba** — auto-apply kode (eksperimental, lihat note di bawah)

## Site Adapters

Selector per merchant di [`content/coupon_runner.js`](content/coupon_runner.js) (HARDCODED) dan [`sites/adapters.js`](sites/adapters.js) (extensible).

Site yang didukung default:
- Shopee Indonesia (`shopee.co.id`)
- Tokopedia (`tokopedia.com`)
- Blibli (`blibli.com`)
- Lazada Indonesia (`lazada.co.id`)
- Bukalapak (`bukalapak.com`)

Tambah site baru:
1. Edit `manifest.json` → tambahkan domain di `host_permissions` + `content_scripts.matches`
2. Edit `sites/adapters.js` → tambah entry dengan selectors
3. Reload extension

## Auto-Apply Eksperimental

Fitur "Coba" attempt apply code via simulated DOM event. **Limitations:**

- Selector merchant berubah → button tidak ke-trigger
- React/Vue controlled input butuh `nativeInputValueSetter` trick (sudah implemented)
- Banyak merchant pakai server-side validation — kode invalid akan ke-reject normal
- **Bukan brute-force**: hanya try satu code per klik, ada delay between attempts

**Compliance:**
- Tidak bypass anti-bot
- Tidak rapid-fire multiple codes
- Tidak modifikasi total/harga di client (server-side authoritative)

## Settings (Storage)

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `apiBase` | string | `http://localhost:8000` | Backend FastAPI URL |
| `autoTry` | boolean | `false` | Eksperimental: auto-try semua code (reserve) |
| `redemptions` | array | `[]` | Local log success/failure (V3: sync ke server) |

## Build Production

```powershell
# Zip for Chrome Web Store submission
Compress-Archive -Path "extension\*" -DestinationPath "kupon-hunter-v0.1.0.zip"

# Submit:
#   https://chrome.google.com/webstore/devconsole
#   $5 one-time developer fee
```

## Trade-off

| Aspek | Browser Extension | Web PWA | Mobile App |
|-------|-------------------|---------|------------|
| Auto-apply checkout | ✅ Yes | ❌ No | ❌ No |
| Discovery (browse all coupons) | ⚠️ Limited (popup) | ✅ Full | ✅ Full |
| Reach | Desktop browsers | Any device | Mobile only |
| Distribution | Chrome Web Store | URL | Play/App Store |
| **Best for** | Power users at checkout | First-time browse | Mobile-first users |

## Roadmap

- [ ] Telegram bot integration — push notif kupon expired soon
- [ ] Voting system — user mark code "worked" / "didn't work"
- [ ] Smart ordering — sort by historical success rate
- [ ] Multi-account profile (kerja vs personal)
- [ ] Sync settings across devices via Chrome Sync
