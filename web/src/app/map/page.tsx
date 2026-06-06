"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { isAbortError, listCoupons, listMerchants } from "@/lib/api";
import type { Coupon, MerchantWithCount } from "@/lib/types";
import { MerchantLogo } from "@/components/MerchantLogo";

/**
 * Stylized Jakarta map with merchant pins. Each pin sized by coupon count,
 * colored by max discount available. Click pin → merchant page or panel.
 *
 * No real geolocation library — purely visual conceptual layout.
 */

// Deterministic pseudo-coordinates per merchant slug (hash-based)
function pseudoPosition(slug: string): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  const x = 10 + (Math.abs(hash) % 80);
  const y = 12 + (Math.abs(hash * 7) % 70);
  return { x, y };
}

function maxDiscountIn(coupons: Coupon[]): number {
  let max = 0;
  for (const c of coupons) {
    if (c.discount_type === "percent" && c.discount_value > max) {
      max = c.discount_value;
    }
  }
  return max;
}

export default function MapPage() {
  const [merchants, setMerchants] = useState<MerchantWithCount[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    Promise.all([
      listMerchants({ signal: ctrl.signal }).catch((e) => {
        if (isAbortError(e)) throw e;
        return [];
      }),
      listCoupons({ limit: 200 }, { signal: ctrl.signal }).catch((e) => {
        if (isAbortError(e)) throw e;
        return [];
      }),
    ])
      .then(([m, c]) => {
        if (ctrl.signal.aborted) return;
        setMerchants(m);
        setCoupons(c);
        setLoading(false);
      })
      .catch((e) => {
        if (!isAbortError(e)) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  const merchantsWithMeta = useMemo(() => {
    return merchants
      .map((m) => {
        const mc = coupons.filter((c) => c.merchant.slug === m.slug);
        return {
          ...m,
          coupons: mc,
          maxDiscount: maxDiscountIn(mc),
          position: pseudoPosition(m.slug),
        };
      })
      .sort((a, b) => b.coupon_count - a.coupon_count)
      .slice(0, 20); // top 20 merchant biar gak crowded
  }, [merchants, coupons]);

  const selectedMerchant = selected ? merchantsWithMeta.find((m) => m.slug === selected) : null;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-700 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              🗺️ Map View
            </div>
            <h1 className="mt-2 text-3xl font-black">Merchant Map</h1>
            <p className="mt-1 text-sm text-emerald-100">
              Stylized map dengan pin tiap merchant — size by jumlah kupon, warna by diskon max.
            </p>
          </div>
          <Link href="/" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25">
            ← Ke beranda
          </Link>
        </div>
      </header>

      {/* Map canvas */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/50 to-teal-950/50">
        {loading ? (
          <div className="flex h-96 items-center justify-center text-sm text-gray-400">
            Loading map data...
          </div>
        ) : (
          <div className="relative h-[500px]">
            {/* Stylized roads/blocks */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="0.3" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
              {/* fake major roads */}
              <line x1="0" y1="35" x2="100" y2="38" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
              <line x1="0" y1="65" x2="100" y2="62" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
              <line x1="30" y1="0" x2="32" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
              <line x1="70" y1="0" x2="68" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
              {/* "river" curve */}
              <path
                d="M 0,80 Q 30,75 50,85 T 100,82"
                stroke="rgba(56, 189, 248, 0.15)"
                strokeWidth="2"
                fill="none"
              />
            </svg>

            {/* Pins */}
            {merchantsWithMeta.map((m) => {
              const isSelected = selected === m.slug;
              const size = Math.min(56, 24 + m.coupon_count * 2);
              const color =
                m.maxDiscount >= 70
                  ? "from-rose-500 to-pink-600"
                  : m.maxDiscount >= 50
                    ? "from-amber-500 to-orange-600"
                    : m.maxDiscount >= 30
                      ? "from-emerald-500 to-teal-600"
                      : "from-blue-500 to-cyan-600";
              return (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : m.slug)}
                  className={[
                    "absolute -translate-x-1/2 -translate-y-full transition-transform duration-200",
                    isSelected ? "z-30 scale-125" : "z-10 hover:z-20 hover:scale-110",
                  ].join(" ")}
                  style={{ left: `${m.position.x}%`, top: `${m.position.y}%` }}
                  title={`${m.name} · ${m.coupon_count} kupon · max ${m.maxDiscount}% off`}
                >
                  <div
                    className={[
                      "flex flex-col items-center justify-center rounded-full border-2 border-white/60 bg-gradient-to-br shadow-lg",
                      color,
                      isSelected ? "ring-4 ring-white/40" : "",
                    ].join(" ")}
                    style={{ width: size, height: size }}
                  >
                    <MerchantLogo
                      merchant={{ slug: m.slug, name: m.name, website: m.website }}
                      size={Math.max(16, size - 14)}
                      rounded="full"
                      className="bg-white"
                    />
                  </div>
                  <div className="mx-auto mt-1 max-w-[80px] truncate rounded bg-gray-900/80 px-1.5 py-0.5 text-center text-[9px] font-bold text-white">
                    {m.name}
                  </div>
                </button>
              );
            })}

            {/* Legend */}
            <div className="absolute bottom-2 left-2 rounded-md border border-white/10 bg-gray-900/80 p-2 backdrop-blur">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Warna pin = Max diskon
              </div>
              <div className="mt-1 space-y-0.5 text-[10px] text-white">
                <Swatch color="from-rose-500 to-pink-600" label="≥70%" />
                <Swatch color="from-amber-500 to-orange-600" label="50-69%" />
                <Swatch color="from-emerald-500 to-teal-600" label="30-49%" />
                <Swatch color="from-blue-500 to-cyan-600" label="< 30%" />
              </div>
            </div>

            <div className="absolute right-2 top-2 rounded-md bg-gray-900/80 px-2 py-1 text-[10px] text-gray-300 backdrop-blur">
              📍 Stylized · bukan koordinat real
            </div>
          </div>
        )}
      </div>

      {/* Selected merchant panel */}
      {selectedMerchant && (
        <section className="rounded-2xl border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-5 animate-slide-up">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <MerchantLogo merchant={selectedMerchant} size={48} rounded="md" />
              <div>
                <h2 className="text-xl font-bold text-white">{selectedMerchant.name}</h2>
                <p className="text-xs text-emerald-200">
                  {selectedMerchant.coupon_count} kupon aktif · Max diskon{" "}
                  <strong>{selectedMerchant.maxDiscount}%</strong>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/merchant/${selectedMerchant.slug}`}
                className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600"
              >
                Lihat semua →
              </Link>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10"
              >
                ✕ Tutup
              </button>
            </div>
          </div>

          {selectedMerchant.coupons.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {selectedMerchant.coupons.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  href={`/coupon/${c.id}`}
                  className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 p-2 transition hover:border-emerald-400 hover:bg-emerald-500/10"
                >
                  <div className="rounded bg-emerald-500/20 px-2 py-1 text-sm font-bold text-emerald-300">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : "Promo"}
                  </div>
                  <span className="truncate text-xs text-white">{c.title}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4 text-xs text-gray-400">
        🗺️ <strong>Note:</strong> Posisi pin bersifat stylized & deterministic per slug merchant —
        bukan koordinat geografis real. Future upgrade bisa pakai Leaflet / Mapbox dengan koordinat
        outlet asli.
      </div>
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={["inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-br", color].join(" ")} />
      <span>{label}</span>
    </div>
  );
}
