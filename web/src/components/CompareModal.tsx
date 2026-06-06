"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { Coupon } from "@/lib/types";
import { formatDiscount, formatExpiry, trackRedeem } from "@/lib/api";
import { useI18n } from "@/i18n/provider";
import { useCompare } from "@/lib/use-compare";
import { useHistory } from "@/lib/use-history";
import { useStreak } from "@/lib/use-streak";
import { MerchantLogo } from "@/components/MerchantLogo";
import { fireConfetti } from "@/lib/confetti";

function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

/**
 * Estimate effective saving for sample basket (Rp 200k). Used to find "BEST" coupon.
 */
function estimatedSaving(c: Coupon, basket = 200000): number {
  switch (c.discount_type) {
    case "percent": {
      const raw = (basket * c.discount_value) / 100;
      return c.max_discount ? Math.min(raw, c.max_discount) : raw;
    }
    case "fixed":
      return c.discount_value;
    case "cashback":
      if (c.discount_value < 100) {
        const raw = (basket * c.discount_value) / 100;
        return c.max_discount ? Math.min(raw, c.max_discount) : raw;
      }
      return c.discount_value;
    case "free_shipping":
      return c.max_discount ?? 20000;
    case "bogo":
      return basket / 2; // rough
    default:
      return c.discount_value;
  }
}

export function CompareModal() {
  const { showModal, closeModal, selected, remove, clear } = useCompare();
  const { t } = useI18n();
  const { addClaim } = useHistory();
  const { recordClaim } = useStreak();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showModal, closeModal]);

  // Compute "best" coupon (highest saving on Rp 200k basket)
  const bestId = useMemo(() => {
    if (selected.length === 0) return null;
    let best = selected[0];
    let bestSaving = estimatedSaving(best);
    for (const c of selected.slice(1)) {
      const s = estimatedSaving(c);
      if (s > bestSaving) {
        best = c;
        bestSaving = s;
      }
    }
    return best.id;
  }, [selected]);

  if (!showModal || selected.length === 0) return null;

  const handleCopy = async (
    e: React.MouseEvent<HTMLButtonElement>,
    coupon: Coupon,
  ) => {
    e.preventDefault();
    if (!coupon.code) return;
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopiedId(coupon.id);
      void trackRedeem(coupon.id);
      addClaim(coupon);
      recordClaim();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      fireConfetti({
        origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        particleCount: 70,
      });
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-start justify-center p-4 pt-[5vh] animate-fade-in">
      <button
        type="button"
        aria-label="Tutup compare"
        onClick={closeModal}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-br from-slate-900 to-violet-950/40 shadow-2xl animate-slide-up">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-gray-700 bg-gray-950/60 px-5 py-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-400/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-200">
              🆚 Compare Mode
            </div>
            <h2 className="mt-1.5 text-xl font-black text-white">
              Bandingin {selected.length} kupon
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clear}
              className="rounded-md border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/5"
            >
              ✕ Clear all
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600"
            >
              Tutup
            </button>
          </div>
        </header>

        {/* Comparison grid (each column = 1 coupon) */}
        <div className="flex-1 overflow-auto p-4">
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${selected.length}, minmax(220px, 1fr))`,
            }}
          >
            {selected.map((c) => {
              const isBest = c.id === bestId && selected.length >= 2;
              const saving = estimatedSaving(c);

              return (
                <article
                  key={c.id}
                  className={[
                    "relative flex flex-col overflow-hidden rounded-xl border-2 bg-gray-900/60",
                    isBest
                      ? "border-emerald-400 shadow-lg shadow-emerald-500/20"
                      : "border-gray-700",
                  ].join(" ")}
                >
                  {isBest && (
                    <div className="absolute right-2 top-2 z-10 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md">
                      🏆 BEST
                    </div>
                  )}

                  {/* Merchant header */}
                  <div className="flex items-center gap-2 border-b border-gray-700 bg-gray-950/40 p-3">
                    <MerchantLogo merchant={c.merchant} size={28} rounded="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold uppercase tracking-wide text-violet-300">
                        {c.merchant.name}
                      </div>
                      <h3 className="truncate text-sm font-bold text-white" title={c.title}>
                        {c.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      title="Remove dari compare"
                      className="flex-none text-xs text-gray-500 hover:text-rose-400"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Big discount */}
                  <div className="px-3 py-4 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-violet-300">Diskon</div>
                    <div className="mt-1 text-3xl font-black text-violet-200">
                      {formatDiscount(c, t)}
                    </div>
                  </div>

                  {/* Detail table */}
                  <dl className="space-y-1 divide-y divide-gray-800 px-3 pb-3 text-xs">
                    <Row label="Tipe" value={c.discount_type} />
                    <Row label="Min belanja" value={formatRupiah(c.min_spend)} />
                    <Row label="Max diskon" value={formatRupiah(c.max_discount)} />
                    <Row label="Berlaku" value={formatExpiry(c.expires_at, t)} />
                    <Row
                      label="Quality"
                      value={`★ ${c.quality_score}/100`}
                      valueClass={
                        c.quality_score >= 80
                          ? "text-emerald-400"
                          : c.quality_score >= 60
                            ? "text-amber-400"
                            : "text-gray-300"
                      }
                    />
                    <Row label="Dilihat" value={`${c.view_count ?? 0}`} />
                    <Row label="Disalin" value={`${c.redeem_count ?? 0}`} />
                    <Row
                      label="Est. hemat (Rp 200k)"
                      value={formatRupiah(saving)}
                      valueClass={isBest ? "font-black text-emerald-400" : "font-bold text-emerald-300"}
                    />
                  </dl>

                  {/* Code + actions */}
                  {c.code && (
                    <div className="mx-3 mb-3 rounded-md border-2 border-dashed border-violet-400/60 bg-violet-500/10 p-2">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-violet-300">
                        Kode Promo
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-black text-violet-100">
                        {c.code}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex gap-1.5 border-t border-gray-700 bg-gray-950/40 p-2">
                    <button
                      type="button"
                      onClick={(e) => handleCopy(e, c)}
                      disabled={!c.code}
                      className="flex-1 rounded-md bg-brand-500 px-2 py-1.5 text-xs font-bold text-white shadow hover:bg-brand-600 disabled:opacity-40"
                    >
                      {copiedId === c.id
                        ? `✓ ${t("coupon.copied") || "Tersalin"}`
                        : `⚡ ${t("coupon.copy") || "Salin"}`}
                    </button>
                    <Link
                      href={`/coupon/${c.id}`}
                      onClick={closeModal}
                      className="flex items-center rounded-md border border-gray-600 px-2 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/5"
                      title="Lihat detail"
                    >
                      →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-700 bg-gray-950/60 px-5 py-2 text-center text-[10px] text-gray-500">
          🏆 BEST = paling hemat untuk basket sample Rp 200.000 · Esc untuk tutup
        </footer>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className={["truncate text-right text-xs", valueClass ?? "text-gray-200"].join(" ")}>
        {value}
      </dd>
    </div>
  );
}
