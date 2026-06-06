/*
 * HMAC / Mac.doFinal Interactive Decoder
 * ============================================================================
 * Tujuan:
 *   - Log SETIAP panggilan javax.crypto.Mac.doFinal di app target
 *   - Capture: algoritma, key (hex), payload (utf8 + hex), result (hex)
 *   - Output JSON-per-line → bisa di-parse oleh Python signature_reverser.py
 *
 * Cara pakai:
 *   1. Start mitmproxy (lihat ../mitmproxy/start.ps1)
 *   2. Attach script ini DI ATAS ssl_pinning_bypass.js:
 *        .\attach.ps1 -App "id.dana" -Spawn -ExtraScript "..\frida\hmac_decoder.js"
 *   3. Navigate app, picu request yang harus di-decode
 *   4. Output muncul di stdout → redirect ke file:
 *        frida ... 2>&1 | Tee-Object -FilePath ..\captures\dana_hmac_log.jsonl
 *   5. Parse di Python:
 *        python -m recon.analyzer.signature_reverser dana_hmac_log.jsonl
 *
 * SCOPE LEGAL: pakai hanya di device + akun test sendiri (lihat LEGAL_BOUNDARIES.md)
 * ============================================================================
 */

Java.perform(function () {
    console.log("[*] HMAC decoder loaded — watching Mac.doFinal calls");

    function bytesToHex(bytes) {
        if (!bytes) return null;
        var hex = "";
        for (var i = 0; i < bytes.length; i++) {
            var b = (bytes[i] & 0xff).toString(16);
            hex += (b.length === 1 ? "0" : "") + b;
        }
        return hex;
    }

    function bytesToUtf8(bytes) {
        if (!bytes) return null;
        try {
            return Java.use("java.lang.String").$new(bytes, "UTF-8");
        } catch (e) {
            return null;
        }
    }

    function emit(record) {
        record.ts = new Date().toISOString();
        try {
            console.log("[HMAC] " + JSON.stringify(record));
        } catch (e) {
            console.log("[HMAC] serialization-error: " + e.message);
        }
    }

    function reflectFieldBytes(obj, fieldName) {
        try {
            var cls = obj.getClass();
            var f = cls.getDeclaredField(fieldName);
            f.setAccessible(true);
            var val = f.get(obj);
            if (!val) return null;
            if (val.getEncoded) {
                return bytesToHex(val.getEncoded());
            }
            return val.toString();
        } catch (e) {
            return null;
        }
    }

    // --- Track Mac.init(Key) → grab key material ---
    try {
        var Mac = Java.use("javax.crypto.Mac");

        Mac.init.overload("java.security.Key").implementation = function (key) {
            this.__hmacKey = null;
            try {
                if (key && key.getEncoded) {
                    this.__hmacKey = bytesToHex(key.getEncoded());
                }
            } catch (e) {}
            return this.init(key);
        };

        Mac.init.overload("java.security.Key", "java.security.spec.AlgorithmParameterSpec").implementation = function (key, spec) {
            this.__hmacKey = null;
            try {
                if (key && key.getEncoded) {
                    this.__hmacKey = bytesToHex(key.getEncoded());
                }
            } catch (e) {}
            return this.init(key, spec);
        };

        // --- update + doFinal flow (chunked payloads) ---
        Mac.update.overload("[B").implementation = function (input) {
            if (!this.__hmacChunks) this.__hmacChunks = [];
            this.__hmacChunks.push(bytesToHex(input));
            return this.update(input);
        };

        Mac.update.overload("[B", "int", "int").implementation = function (input, offset, len) {
            if (!this.__hmacChunks) this.__hmacChunks = [];
            try {
                var copy = Java.array("byte", input).slice(offset, offset + len);
                this.__hmacChunks.push(bytesToHex(copy));
            } catch (e) {}
            return this.update(input, offset, len);
        };

        // --- doFinal: emit complete record ---
        Mac.doFinal.overload("[B").implementation = function (input) {
            var result = this.doFinal(input);
            emit({
                algo: this.getAlgorithm(),
                key_hex: this.__hmacKey || "unknown",
                payload_hex: bytesToHex(input),
                payload_utf8: bytesToUtf8(input),
                payload_len: input ? input.length : 0,
                result_hex: bytesToHex(result),
                chunks: this.__hmacChunks || [],
            });
            this.__hmacChunks = [];
            return result;
        };

        Mac.doFinal.overload().implementation = function () {
            var result = this.doFinal();
            emit({
                algo: this.getAlgorithm(),
                key_hex: this.__hmacKey || "unknown",
                payload_hex: (this.__hmacChunks || []).join(""),
                payload_utf8: null,
                payload_chunks: this.__hmacChunks || [],
                result_hex: bytesToHex(result),
                via: "update-chain",
            });
            this.__hmacChunks = [];
            return result;
        };

        console.log("[+] Hooked: javax.crypto.Mac.init / update / doFinal");
    } catch (e) {
        console.log("[-] Failed to hook Mac: " + e.message);
    }

    // --- Bonus: hook MessageDigest (SHA-256/MD5 sering dipakai sebagai body-hash) ---
    try {
        var MD = Java.use("java.security.MessageDigest");
        MD.digest.overload("[B").implementation = function (input) {
            var result = this.digest(input);
            emit({
                algo: this.getAlgorithm(),
                kind: "digest",
                payload_hex: bytesToHex(input),
                payload_utf8: bytesToUtf8(input),
                result_hex: bytesToHex(result),
            });
            return result;
        };
        console.log("[+] Hooked: MessageDigest.digest");
    } catch (e) {
        console.log("[-] Failed to hook MessageDigest: " + e.message);
    }

    // --- Bonus: hook SecretKeySpec ctor (track raw key constants) ---
    try {
        var SKS = Java.use("javax.crypto.spec.SecretKeySpec");
        SKS.$init.overload("[B", "java.lang.String").implementation = function (keyBytes, algo) {
            emit({
                algo: algo,
                kind: "key-construct",
                key_hex: bytesToHex(keyBytes),
                key_utf8: bytesToUtf8(keyBytes),
            });
            return this.$init(keyBytes, algo);
        };
        console.log("[+] Hooked: SecretKeySpec ctor");
    } catch (e) {
        console.log("[-] Failed to hook SecretKeySpec: " + e.message);
    }

    console.log("[*] Ready. Trigger app flow that calls signed endpoint.");
});
