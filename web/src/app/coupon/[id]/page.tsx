"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { Coupon } from "@/lib/types";
import {
  formatDiscount,
  formatExpiry,
  getCoupon,
  getRecommendations,
  isAbortError,
  trackRedeem,
  trackView,
} from "@/lib/api";
import { useI18n } from "@/i18n/provider";
import { useHistory } from "@/lib/use-history";
import { useStreak } from "@/lib/use-streak";
import { useExpiryCountdown } from "@/lib/use-expiry-countdown";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ShareButton } from "@/components/ShareButton";
import { CouponCard } from "@/components/CouponCard";
import { CouponSkeletonGrid } from "@/components/CouponSkeleton";
import { VerifyButtons } from "@/components/VerifyButtons";
import { MerchantLogo } from "@/components/MerchantLogo";
import { fireConfetti } from "@/lib/confetti";

function isNewCoupon(scrapedAt: string): boolean {
  const dt = new Date(scrapedAt).getTime();
  if (!Number.isFinite(dt)) return false;
  return Date.now() - dt < 24 * 60 * 60 * 1000;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export default function CouponDetailPage() {
  const params = useParams<{ id: string }>();
  const idParam = params?.id;
  const id = Number(idParam);

  const { t } = useI18n();
  const { addClaim } = useHistory();
  const { recordClaim } = useStreak();

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [related, setRelated] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const expiry = useExpiryCountdown(coupon?.expires_at ?? null);

  // Fetch coupon + track view
  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setError("ID kupon tidak valid");
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    getCoupon(id, { signal: ctrl.signal })
      .then((c) => {
        if (ctrl.signal.aborted) return;
        setCoupon(c);
        void trackView(id);
      })
      .catch((e) => {
        if (isAbortError(e)) return;
        const msg = e instanceof Error ? e.message : "Gagal load kupon";
        setError(msg.includes("404") ? "Kupon tidak ditemukan" : msg);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [id]);

  // Fetch related coupons from same merchant
  useEffect(() => {
    if (!coupon) return;
    const ctrl = new AbortController();
    setRelatedLoading(true);
    getRecommendations({ merchant: coupon.merchant.slug, limit: 7 }, { signal: ctrl.signal })
      .then((items) => {
        if (ctrl.signal.aborted) return;
        setRelated(items.filter((c) => c.id !== coupon.id).slice(0, 6));
      })
      .catch((e) => {
        if (!isAbortError(e)) setRelated([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setRelatedLoading(false);
      });
    return () => ctrl.abort();
  }, [coupon]);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!coupon?.code) return;
    // Capture rect BEFORE await
    const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect();
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      void trackRedeem(coupon.id);
      addClaim(coupon);
      recordClaim();
      if (rect) {
        try {
          fireConfetti({
            origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
            particleCount: 120,
          });
        } catch {
          /* ignore confetti */
        }
      }
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error || !coupon) {
    return (
      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          ← Kembali ke beranda
        </Link>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <div className="text-6xl" aria-hidden>
            🔍
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {error || "Kupon tidak ditemukan"}
          </h1>
          <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
            Kupon yang lo cari mungkin sudah expired, dihapus, atau ID-nya salah. Coba browse kupon
            lain dari beranda.
          </p>
          <Link
            href="/"
            className="mt-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Lihat kupon lainnya
          </Link>
        </div>
      </div>
    );
  }

  const isNew = isNewCoupon(coupon.scraped_at);
  const isExpiringSoon = expiry.urgency === "warning" || expiry.urgency === "critical";
  const isExpired = expiry.urgency === "expired";

  return (
    <div className="space-y-6">
      {/* Sticky Breadcrumb */}
      <div className="sticky top-14 z-20 -mx-4 border-b border-gray-200/60 bg-white/85 px-4 py-2 backdrop-blur-md dark:border-gray-800/60 dark:bg-gray-950/85 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/" className="hover:text-brand-600 dark:hover:text-brand-400">
            Beranda
          </Link>
          <span aria-hidden>›</span>
          <Link
            href={`/merchant/${coupon.merchant.slug}`}
            className="hover:text-brand-600 dark:hover:text-brand-400"
          >
            {coupon.merchant.name}
          </Link>
          <span aria-hidden>›</span>
          <span className="truncate font-medium text-gray-700 dark:text-gray-200">
            {coupon.title}
          </span>
        </nav>
      </div>

      {/* Main coupon card */}
      <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 animate-slide-up">
        {/* Header bar with discount badge */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-gray-200 bg-gradient-to-br from-brand-500/5 to-brand-700/5 p-6 dark:border-gray-700 dark:from-brand-900/20 dark:to-brand-700/10">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <MerchantLogo merchant={coupon.merchant} size={20} rounded="sm" />
              <Link
                href={`/merchant/${coupon.merchant.slug}`}
                className="text-xs font-bold uppercase tracking-wide text-brand-600 hover:underline dark:text-brand-400"
              >
                {coupon.merchant.name}
              </Link>
              {isNew && (
                <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  ✨ Baru
                </span>
              )}
              {coupon.quality_score >= 80 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  ★ Quality {coupon.quality_score}
                </span>
              )}
              {coupon.category && (
                <Link
                  href={`/category/${coupon.category.slug}`}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
                >
                  {coupon.category.name}
                </Link>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
              {coupon.title}
            </h1>
            {coupon.description && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 sm:text-base">
                {coupon.description}
              </p>
            )}
          </div>
          <div className="flex-none rounded-xl bg-brand-50 px-4 py-3 text-right dark:bg-brand-800/30">
            <div className="text-[10px] uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Diskon
            </div>
            <div className="mt-0.5 text-2xl font-black text-brand-700 dark:text-brand-300 sm:text-3xl">
              {formatDiscount(coupon, t)}
            </div>
          </div>
        </header>

        {/* Code + action buttons */}
        <div className="space-y-4 p-6">
          {coupon.code ? (
            <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-brand-400 bg-brand-50/40 p-4 dark:border-brand-500 dark:bg-brand-900/20 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Kode Promo
                </div>
                <div className="mt-1 select-all break-all font-mono text-xl font-black tracking-wider text-brand-700 dark:text-brand-300 sm:text-2xl">
                  {coupon.code}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex-none rounded-lg bg-brand-500 px-6 py-3 text-base font-bold text-white shadow transition hover:bg-brand-600 active:scale-95"
              >
                {copied ? `✓ ${t("coupon.copied") || "Tersalin!"}` : t("coupon.copy") || "Salin Kode"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
              Promo otomatis — tidak perlu kode, langsung diskon di checkout.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {coupon.merchant.website && (
              <a
                href={coupon.merchant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-600"
              >
                🌐 Pakai di {coupon.merchant.name}
              </a>
            )}
            <ShareButton coupon={coupon} />
            <FavoriteButton couponId={coupon.id} />
          </div>
        </div>
      </article>

      {/* Details grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DetailTile
          label="Berlaku Sampai"
          value={expiry.isLive ? expiry.text : formatExpiry(coupon.expires_at, t)}
          icon={expiry.urgency === "critical" ? "🔥" : "⏰"}
          highlight={isExpiringSoon || isExpired}
          tone={isExpired ? "danger" : isExpiringSoon ? "warning" : "neutral"}
          subValue={
            expiry.isLive && !isExpired
              ? `Sisa ${expiry.text}`
              : undefined
          }
        />
        <DetailTile
          label="Min Belanja"
          value={coupon.min_spend ? formatRupiah(coupon.min_spend) : "Tanpa minimum"}
          icon="🛒"
        />
        <DetailTile
          label="Max Diskon"
          value={coupon.max_discount ? formatRupiah(coupon.max_discount) : "Tanpa batas"}
          icon="💰"
        />
        <DetailTile
          label="Dilihat / Disalin"
          value={`${coupon.view_count ?? 0} / ${coupon.redeem_count ?? 0}`}
          icon="📊"
        />
      </section>

      {/* Source info */}
      <section className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Sumber Data
        </h2>
        <dl className="grid grid-cols-1 gap-y-1 sm:grid-cols-2">
          <div>
            <dt className="inline font-semibold text-gray-700 dark:text-gray-300">Di-scrape:</dt>{" "}
            <dd className="inline">{formatDateTime(coupon.scraped_at)}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-gray-700 dark:text-gray-300">Source:</dt>{" "}
            <dd className="inline font-mono">{coupon.source_target}</dd>
          </div>
          {coupon.source_url && (
            <div className="col-span-1 sm:col-span-2">
              <dt className="inline font-semibold text-gray-700 dark:text-gray-300">Link asli:</dt>{" "}
              <dd className="inline">
                <a
                  href={coupon.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-brand-600 hover:underline dark:text-brand-400"
                >
                  {coupon.source_url} →
                </a>
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Verify / Report */}
      <VerifyButtons couponId={coupon.id} />

      {/* Related coupons from same merchant */}
      <section>
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Kupon lain dari {coupon.merchant.name}
          </h2>
          <Link
            href={`/merchant/${coupon.merchant.slug}`}
            className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Lihat semua →
          </Link>
        </header>
        {relatedLoading ? (
          <CouponSkeletonGrid count={3} />
        ) : related.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Belum ada kupon lain dari merchant ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((c) => (
              <CouponCard key={c.id} coupon={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DetailTile({
  label,
  value,
  icon,
  subValue,
  highlight,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: string;
  subValue?: string;
  highlight?: boolean;
  tone?: "neutral" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
    warning: "border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20",
    danger: "border-rose-400 bg-rose-50 dark:border-rose-500 dark:bg-rose-900/20",
  }[tone];

  const valueClass = {
    neutral: "text-gray-900 dark:text-gray-100",
    warning: "text-amber-700 dark:text-amber-300",
    danger: "text-rose-700 dark:text-rose-300",
  }[tone];

  return (
    <div
      className={[
        "rounded-xl border p-3 transition",
        toneClass,
        highlight ? "shadow-md" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <div className={["mt-1 line-clamp-2 text-sm font-bold sm:text-base", valueClass].join(" ")}>
        {value}
      </div>
      {subValue && (
        <div className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">
          ⏱ {subValue}
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-3 w-48 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-8 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-4 h-14 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="mt-2 flex gap-2">
          <div className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}
