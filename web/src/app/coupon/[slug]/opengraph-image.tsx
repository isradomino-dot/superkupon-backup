import { ImageResponse } from "next/og";

import type { Coupon } from "@/lib/types";

export const runtime = "edge";
export const alt = "SuperKupon — Kode Promo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_BASE_ABSOLUTE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://superkupon-backend-production.up.railway.app";

function formatDiscount(c: Coupon): string {
  if (c.discount_type === "percent") return `${Math.round(c.discount_value)}%`;
  if (c.discount_type === "fixed") {
    const v = c.discount_value;
    if (v >= 1000) return `Rp ${Math.round(v / 1000)}K`;
    return `Rp ${v}`;
  }
  if (c.discount_type === "cashback") return `${Math.round(c.discount_value)}% CB`;
  if (c.discount_type === "free_shipping") return "GRATIS ONGKIR";
  if (c.discount_type === "bogo") return "BELI 1 GRATIS 1";
  return `${Math.round(c.discount_value)}%`;
}

function formatMaxDiscount(c: Coupon): string | null {
  if (!c.max_discount) return null;
  if (c.max_discount >= 1000) return `Hemat hingga Rp ${Math.round(c.max_discount / 1000)}K`;
  return `Hemat hingga Rp ${c.max_discount}`;
}

function formatExpiryShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function FallbackOg() {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: "linear-gradient(135deg, #1e1b2e 0%, #2d1b69 50%, #4c1d95 100%)",
        color: "white",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 96, display: "flex", alignItems: "center", gap: 24 }}>
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
    </div>
  );
}

function OgCard({ coupon }: { coupon: Coupon }) {
  const discount = formatDiscount(coupon);
  const maxDiscount = formatMaxDiscount(coupon);
  const expiry = formatExpiryShort(coupon.expires_at);
  const code = coupon.code || "OTOMATIS";
  const merchantName = truncate(coupon.merchant.name, 28);
  const title = truncate(coupon.title, 90);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "row",
        backgroundImage: "linear-gradient(135deg, #1e1b2e 0%, #2d1b69 50%, #4c1d95 100%)",
        color: "white",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* LEFT half — giant discount */}
      <div
        style={{
          width: 520,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          borderRight: "2px dashed rgba(196, 181, 253, 0.25)",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "0.2em",
            color: "#c4b5fd",
            textTransform: "uppercase",
          }}
        >
          Diskon
        </div>
        <div
          style={{
            fontSize: discount.length > 6 ? 110 : 180,
            fontWeight: 900,
            color: "#c4b5fd",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          {discount}
        </div>
        {maxDiscount && (
          <div
            style={{
              marginTop: 20,
              fontSize: 22,
              fontWeight: 600,
              color: "#a78bfa",
              textAlign: "center",
            }}
          >
            {maxDiscount}
          </div>
        )}
      </div>

      {/* RIGHT half — merchant + title + code */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "56px 56px 56px 48px",
          position: "relative",
        }}
      >
        {/* logo top-right */}
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 32,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 22,
            fontWeight: 800,
            color: "#e9d5ff",
            letterSpacing: "-0.01em",
          }}
        >
          <span>🎟️</span>
          <span>SuperKupon</span>
        </div>

        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "0.18em",
            color: "#a78bfa",
            textTransform: "uppercase",
            marginTop: 16,
          }}
        >
          Kode Promo
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.02em",
            marginTop: 4,
          }}
        >
          {merchantName}
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: "#e5e7eb",
            lineHeight: 1.2,
            marginTop: 16,
            maxWidth: 580,
            display: "flex",
          }}
        >
          {title}
        </div>

        {/* Code box */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexDirection: "column",
            alignSelf: "flex-start",
            padding: "14px 22px",
            borderRadius: 14,
            border: "2px dashed #8b5cf6",
            background: "rgba(139, 92, 246, 0.18)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "#c4b5fd",
              textTransform: "uppercase",
            }}
          >
            Kode
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              color: "white",
              letterSpacing: "0.06em",
              marginTop: 2,
            }}
          >
            {code}
          </div>
        </div>
      </div>

      {/* BOTTOM strip */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 40px",
          background: "rgba(15, 11, 36, 0.6)",
          borderTop: "1px solid rgba(196, 181, 253, 0.15)",
          fontSize: 22,
          fontWeight: 600,
          color: "#e9d5ff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>🔥</span>
          <span>{expiry ? `Berlaku sampai ${expiry}` : "Klaim sekarang juga"}</span>
        </div>
        <div style={{ color: "#a78bfa", fontWeight: 700 }}>superkupon.vercel.app</div>
      </div>
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const id = Number(slug.split("-")[0]);
  if (!Number.isFinite(id) || id <= 0) {
    return new ImageResponse(<FallbackOg />, size);
  }

  let coupon: Coupon | null = null;
  try {
    const res = await fetch(`${API_BASE_ABSOLUTE}/coupons/${id}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      coupon = (await res.json()) as Coupon;
    }
  } catch {
    coupon = null;
  }

  if (!coupon) {
    return new ImageResponse(<FallbackOg />, size);
  }

  return new ImageResponse(<OgCard coupon={coupon} />, size);
}
