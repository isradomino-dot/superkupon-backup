"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getCouponsByIds, listCoupons, formatDiscount, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { CouponCard } from "@/components/CouponCard";
import { CouponSkeletonGrid } from "@/components/CouponSkeleton";
import { ExportImportControl } from "@/components/ExportImportControl";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { SavingsTracker } from "@/components/SavingsTracker";
import { MerchantLogo } from "@/components/MerchantLogo";
import { useFavorites } from "@/lib/use-favorites";
import { useI18n } from "@/i18n/provider";

export default function FavoritesPage() {
  const { ids, records, count, clear, folders } = useFavorites();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const selectedCoupons = useMemo(
    () => coupons.filter((c) => selectedIds.has(c.id)),
    [coupons, selectedIds],
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(coupons.map((c) => c.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  // Auto-exit select mode when no favs left
  useEffect(() => {
    if (count === 0 && selectMode) {
      setSelectMode(false);
      setSelectedIds(new Set());
    }
  }, [count, selectMode]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    getCouponsByIds(ids, { signal: ctrl.signal })
      .then((list) => {
        if (ctrl.signal.aborted) return;
        // Sort by save order (newest first)
        const order = new Map(records.map((r, i) => [r.id, i]));
        list.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
        setCoupons(list);
      })
      .catch((e) => {
        if (!isAbortError(e)) setCoupons([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [ids.join(","), records.length]);

  const handleClearAll = () => {
    if (typeof window !== "undefined" && window.confirm("Hapus semua kupon dari favorit?")) {
      clear();
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent p-6 animate-slide-up">
        <nav className="mb-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-brand-300 hover:underline">
            Beranda
          </Link>
          {" / "}
          <span className="text-gray-200">Favorit</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
              <span className="text-rose-400" aria-hidden>♥</span>
              Kupon Favorit
            </h1>
            <p className="mt-1 text-sm text-gray-300">
              {count === 0
                ? "Belum ada kupon disimpan."
                : `${count} kupon tersimpan di perangkat ini.`}
            </p>
          </div>
          {count > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectMode) exitSelectMode();
                  else setSelectMode(true);
                }}
                className={[
                  "rounded-md border px-3 py-1.5 text-xs font-semibold transition",
                  selectMode
                    ? "border-brand-400 bg-brand-500/20 text-brand-200"
                    : "border-white/15 bg-white/5 text-gray-300 hover:bg-white/10",
                ].join(" ")}
              >
                {selectMode ? "✓ Pilih (aktif)" : "☐ Pilih"}
              </button>
              {selectMode && (
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={coupons.length === 0}
                  className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 disabled:opacity-50"
                >
                  Pilih semua
                </button>
              )}
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
              >
                Hapus semua
              </button>
            </div>
          )}
        </div>
      </header>

      <SavingsTracker />

      {/* Cross-link decision tools — cuma kalo ada favorit */}
      {count > 0 && <FavoritesActionBar count={count} />}

      {/* ExportImport hanya kalo udah ada favorit */}
      {count > 0 && <ExportImportControl />}

      {count === 0 ? (
        <EmptyStateWithSuggestions />
      ) : loading ? (
        <CouponSkeletonGrid count={Math.min(count, 6)} />
      ) : coupons.length === 0 ? (
        <StaleState count={count} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => {
            const isSelected = selectedIds.has(c.id);
            if (!selectMode) {
              return <CouponCard key={c.id} coupon={c} />;
            }
            return (
              <div
                key={c.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleSelect(c.id);
                }}
                className={[
                  "relative cursor-pointer rounded-xl transition",
                  isSelected ? "ring-4 ring-brand-500/60 shadow-lg shadow-brand-500/30" : "",
                ].join(" ")}
              >
                {/* Disable inner link clicks while in select mode */}
                <div className={selectMode ? "pointer-events-none" : ""}>
                  <CouponCard coupon={c} />
                </div>
                {/* Big check overlay */}
                <div className="absolute left-3 top-3 z-20 pointer-events-none">
                  <span
                    className={[
                      "flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-black shadow-lg transition",
                      isSelected
                        ? "border-brand-300 bg-brand-500 text-white"
                        : "border-white/60 bg-gray-900/70 text-transparent",
                    ].join(" ")}
                  >
                    {isSelected ? "✓" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BulkActionsBar
        selected={selectedCoupons}
        folders={folders}
        onClearSelection={clearSelection}
        onExitSelectMode={exitSelectMode}
      />
    </div>
  );
}

function FavoritesActionBar({ count }: { count: number }) {
  return (
    <section className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-transparent p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">✨</span>
        <p className="text-xs font-bold uppercase tracking-wider text-brand-300">
          {count} favorit aktif — Yang bisa kamu lakukan:
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          href="/decide"
          className="group flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 transition hover:border-emerald-400/60 hover:bg-emerald-500/15"
        >
          <span className="text-2xl transition-transform group-hover:scale-110">🎯</span>
          <div>
            <p className="text-xs font-bold text-emerald-200">Smart Pick</p>
            <p className="text-[10px] text-gray-400">Cariin kupon hemat untukmu</p>
          </div>
        </Link>
        <Link
          href="/kombo"
          className="group flex items-center gap-3 rounded-xl border border-purple-400/30 bg-purple-500/10 p-3 transition hover:border-purple-400/60 hover:bg-purple-500/15"
        >
          <span className="text-2xl transition-transform group-hover:scale-110">🎁</span>
          <div>
            <p className="text-xs font-bold text-purple-200">Kombo Helper</p>
            <p className="text-[10px] text-gray-400">Stack 2-3 kupon hemat max</p>
          </div>
        </Link>
      </div>
    </section>
  );
}

function EmptyStateWithSuggestions() {
  const { t } = useI18n();
  const { add: addFavorite } = useFavorites();
  const [suggestions, setSuggestions] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const ctrl = new AbortController();
    listCoupons({ sort: "quality", limit: 6 }, { signal: ctrl.signal })
      .then((c) => {
        if (!ctrl.signal.aborted) setSuggestions(c);
      })
      .catch((e) => {
        if (!isAbortError(e)) setSuggestions([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  const handleQuickAdd = (id: number) => {
    addFavorite(id);
    setAddedIds((prev) => new Set(prev).add(id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 p-8 text-center">
        <div className="text-5xl" aria-hidden>
          ♡
        </div>
        <p className="text-base font-semibold text-gray-200">Belum ada kupon favorit</p>
        <p className="max-w-md text-sm text-gray-400">
          Klik chip kupon di bawah ↓ untuk tambah favorit instant.{" "}
          <span className="text-gray-500">Atau klik icon hati ❤️ di kupon manapun.</span>
        </p>
      </div>

      {/* Quick-add suggestions */}
      <section className="rounded-2xl border border-rose-400/30 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <h2 className="text-sm font-bold text-white">Kupon Populer — Klik untuk Favorite</h2>
        </div>
        {loading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada saran tersedia.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestions.map((c) => {
              const added = addedIds.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleQuickAdd(c.id)}
                  disabled={added}
                  className={[
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                    added
                      ? "cursor-not-allowed border-emerald-400/40 bg-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:scale-[1.01] hover:border-rose-400/40 hover:bg-rose-500/10",
                  ].join(" ")}
                >
                  <MerchantLogo merchant={c.merchant} size={36} rounded="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                      {c.merchant.name}
                    </p>
                    <p className="line-clamp-1 text-xs font-bold text-white">{c.title}</p>
                  </div>
                  <div className="flex-none text-right">
                    {added ? (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        ✓ ❤️
                      </span>
                    ) : (
                      <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-200">
                        {formatDiscount(c, t)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <Link
          href="/"
          className="mt-4 inline-block text-xs font-semibold text-rose-300 hover:underline"
        >
          → Browse semua kupon di beranda
        </Link>
      </section>
    </div>
  );
}

function StaleState({ count }: { count: number }) {
  return (
    <div className="rounded-xl border border-dashed border-amber-400/30 bg-amber-500/5 p-8 text-center text-sm text-amber-200">
      <p className="font-semibold">⚠️ {count} kupon favorit tidak ditemukan</p>
      <p className="mt-1 text-amber-200/80">
        Mungkin sudah dihapus dari database atau expired. Coba refresh atau hapus dari favorit.
      </p>
    </div>
  );
}
