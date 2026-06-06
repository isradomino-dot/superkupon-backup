# SuperKupon — Mobile App (Expo React Native)

Native Android/iOS companion app dari coupon aggregator. Share backend FastAPI yang sama dengan web PWA.

## Stack

- Expo SDK 52 (React Native 0.76, new architecture)
- Expo Router (file-based routing, mirip Next.js App Router)
- TypeScript strict
- Native Clipboard, Linking, gesture handler

## Quick Start

```powershell
cd D:\Users\user27\coupon-aggregator\mobile

# Install
npm install

# Start dev server
npm start
# → Tekan 'a' untuk Android emulator
# → Tekan 'i' untuk iOS simulator (macOS only)
# → Scan QR via Expo Go app di HP fisik
```

## Konfigurasi API Backend

Edit `app.json`:
```json
{
  "expo": {
    "extra": {
      "apiBase": "http://10.0.2.2:8000"   // Android emulator → host
                                          // "http://192.168.1.x:8000" untuk HP fisik di LAN
                                          // "https://api.superkupon.id" untuk production
    }
  }
}
```

## Build Production

```powershell
# Install EAS CLI
npm install -g eas-cli
eas login

# Build APK / AAB
eas build --platform android

# Build IPA (butuh Apple Developer)
eas build --platform ios

# OTA update (no app store re-submit)
eas update --branch production
```

## Struktur Routing

```
app/
├── _layout.tsx              # Stack navigator (header style, screen options)
├── index.tsx                # Home (/, hero + merchant pills + coupon list)
├── search.tsx               # /search?q=xxx
├── merchant/
│   └── [slug].tsx           # /merchant/shopee
└── coupon/
    └── [id].tsx             # /coupon/123 (detail screen)
```

## Komponen

| Component | Fungsi |
|-----------|--------|
| `CouponCard` | Card kupon dengan badge diskon, kode, copy button, link ke detail |
| `MerchantPill` | Chip merchant horizontal-scroll dengan badge count |
| `SearchBar` | Input dengan submit ke /search route |

## Trade-off vs Web PWA

| Aspek | Web PWA | Native (Expo) |
|-------|---------|---------------|
| Install effort | Browser → "Add to Home" | Play Store / TestFlight |
| Update | Instant (page reload) | Store review (atau EAS Update OTA) |
| Push notifications | Limited (Web Push) | Native (expo-notifications) |
| Performance | Good for content app | Better for heavy animation |
| Distribution | Single URL | Per-store listing |
| **Cost** | $0 hosting | $99/yr Apple + $25 Google one-time |

Rekomendasi V1 launch: **PWA dulu** (sudah selesai di `web/`), upgrade ke native saat user >10k atau push notif jadi feature critical.

## Next Steps (V3 territory)

- [ ] Push notifications via `expo-notifications` → backend webhook saat kupon baru
- [ ] Offline cache via `@tanstack/react-query` + AsyncStorage
- [ ] Bookmarks / favorites (local-first dgn sync ke backend)
- [ ] Deep linking dari Telegram bot notif → spesifik coupon screen
- [ ] Biometric auth untuk fitur "Pro" (multi-user, voting kupon)
