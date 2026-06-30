"use client";

/**
 * GLOBAL Error Boundary — last resort untuk catch error di root layout itself
 * (yang error.tsx GAK BISA catch karena error di layout = layout gak render
 * → error.tsx yang nested di dalam layout juga gak render).
 *
 * MUST include own <html> dan <body> karena root layout gak available.
 *
 * Triggered untuk:
 *   - Error di RootLayout component itu sendiri
 *   - Error di Provider hierarchy (AuthProvider, I18nProvider, dll)
 *   - Unhandled async errors yang bubble up
 *
 * Fallback UI minimal — pure HTML + inline styles (gak depend Tailwind/CSS
 * eksternal yang mungkin juga error).
 */

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorBoundary({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="id">
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: "system-ui, -apple-system, sans-serif",
        backgroundColor: "#0a0817",
        color: "#fff",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          maxWidth: 480,
          padding: 32,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 12px" }}>
            Ups, ada error
          </h1>
          <p style={{ fontSize: 14, color: "#9ca3af", margin: "0 0 24px" }}>
            SuperKupon ngalamin error tak terduga. Coba reload halaman atau
            kembali ke beranda.
          </p>
          {error.digest && (
            <p style={{
              fontSize: 10,
              fontFamily: "monospace",
              color: "#6b7280",
              marginBottom: 24,
            }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                background: "linear-gradient(to right, #8b5cf6, #ec4899)",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              ↻ Coba lagi
            </button>
            <a
              href="/admin"
              style={{
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              🔐 Admin
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
