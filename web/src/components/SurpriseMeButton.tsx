"use client";

import Link from "next/link";
import { useState } from "react";

import { getRecommendations } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { MerchantLogo } from "@/components/MerchantLogo";
import { fireConfetti } from "@/lib/confetti";

/**
 * Surprise Me — pop random kupon kualitas tinggi (≥70).
 * Tujuannya: bantu user discover kupon yg dia gak sadar ada.
 */
export function SurpriseMeButton() {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const pickRandom = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Capture rect BEFORE await — React synthetic event nulled after async
    const buttonEl = e.currentTarget as HTMLElement;
    const rect = buttonEl?.getBoundingClientRect();

    setLoading(true);
    try {
      const items = await getRecommendations({ limit: 25 });
      if (items.length === 0) return;
      const pick = items[Math.floor(Math.random() * items.length)];
      setCoupon(pick);
      setShow(true);
      if (rect) {
        try {
          fireConfetti({
            origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
            particleCount: 80,
          });
        } catch {
          /* ignore confetti failure */
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const reroll = async () => {
    setLoading(true);
    try {
      const items = await getRecommendations({ limit: 25 });
      if (items.length > 0) {
        setCoupon(items[Math.floor(Math.random() * items.length)]);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={pickRandom}
        disabled={loading}
        className="group flex w-full items-center gap-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-pink-500/20 px-3 py-2 text-sm transition-all hover:from-amber-500/30 hover:to-pink-500/30 disabled:opacity-50"
        title="Kasih satu kupon random — siapa tau cocok"
      >
        <span className="text-base transition-transform group-hover:rotate-12">🎁</span>
        <span className="flex-1 font-semibold text-amber-200">Surprise Me</span>
        {loading && <span className="animate-spin text-xs">⏳</span>}
      </button>

      {show && coupon && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setShow(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <span className="text-2xl">🎁</span> Untukmu hari ini!
                </h2>
                <button
                  type="button"
                  onClick={() => setShow(false)}
                  aria-label="Tutup"
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-3 p-6">
              <div className="flex items-center gap-3">
                <MerchantLogo merchant={coupon.merchant} size={48} rounded="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    {coupon.merchant.name}
                  </p>
                  <h3 className="mt-0.5 line-clamp-2 text-sm font-bold text-white">
                    {coupon.title}
                  </h3>
                </div>
              </div>

              {coupon.description && (
                <p className="line-clamp-3 text-xs text-gray-300">{coupon.description}</p>
              )}

              {coupon.code && (
                <div className="rounded-lg border border-dashed border-amber-400/50 bg-amber-500/10 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Kode Promo
                  </p>
                  <p className="mt-1 select-all font-mono text-xl font-black tracking-wider text-amber-200">
                    {coupon.code}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  href={`/coupon/${coupon.id}`}
                  onClick={() => setShow(false)}
                  className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-center text-sm font-bold text-white shadow transition hover:bg-amber-600"
                >
                  Lihat Detail →
                </Link>
                <button
                  type="button"
                  onClick={reroll}
                  disabled={loading}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
                  title="Random lagi"
                >
                  🎲 Lagi
                </button>
              </div>

              <p className="pt-2 text-center text-[10px] text-gray-500">
                Quality score: ★{coupon.quality_score}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
