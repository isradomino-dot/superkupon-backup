# Step 1 — Environment Setup

Setup workstation + Android emulator + tooling.

## Prasyarat

| Komponen | Versi | Tujuan |
|----------|-------|--------|
| Windows 10/11 | x64 | Host machine |
| Python | 3.11+ | mitmproxy + Frida tools |
| Java JDK | 17+ | Android emulator |
| Android Studio | latest | Emulator + SDK tools |
| ADB | bundled | Talk ke emulator |

## 1.1. Install Tools di Workstation

```powershell
# Activate venv backend
cd D:\Users\user27\coupon-aggregator\backend
.\.venv\Scripts\Activate.ps1

# Install mitmproxy + Frida tooling
pip install mitmproxy frida-tools

# Verify
mitmproxy --version
frida --version
```

## 1.2. Setup Android Emulator (AVD)

**Pilihan A — Android Studio AVD (recommended):**

1. Install Android Studio dari https://developer.android.com/studio
2. Buka **Device Manager** → **Create Device** → pilih:
   - Device: **Pixel 6** (atau model lain)
   - System Image: **Android 13 (Tiramisu) — Google APIs** (bukan Google Play — kita butuh root-able)
3. Boot emulator
4. Pastikan **writable system**: tutup emulator, lalu jalankan dari command line:
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Pixel_6_API_33 -writable-system -no-snapshot-load
   ```

**Pilihan B — Genymotion** (lebih ramah, $$$): https://www.genymotion.com/

## 1.3. Install mitmproxy CA Certificate di Emulator

```powershell
# 1. Start mitmproxy sekali untuk generate CA
mitmproxy
# Tekan q untuk keluar — CA sudah dibuat di ~/.mitmproxy/

# 2. Set proxy di emulator
# Di emulator: Settings → Network & Internet → Internet → tap WiFi name (gear icon) →
#   Modify → Advanced → Proxy: Manual
#   Hostname: 10.0.2.2  (host machine dari emulator)
#   Port: 8080

# 3. Push CA cert sebagai system trusted (butuh root + writable system)
adb root
adb remount

$caPath = "$env:USERPROFILE\.mitmproxy\mitmproxy-ca-cert.cer"
$hashOutput = & openssl x509 -inform PEM -subject_hash_old -in $caPath -noout
$hash = $hashOutput.Trim()

adb push $caPath /system/etc/security/cacerts/$hash.0
adb shell chmod 644 /system/etc/security/cacerts/$hash.0
adb reboot
```

> **Catatan:** Android 14+ butuh trick tambahan (cert harus disuntik via Magisk atau di-pin di `/apex/com.android.conscrypt/`). Untuk simplicity, **pakai Android 13** di emulator.

Test: buka browser di emulator → `http://mitm.it` → harus muncul halaman mitmproxy (artinya proxy + CA jalan).

## 1.4. Install Frida Server di Emulator

```powershell
# 1. Cek arch emulator
adb shell getprop ro.product.cpu.abi
# Output biasanya: x86_64

# 2. Download frida-server matching versi frida-tools
# https://github.com/frida/frida/releases/
# File: frida-server-XX.X.X-android-x86_64.xz
# Extract ke folder local

# 3. Push & jalankan
adb push .\frida-server /data/local/tmp/
adb shell "chmod 755 /data/local/tmp/frida-server"
adb shell "/data/local/tmp/frida-server &"

# 4. Verify dari workstation
frida-ps -U
# Harus list semua proses di emulator
```

## 1.5. Install App Target

Download APK dari sumber resmi (Google Play via emulator dengan Google Play image, atau APKMirror untuk yang verified):

```powershell
# Install dari APK lokal
adb install dana.apk
adb install ovo.apk
adb install tixid.apk
```

## 1.6. Bikin Akun Test

**WAJIB:** akun test, BUKAN akun pribadi.

- Pakai nomor SIM kedua / nomor virtual (Hushed, MySudo) untuk OTP
- Email khusus test (mis. `test+couponrecon@gmail.com`)
- Jangan top-up saldo besar
- Catat di audit log: nomor + tanggal pembuatan akun

## 1.7. Verifikasi Setup Lengkap

Checklist sebelum lanjut ke Step 2:

- [ ] `mitmproxy --version` jalan
- [ ] `frida --version` jalan
- [ ] Emulator boot dengan writable system
- [ ] Browser di emulator bisa buka `http://mitm.it` (artinya proxy + CA jalan)
- [ ] `frida-ps -U` list proses dari emulator
- [ ] App target (DANA/OVO/Tixid) installed
- [ ] Akun test sudah dibuat & login berhasil

Kalau semua ✓ → lanjut [Step 2](02_capture_traffic.md).
