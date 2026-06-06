# Frida Tooling

## `ssl_pinning_bypass.js`

Universal SSL pinning bypass. Cover 8+ teknik pinning yang umum dipakai di Android apps:

| Hook | Library/Source |
|------|----------------|
| OkHttp3 `CertificatePinner.check` (3 overload) | Square OkHttp |
| `TrustManagerImpl.verifyChain` | Conscrypt (Android 7+) |
| `TrustManagerImpl.checkTrustedRecursive` | Conscrypt |
| Custom `X509TrustManager` replacement | javax.net.ssl |
| `WebViewClient.onReceivedSslError` | Android WebView |
| `HttpsURLConnection.setDefaultHostnameVerifier` | java.net |
| `CertificateChainCleaner.clean` | OkHttp internal |
| `SSL_CTX_set_custom_verify` (native) | BoringSSL |

Disusun berdasarkan teknik yang dipublikasikan di:
- OWASP Mobile Application Security Testing Guide (MASTG)
- Frida Codeshare community scripts
- HTTP Toolkit android-ssl-pinning-bypass project

## Pakai

```powershell
# Attach ke app yang sudah jalan
.\attach.ps1 -App "id.dana"

# Spawn (lebih reliable untuk pinning yang init di startup)
.\attach.ps1 -App "id.dana" -Spawn
```

## Kalau Hook Gagal

Beberapa app pakai custom pinning (Akamai Bot Manager, custom BoringSSL build). Kalau script universal tidak cukup:

1. **Decompile APK** dengan `jadx` atau `apktool`
2. **Cari class yang implement `X509TrustManager` atau panggil `SSLContext.init`**
3. **Tulis hook custom** di file terpisah, attach via `-ExtraScript`:

```powershell
.\attach.ps1 -App "id.dana" -ExtraScript ".\dana_custom_pinning.js"
```

Template custom hook:
```javascript
Java.perform(function () {
    try {
        var CustomTrust = Java.use("id.dana.security.CustomTrustManager");
        CustomTrust.verifyChain.implementation = function (chain) {
            console.log("[+] Bypassed CustomTrustManager.verifyChain");
            return chain;
        };
    } catch (e) {
        console.log("[-] CustomTrustManager not found: " + e);
    }
});
```

## Anti-Frida Detection

Beberapa app detect Frida via:
- Cek string "frida" di `/proc/self/maps`
- Cek TCP port 27042
- Cek thread name "gum-js-loop"

Mitigasi:
- Pakai `frida --runtime=v8` (default qjs lebih mudah terdeteksi)
- Atau `frida-gadget` injection (lebih siluman, butuh patch APK)
- Atau pakai `objection patchapk -s app.apk` untuk auto-inject gadget

## Custom Signature Decoders (per-app)

Setelah SSL bypass jalan dan capture endpoint, biasanya request punya header tipe:
- `X-Signature: <hmac>`
- `X-Timestamp: <unix-ms>`
- `X-Nonce: <random>`

Untuk replicate dari Python, kita perlu reverse logic generator-nya. Caranya:

1. Cari di smali / java bytecode method yang panggil `Mac.getInstance` atau `HMAC`
2. Hook method itu via Frida, **log argumen** (key + payload)
3. Reverse `key` source (constant? derived from token? device-bound?)
4. Reproduce di Python (lihat `app/scrapers/dana_mobile.py._sign_request()` setelah generate)

Template Frida hook untuk log HMAC:
```javascript
Java.perform(function () {
    var Mac = Java.use("javax.crypto.Mac");
    Mac.doFinal.overload("[B").implementation = function (input) {
        var key = this.getAlgorithm() + " key=" + this; // adjust based on visibility
        var payload = Java.use("java.lang.String").$new(input, "UTF-8");
        console.log("[HMAC] algo=" + this.getAlgorithm() + " | payload=" + payload);
        return this.doFinal(input);
    };
});
```

## Disclaimer

Tools di sini untuk recon di **device/akun sendiri**, in-scope sesuai `../LEGAL_BOUNDARIES.md`. Out-of-scope use = ilegal & out of project support.
