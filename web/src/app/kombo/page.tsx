"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listCoupons, listMerchants, isAbortError } from "@/lib/api";
import type { Coupon, MerchantWithCount } from "@/lib/types";
import { MerchantLogo } from "@/components/MerchantLogo";

export const dynamic = "force-dynamic";

interface Combo {
  coupons: Coupon[];
  totalSavings: number;
  finalPrice: number;
  savingsBreakdown: { coupon: Coupon; saving: number; method: string }[];
  baseAmount: number;
}

/**
 * Stacking rules — kupon yg compatible dipakai barengan.
 * Ide: tipe diskon yg berbeda biasanya bisa di-stack.
 *
 * Compatible pairs:
 *   percent + cashback         (cashback after %)
 *   percent + free_shipping    (separate cost)
 *   fixed + cashback           (cashback after fixed)
 *   fixed + free_shipping
 *   bogo + free_shipping
 *
 * Incompatible:
 *   percent + percent  (rare double-discount)
 *   percent + fixed    (mutually exclusive — pick best)
 *   cashback + cashback
 *   free_shipping + free_shipping
 */
function canStack(a: string, b: string): boolean {
  if (a === b) return false; // Same type cannot stack
  const set = new Set([a, b]);

  // Most permissive: any 2 different types except both being "exclusive discount"
  // (percent + fixed are mutually exclusive)
  if (set.has("percent") && set.has("fixed")) return false;

  return true;
}

function calcSavingForCoupon(c: Coupon, baseAmount: number): number {
  const maxDisc = c.max_discount ?? Infinity;
  const minSpend = c.min_spend ?? 0;
  if (baseAmount < minSpend) return 0;

  switch (c.discount_type) {
    case "percent":
      return Math.min((baseAmount * c.discount_value) / 100, maxDisc);
    case "fixed":
      return Math.min(c.discount_value, maxDisc);
    case "cashback":
      if (c.discount_value <= 100) {
        return Math.min((baseAmount * c.discount_value) / 100, maxDisc);
      }
      return Math.min(c.discount_value, maxDisc);
    case "free_shipping":
      return c.max_discount ?? 25000;
    case "bogo":
      return Math.min(baseAmount * 0.5, maxDisc);
    default:
      return c.discount_value > 100 ? Math.min(c.discount_value, maxDisc) : 0;
  }
}

function describeMethod(c: Coupon): string {
  switch (c.discount_type) {
    case "percent":
      return `${c.discount_value}% off`;
    case "fixed":
      return `-Rp ${c.discount_value.toLocaleString("id-ID")}`;
    case "cashback":
      return c.discount_value <= 100 ? `${c.discount_value}% cashback` : `Cashback Rp ${c.discount_value.toLocaleString("id-ID")}`;
    case "free_shipping":
      return `Gratis ongkir s/d Rp ${(c.max_discount ?? 25000).toLocaleString("id-ID")}`;
    case "bogo":
      return "Buy 1 Get 1";
    default:
      return c.discount_type;
  }
}

function findCombos(coupons: Coupon[], baseAmount: number): Combo[] {
  if (coupons.length < 2) return [];

  // Try pairs first
  const pairs: Combo[] = [];
  for (let i = 0; i < coupons.length; i++) {
    for (let j = i + 1; j < coupons.length; j++) {
      const a = coupons[i];
      const b = coupons[j];
      if (!canStack(a.discount_type, b.discount_type)) continue;

      const savA = calcSavingForCoupon(a, baseAmount);
      const savB = calcSavingForCoupon(b, baseAmount - savA);
      if (savA + savB === 0) continue;

      pairs.push({
        coupons: [a, b],
        totalSavings: Math.round(savA + savB),
        finalPrice: Math.max(Math.round(baseAmount - savA - savB), 0),
        savingsBreakdown: [
          { coupon: a, saving: Math.round(savA), method: describeMethod(a) },
          { coupon: b, saving: Math.round(savB), method: describeMethod(b) },
        ],
        baseAmount,
      });
    }
  }

  // Try triples for top pairs
  const triples: Combo[] = [];
  const topPairs = [...pairs].sort((a, b) => b.totalSavings - a.totalSavings).slice(0, 5);
  for (const pair of topPairs) {
    for (const c of coupons) {
      if (pair.coupons.some((p) => p.id === c.id)) continue;
      if (!pair.coupons.every((p) => canStack(p.discount_type, c.discount_type))) continue;

      let remaining = baseAmount;
      const breakdown = pair.savingsBreakdown.map((b) => {
        const s = b.saving;
        remaining -= s;
        return b;
      });
      const savC = calcSavingForCoupon(c, remaining);
      if (savC === 0) continue;

      triples.push({
        coupons: [...pair.coupons, c],
        totalSavings: Math.round(pair.totalSavings + savC),
        finalPrice: Math.max(Math.round(baseAmount - pair.totalSavings - savC), 0),
        savingsBreakdown: [...breakdown, { coupon: c, saving: Math.round(savC), method: describeMethod(c) }],
        baseAmount,
      });
    }
  }

  // Combine + sort by savings, dedupe by coupon-id-set
  const seen = new Set<string>();
  const all = [...triples, ...pairs]
    .sort((a, b) => b.totalSavings - a.totalSavings)
    .filter((combo) => {
      const key = combo.coupons.map((c) => c.id).sort().join("-");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return all.slice(0, 5);
}

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000];

export default function KomboPage() {
  const [merchants, setMerchants] = useState<MerchantWithCount[]>([]);
  const [merchantSlug, setMerchantSlug] = useState<string>("");
  const [amount, setAmount] = useState(200000);
  const [amountInput, setAmountInput] = useState("200000");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  // Load merchants with ≥2 coupons (need ≥2 to stack)
  useEffect(() => {
    const ctrl = new AbortController();
    listMerchants({ signal: ctrl.signal })
      .then((m) => {
        if (!ctrl.signal.aborted) {
          const eligible = m.filter((x) => x.coupon_count >= 2);
          setMerchants(eligible);
          if (eligible.length > 0 && !merchantSlug) {
            setMerchantSlug(eligible[0].slug);
          }
        }
      })
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch coupons for selected merchant
  useEffect(() => {
    if (!merchantSlug) return;
    const ctrl = new AbortController();
    setLoading(true);
    listCoupons(
      { merchant: merchantSlug, limit: 30, sort: "quality" },
      { signal: ctrl.signal },
    )
      .then((c) => {
        if (!ctrl.signal.aborted) setCoupons(c);
      })
      .catch((e) => {
        if (!isAbortError(e)) setCoupons([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [merchantSlug]);

  const combos = useMemo(() => findCombos(coupons, amount), [coupons, amount]);
  const selectedMerchant = merchants.find((m) => m.slug === merchantSlug);

  const bestSingle = useMemo(() => {
    if (coupons.length === 0) return 0;
    return Math.max(...coupons.map((c) => calcSavingForCoupon(c, amount)));
  }, [coupons, amount]);

  const handleAmountChange = (val: string) => {
    setAmountInput(val);
    const clean = val.replace(/[^0-9]/g, "");
    const n = Number(clean);
    if (Number.isFinite(n)) setAmount(n);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent p-6 animate-slide-up">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <span className="text-4xl">🎁</span>
          Kombo Kupon — Stacking Helper
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Pakai{" "}
          <span className="font-semibold text-purple-300">2-3 kupon bareng</span> untuk hemat
          maksimal. Sistem cari kombinasi yang compatible.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-purple-500/15 px-3 py-1 text-xs text-purple-200">
          💡 Insight: kupon dengan tipe diskon berbeda bisa di-stack (mis. % diskon + cashback)
        </div>
      </header>

      {/* Controls */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
              🏢 Pilih Merchant
            </label>
            <select
              value={merchantSlug}
              onChange={(e) => setMerchantSlug(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-purple-400 focus:outline-none"
            >
              {merchants.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name} ({m.coupon_count} kupon)
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-gray-500">
              Hanya merchant dengan ≥2 kupon yang bisa di-stack
            </p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
              💸 Estimasi Belanja
            </label>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-purple-300">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-lg font-bold text-white focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAmount(a);
                    setAmountInput(String(a));
                  }}
                  className={[
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition",
                    amount === a
                      ? "border-purple-400 bg-purple-500/20 text-purple-200"
                      : "border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/50",
                  ].join(" ")}
                >
                  Rp {(a / 1000).toLocaleString("id-ID")}rb
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : combos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-400/30 bg-amber-500/5 p-8 text-center">
          <div className="text-5xl">🤔</div>
          <h2 className="mt-3 text-lg font-bold text-white">
            Kupon {selectedMerchant?.name ?? "ini"} gak bisa di-stack
          </h2>
          <p className="mt-2 max-w-md mx-auto text-sm text-amber-200">
            Semua kupon tipe diskon-nya sama (gak boleh di-stack), atau cuma 1 kupon yang valid
            buat nominal Rp {amount.toLocaleString("id-ID")}.
          </p>
          <p className="mt-3 text-xs text-amber-300">
            💡 Coba merchant lain (terutama Shopee/Tokopedia yg punya 5+ kupon), atau
            naikin nominal belanja.
          </p>
        </div>
      ) : (
        <>
          {/* TOP COMBO HERO */}
          <section className="overflow-hidden rounded-2xl border-2 border-purple-400/50 bg-gradient-to-br from-purple-500/25 via-pink-500/10 to-transparent p-6 shadow-2xl shadow-purple-500/20 animate-slide-up">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
                🏆 Kombo Paling Hemat
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-purple-300">
                  Vs single kupon
                </div>
                <div className="text-sm font-bold text-emerald-300">
                  +Rp {(combos[0].totalSavings - bestSingle).toLocaleString("id-ID")} EXTRA
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,auto] lg:items-center">
              <div className="space-y-2">
                {combos[0].savingsBreakdown.map((b, i) => (
                  <Link
                    key={b.coupon.id}
                    href={`/coupon/${b.coupon.id}`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-purple-400/50"
                  >
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-purple-500 text-xs font-black text-white">
                      {i + 1}
                    </span>
                    <MerchantLogo merchant={b.coupon.merchant} size={32} rounded="md" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-bold text-white">
                        {b.coupon.title}
                      </p>
                      <p className="text-[11px] text-purple-300">{b.method}</p>
                    </div>
                    <div className="flex-none text-right">
                      <div className="font-mono text-sm font-bold text-emerald-300">
                        -Rp {b.saving.toLocaleString("id-ID")}
                      </div>
                      {b.coupon.code && (
                        <code className="mt-0.5 inline-block rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                          {b.coupon.code}
                        </code>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              <div className="rounded-2xl border border-emerald-300/30 bg-black/30 p-5 text-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Total Hemat
                </div>
                <div className="mt-1 font-mono text-3xl font-black text-emerald-200 sm:text-4xl">
                  -Rp {combos[0].totalSavings.toLocaleString("id-ID")}
                </div>
                <div className="mt-3 border-t border-emerald-300/20 pt-2">
                  <div className="text-[10px] uppercase text-gray-400">Final Price</div>
                  <div className="mt-0.5 font-mono text-xl font-bold text-white">
                    Rp {combos[0].finalPrice.toLocaleString("id-ID")}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* OTHER COMBOS */}
          {combos.length > 1 && (
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
                💎 Kombo Alternatif ({combos.length - 1})
              </h3>
              <div className="space-y-3">
                {combos.slice(1).map((combo, idx) => (
                  <div
                    key={combo.coupons.map((c) => c.id).join("-")}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-purple-300">
                        Kombo #{idx + 2} · {combo.coupons.length} kupon
                      </span>
                      <span className="font-mono text-base font-bold text-emerald-300">
                        -Rp {combo.totalSavings.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {combo.savingsBreakdown.map((b) => (
                        <span
                          key={b.coupon.id}
                          className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] text-gray-200"
                        >
                          {b.method}
                          <span className="text-emerald-300">−{b.saving.toLocaleString("id-ID")}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* How it works */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-gray-400">
        <h3 className="mb-1 font-bold text-gray-300">🧠 Cara kerja stacking</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong className="text-purple-300">Compatible:</strong> tipe diskon berbeda (mis.
            persen + cashback, fixed + free shipping)
          </li>
          <li>
            <strong className="text-rose-300">Incompatible:</strong> tipe diskon yang sama (mis.
            2 kupon cashback, atau persen + fixed)
          </li>
          <li>Cashback dihitung dari harga setelah diskon (cascade)</li>
          <li>Hemat extra = total kombo dikurangi single kupon terbaik</li>
        </ul>
        <p className="mt-2 rounded-md bg-amber-500/10 p-2 text-[10px] text-amber-200">
          ⚠️ Cek syarat di merchant asli — beberapa kupon punya rule "tidak bisa digabung"
          yg gak ke-track sistem.
        </p>
      </div>
    </div>
  );
}
