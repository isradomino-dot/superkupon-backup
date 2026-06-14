import { ImageResponse } from "next/og";

export const alt = "SuperKupon — Aggregator Kupon Digital Indonesia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage:
            "linear-gradient(135deg, #1e1b2e 0%, #2d1b69 50%, #4c1d95 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 96,
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <span>🎟️</span>
          <span style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>SuperKupon</span>
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 36,
            fontWeight: 600,
            color: "#c4b5fd",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Aggregator Kupon Digital Indonesia
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 24,
            color: "#9ca3af",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Shopee · Tokopedia · OVO · DANA · Gojek · Grab · 22 merchant
        </div>
        <div
          style={{
            marginTop: 64,
            display: "flex",
            gap: 16,
            fontSize: 28,
          }}
        >
          <div
            style={{
              padding: "12px 28px",
              background: "rgba(139, 92, 246, 0.2)",
              borderRadius: 999,
              border: "2px solid #8b5cf6",
              color: "#c4b5fd",
              fontWeight: 700,
            }}
          >
            🔥 50+ Kupon Aktif
          </div>
          <div
            style={{
              padding: "12px 28px",
              background: "rgba(16, 185, 129, 0.2)",
              borderRadius: 999,
              border: "2px solid #10b981",
              color: "#6ee7b7",
              fontWeight: 700,
            }}
          >
            ✨ Update Otomatis
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
