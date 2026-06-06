/*
 * Universal SSL Pinning Bypass for Android
 * ============================================================================
 * Cakupan:
 *   - OkHttp3 CertificatePinner
 *   - X509TrustManager
 *   - TrustManagerImpl (Conscrypt — Android 7+)
 *   - WebViewClient.onReceivedSslError
 *   - HttpsURLConnection
 *   - Network Security Config (best effort)
 *
 * SCOPE LEGAL:
 *   - Pakai HANYA di device/emulator milik sendiri
 *   - Akun test, bukan akun produksi
 *   - Tujuan: documentation of public promo endpoints
 *
 * Reference (publicly documented):
 *   - OWASP MASTG MASTG-TECH-0083
 *   - Frida Codeshare ssl_pinning_bypass
 *   - HTTP Toolkit android-ssl-pinning-bypass
 * ============================================================================
 */

Java.perform(function () {
    console.log("[*] Universal SSL Pinning Bypass — loading...");

    var hooked = 0;
    var failed = 0;

    function hook(label, fn) {
        try {
            fn();
            console.log("[+] Hooked: " + label);
            hooked++;
        } catch (e) {
            console.log("[-] Skip: " + label + " (" + e.message + ")");
            failed++;
        }
    }

    // ----- OkHttp3 CertificatePinner -----
    hook("OkHttp3 CertificatePinner.check (overload 1)", function () {
        var CertPinner = Java.use("okhttp3.CertificatePinner");
        CertPinner.check.overload("java.lang.String", "java.util.List").implementation = function () {
            return;
        };
    });

    hook("OkHttp3 CertificatePinner.check (overload 2)", function () {
        var CertPinner = Java.use("okhttp3.CertificatePinner");
        CertPinner.check.overload("java.lang.String", "[Ljava.security.cert.Certificate;").implementation = function () {
            return;
        };
    });

    hook("OkHttp3 CertificatePinner.check$okhttp", function () {
        var CertPinner = Java.use("okhttp3.CertificatePinner");
        CertPinner["check$okhttp"].implementation = function () {
            return;
        };
    });

    // ----- TrustManagerImpl (Conscrypt) -----
    hook("TrustManagerImpl.verifyChain", function () {
        var TMI = Java.use("com.android.org.conscrypt.TrustManagerImpl");
        TMI.verifyChain.implementation = function (untrustedChain) {
            return untrustedChain;
        };
    });

    hook("TrustManagerImpl.checkTrustedRecursive", function () {
        var TMI = Java.use("com.android.org.conscrypt.TrustManagerImpl");
        TMI.checkTrustedRecursive.implementation = function () {
            return Java.use("java.util.ArrayList").$new();
        };
    });

    // ----- Generic X509TrustManager -----
    hook("X509TrustManager (custom)", function () {
        var X509TrustManager = Java.use("javax.net.ssl.X509TrustManager");
        var SSLContext = Java.use("javax.net.ssl.SSLContext");

        var TrustManager = Java.registerClass({
            name: "com.frida.TrustManager",
            implements: [X509TrustManager],
            methods: {
                checkClientTrusted: function () {},
                checkServerTrusted: function () {},
                getAcceptedIssuers: function () {
                    return [];
                },
            },
        });

        var TrustManagers = [TrustManager.$new()];
        var SSLContext_init = SSLContext.init.overload(
            "[Ljavax.net.ssl.KeyManager;",
            "[Ljavax.net.ssl.TrustManager;",
            "java.security.SecureRandom"
        );
        SSLContext_init.implementation = function (keyManager, trustManager, secureRandom) {
            SSLContext_init.call(this, keyManager, TrustManagers, secureRandom);
        };
    });

    // ----- WebViewClient -----
    hook("WebViewClient.onReceivedSslError", function () {
        var WVClient = Java.use("android.webkit.WebViewClient");
        WVClient.onReceivedSslError.implementation = function (view, handler, error) {
            handler.proceed();
        };
    });

    // ----- HttpsURLConnection -----
    hook("HttpsURLConnection.setDefaultHostnameVerifier", function () {
        var HUC = Java.use("javax.net.ssl.HttpsURLConnection");
        var Verifier = Java.registerClass({
            name: "com.frida.HostnameVerifier",
            implements: [Java.use("javax.net.ssl.HostnameVerifier")],
            methods: {
                verify: function () {
                    return true;
                },
            },
        });
        HUC.setDefaultHostnameVerifier(Verifier.$new());
    });

    // ----- Phone / okhttp internal CertificateChainCleaner -----
    hook("OkHttp CertificateChainCleaner", function () {
        var CCC = Java.use("okhttp3.internal.tls.CertificateChainCleaner");
        CCC.clean.implementation = function (chain, hostname) {
            return chain;
        };
    });

    // ----- BoringSSL (some Vietnam/Indonesia super-apps use this) -----
    hook("BoringSSL native check (no-op stub)", function () {
        var libSSL = Module.findExportByName("libssl.so", "SSL_CTX_set_custom_verify");
        if (libSSL) {
            Interceptor.replace(libSSL, new NativeCallback(function () {}, "void", []));
        }
    });

    console.log("[*] Done. Hooks installed: " + hooked + " | failed: " + failed);
    console.log("[*] App should now accept mitmproxy CA. Trigger your UI flow.");
});
