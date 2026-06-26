"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Coupon } from "@/lib/types";
import {
  formatDiscount,
  formatExpiry,
  getRecommendations,
  isAbortError,
  trackRedeem,
  trackView,
} from "@/lib/api";
import { wrapAffiliateLink } from "@/lib/affiliate";
import { trackOutboundClick } from "@/lib/analytics";
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
import { useAuth } from "@/components/auth/AuthProvider";

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

export function CouponDetailClient({ coupon }: { coupon: Coupon }) {
  const { t } = useI18n();
  const { addClaim } = useHistory();
  const { recordClaim } = useStreak();
  const { isLoggedIn, requireLogin, openRegister } = useAuth();

  const [related, setRelated] = useState<Coupon[]>([]);
  const [relatedCategory, setRelatedCategory] = useState<Coupon[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedCategoryLoading, setRelatedCategoryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const expiry = useExpiryCountdown(coupon.expires_at ?? null);

  useEffect(() => {
    void trackView(coupon.id);
  }, [coupon.id]);

  useEffect(() => {
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
  }, [coupon.id, coupon.merchant.slug]);

  useEffect(() => {
    if (!coupon.category) {
      setRelatedCategory([]);
      return;
    }
    const ctrl = new AbortController();
    setRelatedCategoryLoading(true);
    getRecommendations({ category: coupon.category.slug, limit: 12 }, { signal: ctrl.signal })
      .then((items) => {
        if (ctrl.signal.aborted) return;
        setRelatedCategory(
          items
            .filter((c) => c.id !== coupon.id && c.merchant.id !== coupon.merchant.id)
            .slice(0, 6),
        );
      })
      .catch((e) => {
        if (!isAbortError(e)) setRelatedCategory([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setRelatedCategoryLoading(false);
      });
    return () => ctrl.abort();
  }, [coupon.id, coupon.merchant.id, coupon.category]);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!coupon.code) return;
    // Gate: butuh login dulu untuk akses kode kupon
    if (!requireLogin()) return;
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

  const isNew = isNewCoupon(coupon.scraped_at);
  const isExpiringSoon = expiry.urgency === "warning" || expiry.urgency === "critical";
  const isExpired = expiry.urgency === "expired";

  return (
    <div className="space-y-6">
      <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 animate-slide-up">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-gray-200 bg-gradient-to-br from-brand-500/5 to-brand-700/5 p-6 dark:border-gray-700 dark:from-brand-900/20 dark:to-brand-700/10">
          <div className="min-w-0 flex-1">
            <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
              Kode Promo {coupon.merchant.name}: {coupon.title}
            </h1>
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
            {coupon.max_discount ? (
              <div className="mt-1 text-[10px] font-semibold text-brand-600/80 dark:text-brand-400/80">
                Hemat hingga {formatRupiah(coupon.max_discount)}
              </div>
            ) : null}
          </div>
        </header>

        <div className="space-y-4 p-6">
          {coupon.code ? (
            <div className="relative flex flex-col gap-3 rounded-xl border-2 border-dashed border-brand-400 bg-brand-50/40 p-4 dark:border-brand-500 dark:bg-brand-900/20 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Kode Promo
                </div>
                <div
                  className={`mt-1 select-all break-all font-mono text-xl font-black tracking-wider text-brand-700 dark:text-brand-300 sm:text-2xl ${
                    isLoggedIn ? "" : "select-none blur-md pointer-events-none"
                  }`}
                  aria-hidden={!isLoggedIn}
                >
                  {coupon.code}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex-none rounded-lg bg-brand-600 px-6 py-3 text-base font-bold text-white shadow transition hover:bg-brand-700 active:scale-95"
              >
                {!isLoggedIn
                  ? "🔒 Login untuk Salin"
                  : copied
                    ? `✓ ${t("coupon.copied") || "Tersalin!"}`
                    : t("coupon.copy") || "Salin Kode"}
              </button>
              {!isLoggedIn && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center sm:hidden">
                  <span className="rounded-full bg-purple-600/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                    🔒 Login dulu
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
              Promo otomatis — tidak perlu kode, langsung diskon di checkout.
            </div>
          )}

          {/* Guest-only CTA banner kalau ada kode */}
          {!isLoggedIn && coupon.code && (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-purple-400/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-200">
                <strong className="text-purple-700 dark:text-purple-300">
                  Daftar gratis
                </strong>{" "}
                untuk salin kode promo + akses 180+ kupon premium Indonesia.
              </div>
              <button
                onClick={openRegister}
                className="flex-none rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-purple-500/30 transition hover:shadow-lg hover:shadow-purple-500/50"
              >
                ✨ Daftar Gratis
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {coupon.merchant.website && (
              <a
                href={wrapAffiliateLink(coupon.merchant.slug, coupon.merchant.website, coupon.id)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!requireLogin()) {
                    e.preventDefault();
                    return;
                  }
                  trackOutboundClick(coupon.merchant.slug, coupon.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-600"
              >
                {isLoggedIn
                  ? `🌐 Pakai di ${coupon.merchant.name}`
                  : `🔒 Login untuk Pakai`}
              </a>
            )}
            <ShareButton coupon={coupon} />
            <FavoriteButton couponId={coupon.id} />
          </div>
        </div>
      </article>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DetailTile
          label="Berlaku Sampai"
          value={expiry.isLive ? expiry.text : formatExpiry(coupon.expires_at, t)}
          icon={expiry.urgency === "critical" ? "🔥" : "⏰"}
          highlight={isExpiringSoon || isExpired}
          tone={isExpired ? "danger" : isExpiringSoon ? "warning" : "neutral"}
          subValue={expiry.isLive && !isExpired ? `Sisa ${expiry.text}` : undefined}
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

      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
          Cara Pakai Kode Promo
        </h2>
        <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
              1
            </span>
            <span>
              {coupon.code ? (
                <>
                  Salin kode <span className="font-mono font-semibold">{coupon.code}</span> di atas.
                </>
              ) : (
                <>Klik tombol &ldquo;Pakai di {coupon.merchant.name}&rdquo; — promo otomatis berlaku.</>
              )}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
              2
            </span>
            <span>
              Buka aplikasi atau situs <strong>{coupon.merchant.name}</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
              3
            </span>
            <span>
              Belanja seperti biasa{coupon.min_spend
                ? `, pastikan total minimal ${formatRupiah(coupon.min_spend)}`
                : ""}
              {coupon.code ? ", lalu masukkan kode promo di kolom voucher saat checkout." : "."}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
              4
            </span>
            <span>
              Diskon otomatis terpotong dari total belanja
              {coupon.max_discount ? ` (maksimal ${formatRupiah(coupon.max_discount)})` : ""}.
            </span>
          </li>
        </ol>
      </section>

      <details className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <summary className="cursor-pointer text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
          Syarat &amp; Ketentuan
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-gray-700 dark:text-gray-300">
          {coupon.min_spend ? (
            <li>
              Minimum belanja <strong>{formatRupiah(coupon.min_spend)}</strong> sebelum diskon.
            </li>
          ) : (
            <li>Tidak ada minimum belanja.</li>
          )}
          {coupon.max_discount ? (
            <li>
              Maksimal diskon yang bisa didapat <strong>{formatRupiah(coupon.max_discount)}</strong>.
            </li>
          ) : null}
          {coupon.expires_at ? (
            <li>
              Promo berlaku sampai <strong>{formatExpiry(coupon.expires_at, t)}</strong> atau kuota
              habis.
            </li>
          ) : (
            <li>Tanggal berakhir promo tidak disebutkan — cek di situs merchant.</li>
          )}
          {coupon.region ? (
            <li>
              Berlaku untuk wilayah <strong>{coupon.region}</strong>.
            </li>
          ) : (
            <li>Berlaku untuk seluruh Indonesia (kecuali disebutkan lain di situs merchant).</li>
          )}
          <li>
            Tidak dapat digabung dengan promo lain dari {coupon.merchant.name} kecuali ada keterangan
            khusus.
          </li>
          <li>
            Syarat &amp; ketentuan dari {coupon.merchant.name} berlaku — cek halaman promo resmi
            untuk detail terbaru.
          </li>
        </ul>
      </details>

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

      <VerifyButtons couponId={coupon.id} />

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

      {coupon.category && (
        <section>
          <header className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Kupon serupa di kategori {coupon.category.name}
            </h2>
            <Link
              href={`/category/${coupon.category.slug}`}
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Lihat semua →
            </Link>
          </header>
          {relatedCategoryLoading ? (
            <CouponSkeletonGrid count={3} />
          ) : relatedCategory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Belum ada kupon lain di kategori ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedCategory.map((c) => (
                <CouponCard key={c.id} coupon={c} />
              ))}
            </div>
          )}
        </section>
      )}
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
