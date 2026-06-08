"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { getCouponsByIds, formatDiscount, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { useFavorites } from "@/lib/use-favorites";
import { MerchantLogo } from "@/components/MerchantLogo";
import { CouponActionGroup } from "@/components/CouponActionGroup";

export const dynamic = "force-dynamic";

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      }
    >
      <Compare />
    </Suspense>
  );
}

function Compare() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 4);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const { ids: favIds, isFavorite } = useFavorites();

  useEffect(() => {
    if (ids.length === 0) {
      setCoupons([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    getCouponsByIds(ids, { signal: ctrl.signal })
      .then((c) => {
        if (!ctrl.signal.aborted) {
          const ordered = ids
            .map((id) => c.find((x) => x.id === id))
            .filter((x): x is Coupon => Boolean(x));
          setCoupons(ordered);
        }
      })
      .catch((e) => {
        if (!isAbortError(e)) setCoupons([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [idsParam]);

  const removeFromCompare = (id: number) => {
    const next = coupons.filter((c) => c.id !== id).map((c) => c.id);
    if (next.length === 0) router.push("/compare");
    else router.push(`/compare?ids=${next.join(",")}`);
  };

  const addFromFavorites = (id: number) => {
    if (coupons.length >= 4) return;
    if (coupons.some((c) => c.id === id)) return;
    const next = [...coupons.map((c) => c.id), id];
    router.push(`/compare?ids=${next.join(",")}`);
  };

  const availableFromFavs = favIds.filter((id) => !coupons.some((c) => c.id === id));

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/20 via-transparent to-transparent p-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          📊 Compare Kupon
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Pilih sampai 4 kupon untuk bandingin side-by-side: diskon, syarat, expiry, dll.
        </p>
        {coupons.length > 0 && (
          <p className="mt-3 inline-block rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-200">
            {coupons.length} / 4 dipilih
          </p>
        )}
      </header>

      {loading ? (
        <p className="text-center text-sm text-gray-400">Loading…</p>
      ) : coupons.length === 0 ? (
        <EmptyCompareState favIds={favIds} addFromFavorites={addFromFavorites} />
      ) : (
        <>
          <ComparisonTable
            coupons={coupons}
            onRemove={removeFromCompare}
            t={t}
          />

          {coupons.length < 4 && availableFromFavs.length > 0 && (
            <section className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                + Tambah dari Favorit ({availableFromFavs.length} tersedia)
              </p>
              <div className="flex flex-wrap gap-2">
                {availableFromFavs.slice(0, 12).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => addFromFavorites(id)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-brand-400 hover:bg-brand-500/15"
                  >
                    + Kupon #{id}
                  </button>
                ))}
              </div>
            </section>
          )}

          <Link
            href="/"
            className="inline-block text-sm font-semibold text-brand-300 hover:underline"
          >
            ← Cari kupon lain untuk dibandingin
          </Link>
        </>
      )}
    </div>
  );
}

function EmptyCompareState({
  favIds,
  addFromFavorites,
}: {
  favIds: number[];
  addFromFavorites: (id: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 p-12 text-center">
      <div className="text-6xl" aria-hidden>
        ⚖️
      </div>
      <h2 className="text-xl font-bold text-white">Belum ada kupon dipilih</h2>
      <p className="max-w-md text-sm text-gray-400">
        Cara pakai:
      </p>
      <ol className="max-w-md space-y-1 text-left text-sm text-gray-300">
        <li>1. Klik hati ❤️ di kupon yg menarik (jadi favorit)</li>
        <li>2. Balik ke sini, pilih dari favoritmu</li>
        <li>3. Bandingin sampai 4 kupon side-by-side</li>
      </ol>

      {favIds.length > 0 ? (
        <div className="mt-4 w-full max-w-lg space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            ✨ Quick start — pilih dari favorit kamu:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {favIds.slice(0, 8).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => addFromFavorites(id)}
                className="rounded-full border border-brand-400/40 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-200 transition hover:bg-brand-500/20"
              >
                + Kupon #{id}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Link
          href="/"
          className="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-brand-600"
        >
          🔍 Cari kupon dulu
        </Link>
      )}
    </div>
  );
}

function ComparisonTable({
  coupons,
  onRemove,
  t,
}: {
  coupons: Coupon[];
  onRemove: (id: number) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  // Highlight winners per row
  const bestDiscount = Math.max(...coupons.map((c) => c.discount_value));
  const bestQuality = Math.max(...coupons.map((c) => c.quality_score));
  const bestMaxDisc = Math.max(...coupons.map((c) => c.max_discount ?? 0));
  const earliestExpiry = coupons
    .map((c) => (c.expires_at ? new Date(c.expires_at).getTime() : Infinity))
    .filter((t) => Number.isFinite(t));
  const minExpiry = earliestExpiry.length > 0 ? Math.min(...earliestExpiry) : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-x-3 border-spacing-y-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-32 bg-gray-950/95 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 backdrop-blur">
              {/* spacer */}
            </th>
            {coupons.map((c) => (
              <th
                key={c.id}
                className="min-w-[200px] rounded-t-xl border border-white/10 border-b-0 bg-gradient-to-br from-brand-500/10 to-transparent p-3 text-left align-top"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/coupon/${c.id}`} className="flex items-center gap-2 hover:underline">
                    <MerchantLogo merchant={c.merchant} size={28} rounded="md" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-brand-300">
                        {c.merchant.name}
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onRemove(c.id)}
                    aria-label="Hapus dari compare"
                    className="text-xs text-gray-500 hover:text-rose-400"
                  >
                    ✕
                  </button>
                </div>
                <h3 className="mt-2 line-clamp-2 text-sm font-bold text-white">
                  {c.title}
                </h3>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm">
          <CompareRow label="🏷 Diskon">
            {coupons.map((c) => (
              <Cell key={c.id} highlight={c.discount_value === bestDiscount && bestDiscount > 0}>
                <span className="font-bold text-brand-300">{formatDiscount(c, t)}</span>
              </Cell>
            ))}
          </CompareRow>

          <CompareRow label="💰 Max Hemat">
            {coupons.map((c) => (
              <Cell
                key={c.id}
                highlight={(c.max_discount ?? 0) === bestMaxDisc && bestMaxDisc > 0}
              >
                {c.max_discount
                  ? `Rp ${c.max_discount.toLocaleString("id-ID")}`
                  : "Tanpa batas"}
              </Cell>
            ))}
          </CompareRow>

          <CompareRow label="🛒 Min Belanja">
            {coupons.map((c) => (
              <Cell key={c.id}>
                {c.min_spend
                  ? `Rp ${c.min_spend.toLocaleString("id-ID")}`
                  : "Tidak ada"}
              </Cell>
            ))}
          </CompareRow>

          <CompareRow label="⭐ Quality">
            {coupons.map((c) => (
              <Cell key={c.id} highlight={c.quality_score === bestQuality}>
                <span className="font-mono">★ {c.quality_score}</span>
              </Cell>
            ))}
          </CompareRow>

          <CompareRow label="⏰ Expire">
            {coupons.map((c) => {
              const exp = c.expires_at ? new Date(c.expires_at).getTime() : null;
              const isClosest = exp !== null && exp === minExpiry;
              return (
                <Cell key={c.id} highlight={isClosest} warning={isClosest}>
                  {c.expires_at
                    ? new Date(c.expires_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })
                    : "Tanpa batas"}
                </Cell>
              );
            })}
          </CompareRow>

          <CompareRow label="📂 Kategori">
            {coupons.map((c) => (
              <Cell key={c.id}>
                <span className="text-xs">{c.category?.name ?? "—"}</span>
              </Cell>
            ))}
          </CompareRow>

          <CompareRow label="🎫 Kode">
            {coupons.map((c) => (
              <Cell key={c.id}>
                {c.code ? (
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">
                    {c.code}
                  </code>
                ) : (
                  <span className="text-xs text-gray-500">Auto (no code)</span>
                )}
              </Cell>
            ))}
          </CompareRow>

          <CompareRow label="">
            {coupons.map((c) => (
              <Cell key={c.id}>
                <CouponActionGroup coupon={c} />
              </Cell>
            ))}
          </CompareRow>
        </tbody>
      </table>
    </div>
  );
}

function CompareRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td className="sticky left-0 z-10 bg-gray-950/95 py-2 pr-3 text-xs font-semibold uppercase tracking-wider text-gray-400 backdrop-blur">
        {label}
      </td>
      {children}
    </tr>
  );
}

function Cell({
  children,
  highlight,
  warning,
}: {
  children: React.ReactNode;
  highlight?: boolean;
  warning?: boolean;
}) {
  return (
    <td
      className={[
        "border border-white/10 border-t-0 bg-white/[0.02] px-3 py-2 align-top",
        highlight && !warning
          ? "bg-emerald-500/10 ring-1 ring-emerald-400/40"
          : "",
        warning ? "bg-amber-500/10 ring-1 ring-amber-400/40" : "",
      ].join(" ")}
    >
      {children}
    </td>
  );
}
