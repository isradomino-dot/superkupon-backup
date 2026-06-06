"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getCouponsByIds, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { CouponCard } from "@/components/CouponCard";
import { CouponSkeletonGrid } from "@/components/CouponSkeleton";
import { ExportImportControl } from "@/components/ExportImportControl";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { useFavorites } from "@/lib/use-favorites";

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

      <ExportImportControl />

      {count === 0 ? (
        <EmptyState />
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/15 p-12 text-center">
      <div className="text-5xl" aria-hidden>♡</div>
      <p className="text-base font-semibold text-gray-200">Belum ada kupon favorit</p>
      <p className="max-w-md text-sm text-gray-400">
        Klik icon hati di pojok kanan atas kupon untuk menyimpannya. Favorit
        akan tersimpan di perangkat ini (localStorage).
      </p>
      <Link
        href="/"
        className="mt-3 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        ← Jelajahi Kupon
      </Link>
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
