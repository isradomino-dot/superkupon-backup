"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listCoupons, listMerchants, isAbortError } from "@/lib/api";
import type { Coupon, MerchantWithCount } from "@/lib/types";
import { MerchantLogo } from "@/components/MerchantLogo";
import { couponHref } from "@/lib/coupon-slug";

export const dynamic = "force-dynamic";

interface Combo {
  coupons: Coupon[];
  totalSaving: number;
  finalPrice: number;
  breakdown: { coupon: Coupon; saving: number; method: string }[];
}

function canStack(a: string, b: string): boolean {
  if (a === b) return false;
  const set = new Set([a, b]);
  if (set.has("percent") && set.has("fixed")) return false;
  return true;
}

function calcSaving(c: Coupon, amount: number): number {
  const maxDisc = c.max_discount ?? Infinity;
  const minSpend = c.min_spend ?? 0;
  if (amount < minSpend) return 0;

  switch (c.discount_type) {
    case "percent":
      return Math.min((amount * c.discount_value) / 100, maxDisc);
    case "fixed":
      return Math.min(c.discount_value, maxDisc);
    case "cashback":
      if (c.discount_value <= 100) {
        return Math.min((amount * c.discount_value) / 100, maxDisc);
      }
      return Math.min(c.discount_value, maxDisc);
    case "free_shipping":
      return c.max_discount ?? 25000;
    case "bogo":
      return Math.min(amount * 0.5, maxDisc);
    default:
      return c.discount_value > 100 ? Math.min(c.discount_value, maxDisc) : 0;
  }
}

function describe(c: Coupon): string {
  switch (c.discount_type) {
    case "percent":
      return `${c.discount_value}% off`;
    case "fixed":
      return `-Rp ${c.discount_value.toLocaleString("id-ID")}`;
    case "cashback":
      return c.discount_value <= 100
        ? `${c.discount_value}% cashback`
        : `Cashback Rp ${c.discount_value.toLocaleString("id-ID")}`;
    case "free_shipping":
      return `Gratis ongkir Rp ${(c.max_discount ?? 25000).toLocaleString("id-ID")}`;
    case "bogo":
      return "Buy 1 Get 1";
    default:
      return c.discount_type;
  }
}

function findCombos(coupons: Coupon[], cartTotal: number): Combo[] {
  if (coupons.length === 0) return [];

  // Single coupon
  const singles: Combo[] = coupons
    .map((c) => {
      const sav = calcSaving(c, cartTotal);
      if (sav === 0) return null;
      return {
        coupons: [c],
        totalSaving: sav,
        finalPrice: Math.max(cartTotal - sav, 0),
        breakdown: [{ coupon: c, saving: sav, method: describe(c) }],
      };
    })
    .filter((x): x is Combo => x !== null);

  // Pairs
  const pairs: Combo[] = [];
  for (let i = 0; i < coupons.length; i++) {
    for (let j = i + 1; j < coupons.length; j++) {
      const a = coupons[i];
      const b = coupons[j];
      if (!canStack(a.discount_type, b.discount_type)) continue;
      const savA = calcSaving(a, cartTotal);
      const savB = calcSaving(b, cartTotal - savA);
      if (savA + savB === 0) continue;
      pairs.push({
        coupons: [a, b],
        totalSaving: savA + savB,
        finalPrice: Math.max(cartTotal - savA - savB, 0),
        breakdown: [
          { coupon: a, saving: savA, method: describe(a) },
          { coupon: b, saving: savB, method: describe(b) },
        ],
      });
    }
  }

  // Triples
  const triples: Combo[] = [];
  const topPairs = [...pairs].sort((a, b) => b.totalSaving - a.totalSaving).slice(0, 5);
  for (const pair of topPairs) {
    for (const c of coupons) {
      if (pair.coupons.some((p) => p.id === c.id)) continue;
      if (!pair.coupons.every((p) => canStack(p.discount_type, c.discount_type)))
        continue;

      let remaining = cartTotal - pair.totalSaving;
      const savC = calcSaving(c, remaining);
      if (savC === 0) continue;

      triples.push({
        coupons: [...pair.coupons, c],
        totalSaving: pair.totalSaving + savC,
        finalPrice: Math.max(cartTotal - pair.totalSaving - savC, 0),
        breakdown: [
          ...pair.breakdown,
          { coupon: c, saving: savC, method: describe(c) },
        ],
      });
    }
  }

  // Sort all + dedupe
  const seen = new Set<string>();
  const all = [...triples, ...pairs, ...singles]
    .sort((a, b) => b.totalSaving - a.totalSaving)
    .filter((combo) => {
      const key = combo.coupons.map((c) => c.id).sort().join("-");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return all.slice(0, 5);
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

export default function KeranjangPage() {
  const [merchants, setMerchants] = useState<MerchantWithCount[]>([]);
  const [merchantSlug, setMerchantSlug] = useState<string>("");
  const [cartTotal, setCartTotal] = useState<number>(200000);
  const [cartInput, setCartInput] = useState("200000");
  const [itemCount, setItemCount] = useState<number>(3);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    listMerchants({ signal: ctrl.signal })
      .then((m) => {
        if (!ctrl.signal.aborted) {
          const eligible = m.filter((x) => x.coupon_count >= 1);
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

  const combos = useMemo(() => findCombos(coupons, cartTotal), [coupons, cartTotal]);
  const bestSingle = useMemo(() => {
    if (coupons.length === 0) return 0;
    return Math.max(...coupons.map((c) => calcSaving(c, cartTotal)));
  }, [coupons, cartTotal]);
  const selectedMerchant = merchants.find((m) => m.slug === merchantSlug);

  const handleCartChange = (val: string) => {
    setCartInput(val);
    const clean = val.replace(/[^0-9]/g, "");
    const n = Number(clean);
    if (Number.isFinite(n)) setCartTotal(n);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent p-6 animate-slide-up">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <span className="text-4xl">🛒</span>
          Cart Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Cart-mu udah berapa? Input <strong className="text-emerald-300">total + merchant</strong>,
          kita kasih combo kupon paling hemat untuk cart itu — auto match stacking + final price.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200">
          💡 Beda dari Smart Pick: ini fokus cart spesifik (post-cart), bukan goal-based
        </div>
      </header>

      {/* Form */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
              🏢 Merchant Cart
            </label>
            <select
              value={merchantSlug}
              onChange={(e) => setMerchantSlug(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
            >
              {merchants.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name} ({m.coupon_count} kupon)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
              📦 Jumlah Item (opsional)
            </label>
            <input
              type="number"
              min="1"
              max="99"
              value={itemCount}
              onChange={(e) => setItemCount(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
            💸 Total Cart (Rp)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-emerald-300">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={cartInput}
              onChange={(e) => handleCartChange(e.target.value)}
              placeholder="200000"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xl font-bold text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Quick:
            </span>
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  setCartTotal(a);
                  setCartInput(String(a));
                }}
                className={[
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition",
                  cartTotal === a
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                    : "border-white/10 bg-white/5 text-gray-300 hover:border-emerald-400/50",
                ].join(" ")}
              >
                Rp {(a / 1000).toLocaleString("id-ID")}rb
              </button>
            ))}
          </div>
        </div>

        {selectedMerchant && (
          <div className="rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-200">
            🛒 Cart Summary: <strong>Rp {cartTotal.toLocaleString("id-ID")}</strong> di{" "}
            <strong>{selectedMerchant.name}</strong> ({itemCount} item)
          </div>
        )}
      </section>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : combos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-400/30 bg-amber-500/5 p-8 text-center">
          <div className="text-5xl">🤔</div>
          <h2 className="mt-3 text-lg font-bold text-white">
            Belum ada combo cocok untuk cart ini
          </h2>
          <p className="mt-2 max-w-md mx-auto text-sm text-amber-200">
            Cart-mu mungkin di bawah min belanja semua kupon merchant ini. Coba naikin
            cart total atau ganti merchant.
          </p>
        </div>
      ) : (
        <>
          {/* TOP COMBO */}
          <section className="overflow-hidden rounded-2xl border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-500/25 via-teal-500/10 to-transparent p-6 shadow-2xl shadow-emerald-500/20 animate-slide-up">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
                🏆 Best Combo untuk Cart-mu
              </div>
              {combos[0].coupons.length > 1 && (
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-300">
                    Vs single kupon
                  </div>
                  <div className="text-sm font-bold text-emerald-200">
                    +Rp {(combos[0].totalSaving - bestSingle).toLocaleString("id-ID")} EXTRA
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,auto] lg:items-center">
              <div className="space-y-2">
                {combos[0].breakdown.map((b, i) => (
                  <Link
                    key={b.coupon.id}
                    href={couponHref(b.coupon)}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-emerald-400/50"
                  >
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
                      {i + 1}
                    </span>
                    <MerchantLogo merchant={b.coupon.merchant} size={32} rounded="md" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-bold text-white">
                        {b.coupon.title}
                      </p>
                      <p className="text-[11px] text-emerald-300">{b.method}</p>
                    </div>
                    <div className="flex-none text-right">
                      <div className="font-mono text-sm font-bold text-emerald-300">
                        -Rp {Math.round(b.saving).toLocaleString("id-ID")}
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
                  -Rp {Math.round(combos[0].totalSaving).toLocaleString("id-ID")}
                </div>
                <div className="mt-3 border-t border-emerald-300/20 pt-2">
                  <div className="text-[10px] uppercase text-gray-400">Bayar</div>
                  <div className="mt-0.5 font-mono text-xl font-bold text-white">
                    Rp {Math.round(combos[0].finalPrice).toLocaleString("id-ID")}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Alternative combos */}
          {combos.length > 1 && (
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
                💎 Combo Alternatif ({combos.length - 1})
              </h3>
              <div className="space-y-2">
                {combos.slice(1).map((combo, idx) => (
                  <div
                    key={combo.coupons.map((c) => c.id).join("-")}
                    className="rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-emerald-300">
                        #{idx + 2} · {combo.coupons.length} kupon
                      </span>
                      <span className="font-mono text-sm font-bold text-emerald-200">
                        -Rp {Math.round(combo.totalSaving).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {combo.breakdown.map((b) => (
                        <span
                          key={b.coupon.id}
                          className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-200"
                        >
                          {b.method}
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

      {/* CTA */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-gray-400">
        <p className="font-bold text-gray-300">💡 Cara pakai hasilnya:</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Catat semua kupon di combo terbaik</li>
          <li>Buka aplikasi merchant (Shopee/Tokopedia/dll)</li>
          <li>Apply kupon satu-satu di checkout — sistem merchant akan validate</li>
          <li>Cek total akhir vs kalkulasi kita (kemungkinan sama persis)</li>
        </ol>
      </section>
    </div>
  );
}
