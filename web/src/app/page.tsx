"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { isAbortError, listCoupons, listMerchants } from "@/lib/api";
import type { Coupon, MerchantWithCount } from "@/lib/types";
import { CouponCard } from "@/components/CouponCard";
import { CouponSkeletonGrid } from "@/components/CouponSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar, type SortKey } from "@/components/FilterBar";
import { QuickFilters, type QuickFilterState } from "@/components/QuickFilters";
import { ExpiringBanner } from "@/components/ExpiringBanner";
import { SortPresets } from "@/components/SortPresets";
import { useFilterPresets, type FilterPreset } from "@/lib/use-filter-presets";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import { AutoRefreshControl } from "@/components/AutoRefreshControl";
import { MerchantLogo } from "@/components/MerchantLogo";
import { FollowedMerchantsSection } from "@/components/FollowedMerchantsSection";
import { TopPicksCarousel } from "@/components/TopPicksCarousel";
import { TrendingNowSection } from "@/components/TrendingNowSection";
import { SmartPick } from "@/components/SmartPick";
import { RightSidebar } from "@/components/RightSidebar";
import { DiscountSlider } from "@/components/DiscountSlider";
import { SmartLink } from "@/components/SmartLink";
import { StickyMerchantStrip } from "@/components/StickyMerchantStrip";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useI18n } from "@/i18n/provider";

const FALLBACK_MERCHANTS = [
  { name: "Shopee", emoji: "🛍️", slug: "shopee" },
  { name: "DANA", emoji: "💳", slug: "dana" },
  { name: "OVO", emoji: "💰", slug: "ovo" },
  { name: "Tix ID", emoji: "🎬", slug: "tix-id" },
  { name: "Tokopedia", emoji: "🛒", slug: "tokopedia" },
  { name: "Traveloka", emoji: "✈️", slug: "traveloka" },
  { name: "Grab", emoji: "🚗", slug: "grab" },
  { name: "Gojek", emoji: "🛵", slug: "gojek" },
  { name: "Bukalapak", emoji: "📦", slug: "bukalapak" },
  { name: "Zalora", emoji: "👗", slug: "zalora" },
  { name: "Blibli", emoji: "🎁", slug: "blibli" },
  { name: "Lazada", emoji: "💼", slug: "lazada" },
];

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-gray-400">Loading…</div>}>
      <Home />
    </Suspense>
  );
}

function Home() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  const PAGE_SIZE = 24;
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [merchants, setMerchants] = useState<MerchantWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // Initialize filter state from URL — enables smart back via browser history
  const [sort, setSort] = useState<SortKey>(
    () => (searchParams.get("sort") as SortKey) || "newest",
  );
  const [minQuality, setMinQuality] = useState(
    () => Number(searchParams.get("mq") ?? 0) || 0,
  );
  const [quick, setQuick] = useState<QuickFilterState>(() => ({
    merchant: searchParams.get("m") ?? undefined,
    category: searchParams.get("c") ?? undefined,
    region: searchParams.get("r") ?? undefined,
    discountType: searchParams.get("dt") ?? undefined,
    minDiscount: searchParams.get("md") ? Number(searchParams.get("md")) : undefined,
  }));
  const [newCountToast, setNewCountToast] = useState<number | null>(null);
  const currentIdsRef = useRef<Set<number>>(new Set());
  const loadMoreCtrlRef = useRef<AbortController | null>(null);
  const autoRefreshCtrlRef = useRef<AbortController | null>(null);
  const { presets, savePreset, removePreset } = useFilterPresets();

  // Sync filter state back to URL (debounced via useEffect — replace, not push,
  // so back button skips intermediate filter changes)
  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (sort !== "newest") next.set("sort", sort);
    if (minQuality > 0) next.set("mq", String(minQuality));
    if (quick.merchant) next.set("m", quick.merchant);
    if (quick.category) next.set("c", quick.category);
    if (quick.region) next.set("r", quick.region);
    if (quick.discountType) next.set("dt", quick.discountType);
    if (quick.minDiscount) next.set("md", String(quick.minDiscount));
    const newQuery = next.toString();
    const newPath = newQuery ? `/?${newQuery}` : "/";
    // Only replace if URL actually changed (avoid replace loop)
    const currentParams = new URLSearchParams(searchParams.toString());
    if (currentParams.toString() !== newQuery) {
      router.replace(newPath, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, minQuality, quick]);

  // Listen to URL changes (browser back/forward) → restore filter state
  useEffect(() => {
    setSort((searchParams.get("sort") as SortKey) || "newest");
    setMinQuality(Number(searchParams.get("mq") ?? 0) || 0);
    setQuick({
      merchant: searchParams.get("m") ?? undefined,
      category: searchParams.get("c") ?? undefined,
      region: searchParams.get("r") ?? undefined,
      discountType: searchParams.get("dt") ?? undefined,
      minDiscount: searchParams.get("md")
        ? Number(searchParams.get("md"))
        : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // Abort any in-flight loadMore / auto-refresh on unmount
  useEffect(() => {
    return () => {
      loadMoreCtrlRef.current?.abort();
      autoRefreshCtrlRef.current?.abort();
    };
  }, []);

  const handleSavePreset = () => {
    const created = savePreset({ sort, minQuality, quick });
    if (!created) {
      alert("Set filter dulu (merchant, kategori, dll) sebelum save preset.");
    }
  };

  const applyPreset = (p: FilterPreset) => {
    setSort(p.sort);
    setMinQuality(p.minQuality);
    setQuick(p.quick);
  };

  const hasActiveFilter =
    minQuality > 0 ||
    !!quick.merchant ||
    !!quick.category ||
    !!quick.region ||
    !!quick.discountType ||
    !!quick.minDiscount ||
    sort !== "newest";

  // Build filter object — memoized via stringify in dep array
  const filterKey = JSON.stringify({ sort, minQuality, q, quick });

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setHasMore(true);
    Promise.all([
      listCoupons(
        {
          limit: PAGE_SIZE,
          offset: 0,
          sort,
          min_quality: minQuality,
          q: q || undefined,
          category: quick.category,
          merchant: quick.merchant,
          discount_type: quick.discountType,
          min_discount: quick.minDiscount,
          region: quick.region,
        },
        { signal: ctrl.signal },
      ).catch((e) => {
        if (isAbortError(e)) throw e;
        return [] as Coupon[];
      }),
      listMerchants({ signal: ctrl.signal }).catch((e) => {
        if (isAbortError(e)) throw e;
        return [] as MerchantWithCount[];
      }),
    ])
      .then(([c, m]) => {
        if (ctrl.signal.aborted) return;
        setCoupons(c);
        setMerchants(m);
        currentIdsRef.current = new Set(c.map((x) => x.id));
        setHasMore(c.length >= PAGE_SIZE);
        setLoading(false);
      })
      .catch((e) => {
        if (!isAbortError(e)) setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Auto-refresh: refetch current filter set + show toast if new IDs detected.
  // Aborts prior in-flight refresh (e.g. user clicks Refresh during running poll).
  const autoRefreshCallback = useCallback(async () => {
    autoRefreshCtrlRef.current?.abort();
    const ctrl = new AbortController();
    autoRefreshCtrlRef.current = ctrl;
    try {
      const fresh = await listCoupons(
        {
          limit: Math.max(PAGE_SIZE, coupons.length || PAGE_SIZE),
          offset: 0,
          sort,
          min_quality: minQuality,
          q: q || undefined,
          category: quick.category,
          merchant: quick.merchant,
          discount_type: quick.discountType,
          min_discount: quick.minDiscount,
          region: quick.region,
        },
        { signal: ctrl.signal },
      );
      if (ctrl.signal.aborted) return;
      const previousIds = currentIdsRef.current;
      const newOnes = fresh.filter((c) => !previousIds.has(c.id));
      setCoupons(fresh);
      currentIdsRef.current = new Set(fresh.map((c) => c.id));
      setHasMore(fresh.length >= PAGE_SIZE);
      if (newOnes.length > 0) {
        setNewCountToast(newOnes.length);
        setTimeout(() => setNewCountToast(null), 4000);
      }
    } catch {
      /* silent — abort or network error */
    }
  }, [coupons.length, sort, minQuality, q, quick]);

  const autoRefresh = useAutoRefresh({ onRefresh: autoRefreshCallback });

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    loadMoreCtrlRef.current?.abort();
    const ctrl = new AbortController();
    loadMoreCtrlRef.current = ctrl;
    setLoadingMore(true);
    try {
      const more = await listCoupons(
        {
          limit: PAGE_SIZE,
          offset: coupons.length,
          sort,
          min_quality: minQuality,
          q: q || undefined,
          category: quick.category,
          merchant: quick.merchant,
          discount_type: quick.discountType,
          min_discount: quick.minDiscount,
          region: quick.region,
        },
        { signal: ctrl.signal },
      );
      if (ctrl.signal.aborted) return;
      setCoupons((prev) => [...prev, ...more]);
      setHasMore(more.length >= PAGE_SIZE);
    } catch (e) {
      if (!isAbortError(e)) setHasMore(false);
    } finally {
      if (!ctrl.signal.aborted) setLoadingMore(false);
    }
  };

  const clearSearch = () => router.push("/");
  const isSearching = q.length > 0;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">
    <div className="min-w-0 space-y-6">
      <ExpiringBanner />

      <section className="hero-mesh-bg relative overflow-hidden rounded-2xl p-6 text-white shadow-xl animate-slide-up">
        {/* Floating decorative blobs */}
        <div
          className="float-blob-a pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-pink-400/40 to-fuchsia-500/20 blur-2xl"
          aria-hidden
        />
        <div
          className="float-blob-b pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-gradient-to-br from-blue-400/40 to-cyan-500/20 blur-2xl"
          aria-hidden
        />

        {/* Static decorative emoji */}
        <div className="float-blob-a pointer-events-none absolute right-6 top-6 text-7xl opacity-20" aria-hidden>
          🎟️
        </div>
        <div className="float-blob-b pointer-events-none absolute -bottom-2 left-4 text-6xl opacity-20" aria-hidden>
          ✨
        </div>

        {/* Subtle grain overlay */}
        <div className="grain-overlay" aria-hidden />

        <h1 className="relative text-2xl font-bold drop-shadow-md sm:text-3xl">
          {t("site.tagline")}
        </h1>
        <p className="relative mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
          {t("site.description")}
        </p>
        <Link
          href="/decide"
          className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-700 shadow-lg transition hover:scale-105 hover:bg-amber-50 hover:shadow-xl"
        >
          <span className="text-lg">🧭</span>
          <span>Bingung pilih? Pakai Decision Helper</span>
          <span className="text-brand-500">→</span>
        </Link>
      </section>

      {/* Smart Pick — pilih goal */}
      {!isSearching && (
        <ScrollReveal>
          <SmartPick />
        </ScrollReveal>
      )}

      {/* Live Trending — kupon paling rame saat ini */}
      {!isSearching && (
        <ScrollReveal delay={50}>
          <TrendingNowSection />
        </ScrollReveal>
      )}

      {/* Top Picks horizontal carousel */}
      {!isSearching && (
        <ScrollReveal>
          <TopPicksCarousel />
        </ScrollReveal>
      )}

      {!isSearching && (
        <ScrollReveal delay={80}>
          <FollowedMerchantsSection />
        </ScrollReveal>
      )}

      {!isSearching && (
        <section id="main-merchant-pills">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("section.merchants")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {merchants.length > 0
              ? merchants.slice(0, 16).map((m) => (
                  <SmartLink
                    key={m.slug}
                    href={`/merchant/${m.slug}`}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3 text-sm shadow-sm transition hover:border-brand-400 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-brand-500 dark:hover:bg-gray-700"
                  >
                    <MerchantLogo merchant={m} size={22} rounded="full" />
                    <span className="font-medium">{m.name}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {m.coupon_count}
                    </span>
                  </SmartLink>
                ))
              : FALLBACK_MERCHANTS.map((m) => (
                  <Link
                    key={m.slug}
                    href={`/?q=${encodeURIComponent(m.name)}`}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm transition hover:border-brand-400 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-brand-500 dark:hover:bg-gray-700"
                  >
                    <span aria-hidden>{m.emoji}</span>
                    <span className="font-medium">{m.name}</span>
                    <span
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                      title="Belum terhubung ke backend"
                    >
                      —
                    </span>
                  </Link>
                ))}
          </div>
        </section>
      )}

      {/* Fitur Tambahan — 4 unique features (no duplicates) */}
      {!isSearching && (
        <ScrollReveal>
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">Fitur Tambahan</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  href: "/alerts",
                  emoji: "🔔",
                  title: "Alerts & Notifikasi",
                  desc: "Notifikasi real-time saat ada kupon baru atau harga produk turun.",
                  cta: "Aktifkan",
                },
                {
                  href: "/bookmarklet",
                  emoji: "🧩",
                  title: "Bookmarklet Tool",
                  desc: "Drag tombol ke bookmark bar — klik saat di halaman checkout untuk cek kupon.",
                  cta: "Cara Pasang",
                },
                {
                  href: "/favorites",
                  emoji: "❤️",
                  title: "Wishlist & Favorit",
                  desc: "Simpan kupon favoritmu untuk diakses cepat saat butuh nanti.",
                  cta: "Lihat Wishlist",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-brand-400/40 hover:bg-white/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-xl">
                      {f.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">{f.title}</p>
                      <p className="mt-1 text-[11px] leading-snug text-gray-400">{f.desc}</p>
                    </div>
                  </div>
                  <Link
                    href={f.href}
                    className="mt-3 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-brand-400 hover:bg-brand-500/20"
                  >
                    {f.cta} →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* Cara Menggunakan SuperKupon — 3 steps */}
      {!isSearching && (
        <ScrollReveal>
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">Cara Menggunakan SuperKupon</h2>
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-white/5 p-5 sm:grid-cols-3">
              {[
                { n: 1, title: "Cari Kupon", desc: "Cari kupon favoritmu dari ribuan pilihan." },
                { n: 2, title: "Salin Kode", desc: "Salin kode kupon dengan satu klik mudah." },
                { n: 3, title: "Belanja & Hemat", desc: "Gunakan kode saat checkout dan nikmati hematnya!" },
              ].map((step, i, arr) => (
                <div key={step.n} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-base font-black text-white shadow-lg shadow-brand-500/30">
                    {step.n}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{step.title}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{step.desc}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="hidden text-gray-500 sm:inline" aria-hidden>
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>
      )}

      <section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        {(presets.length > 0 || hasActiveFilter) && (
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              📋 Preset:
            </span>
            {presets.map((p) => (
              <span
                key={p.id}
                className="group inline-flex items-center gap-1 rounded-full border border-brand-400/40 bg-brand-500/10 pl-3 pr-1 text-xs font-medium text-brand-300"
              >
                <button
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="py-1 hover:underline"
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  onClick={() => removePreset(p.id)}
                  aria-label={`Hapus preset "${p.name}"`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition hover:bg-rose-500/20 hover:text-rose-300"
                >
                  ✕
                </button>
              </span>
            ))}
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleSavePreset}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
              >
                + Simpan filter saat ini
              </button>
            )}
            {presets.length === 0 && !hasActiveFilter && (
              <span className="text-xs text-gray-500">Belum ada preset</span>
            )}
          </div>
        )}
        <DiscountSlider
          value={quick.minDiscount ?? 0}
          onChange={(v) => setQuick((s) => ({ ...s, minDiscount: v > 0 ? v : undefined }))}
        />
        <QuickFilters state={quick} setState={setQuick} />
        <div className="border-t border-white/10 pt-3">
          <SortPresets sort={sort} setSort={setSort} />
        </div>
      </section>

      <div className="sticky top-14 z-30 -mx-4 space-y-2 border-y border-gray-200/60 bg-white/85 px-4 py-2 backdrop-blur-md dark:border-gray-800/60 dark:bg-gray-950/85 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="max-w-3xl">
          <SearchBar />
        </div>
        <FilterBar
          sort={sort}
          onSortChange={setSort}
          minQuality={minQuality}
          onMinQualityChange={setMinQuality}
          totalCount={coupons.length}
        />
        {!isSearching && merchants.length > 0 && (
          <StickyMerchantStrip
            merchants={merchants}
            watchElementId="main-merchant-pills"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 -mt-2">
        <AutoRefreshControl state={autoRefresh} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {isSearching
              ? t("search.results_for", { q })
              : t("section.latest")}
          </h2>
          {isSearching && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              ✕ {t("filter.clear")}
            </button>
          )}
        </div>

        {loading ? (
          <CouponSkeletonGrid count={9} />
        ) : coupons.length === 0 ? (
          isSearching ? (
            <EmptySearch query={q} onReset={clearSearch} />
          ) : (
            <EmptyData
              minQuality={minQuality}
              quick={quick}
              sort={sort}
              onResetQuality={() => setMinQuality(0)}
              onResetQuickField={(field) =>
                setQuick((s) => ({ ...s, [field]: undefined }))
              }
              onResetAll={() => {
                setMinQuality(0);
                setQuick({});
                setSort("newest");
              }}
            />
          )
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {coupons.map((c) => (
                <CouponCard key={c.id} coupon={c} highlight={q} />
              ))}
            </div>
            <div className="mt-6 flex flex-col items-center gap-2">
              {hasMore ? (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? "Memuat..." : `Tampilkan lebih banyak (+${PAGE_SIZE})`}
                </button>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Itu semua kupon yang cocok — {coupons.length} total
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {newCountToast !== null && newCountToast > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 animate-slide-up"
        >
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setNewCountToast(null);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-2xl transition hover:bg-emerald-600"
          >
            <span aria-hidden>✨</span>
            {newCountToast} kupon baru — klik buat scroll ke atas
          </button>
        </div>
      )}
    </div>

    {/* Right Sidebar — Rekomendasi + Trending + Premium */}
    <aside className="hidden lg:block">
      <div className="sticky top-20 space-y-4">
        <RightSidebar />
      </div>
    </aside>
    </div>
  );
}

function EmptySearch({ query, onReset }: { query: string; onReset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
      <div className="text-5xl" aria-hidden>🔍</div>
      <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {t("search.no_results")}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        &ldquo;<span className="font-medium text-gray-700 dark:text-gray-300">{query}</span>&rdquo;
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        {t("filter.clear")}
      </button>
    </div>
  );
}

interface EmptyDataProps {
  minQuality: number;
  quick: QuickFilterState;
  sort: SortKey;
  onResetQuality?: () => void;
  onResetQuickField?: (field: keyof QuickFilterState) => void;
  onResetAll?: () => void;
}

function EmptyData({
  minQuality,
  quick,
  sort,
  onResetQuality,
  onResetQuickField,
  onResetAll,
}: EmptyDataProps) {
  const { t } = useI18n();

  // Build context-aware tips based on active filters
  const tips: { label: string; action: () => void; emoji: string }[] = [];

  if (minQuality > 0 && onResetQuality) {
    tips.push({
      emoji: "⭐",
      label: `Turunkan filter kualitas (sekarang ≥${minQuality})`,
      action: onResetQuality,
    });
  }
  if (quick.minDiscount && onResetQuickField) {
    tips.push({
      emoji: "🎚",
      label: `Turunkan min diskon (sekarang ${quick.minDiscount}%)`,
      action: () => onResetQuickField("minDiscount"),
    });
  }
  if (quick.discountType && onResetQuickField) {
    tips.push({
      emoji: "🏷",
      label: `Hapus filter tipe diskon "${quick.discountType}"`,
      action: () => onResetQuickField("discountType"),
    });
  }
  if (quick.merchant && onResetQuickField) {
    tips.push({
      emoji: "🛍",
      label: `Hapus filter merchant "${quick.merchant}"`,
      action: () => onResetQuickField("merchant"),
    });
  }
  if (quick.category && onResetQuickField) {
    tips.push({
      emoji: "📂",
      label: `Hapus filter kategori "${quick.category}"`,
      action: () => onResetQuickField("category"),
    });
  }
  if (quick.region && onResetQuickField) {
    tips.push({
      emoji: "📍",
      label: `Hapus filter region "${quick.region}"`,
      action: () => onResetQuickField("region"),
    });
  }

  const hasAnyFilter = tips.length > 0;

  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
      <div className="text-5xl" aria-hidden>{hasAnyFilter ? "🔍" : "📭"}</div>
      <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
        {hasAnyFilter
          ? "Filter lo terlalu spesifik"
          : t("empty.no_coupons_title")}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {hasAnyFilter
          ? `${tips.length} filter aktif. Coba hapus salah satu:`
          : sort !== "newest"
            ? `Belum ada hasil dengan sort "${sort}". Backend mungkin lagi update.`
            : "Belum ada kupon yang ke-aggregate. Tunggu scheduler scrape data baru."}
      </p>

      {tips.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {tips.slice(0, 4).map((tip, i) => (
            <button
              key={i}
              type="button"
              onClick={tip.action}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-400/40 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-300 hover:bg-brand-500/20"
            >
              <span aria-hidden>{tip.emoji}</span>
              {tip.label}
            </button>
          ))}
          {tips.length > 1 && onResetAll && (
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
            >
              ✕ Reset semua filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
