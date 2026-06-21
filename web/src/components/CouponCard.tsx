"use client";

import Link from "next/link";
import { useState } from "react";

import type { Coupon } from "@/lib/types";
import { formatDiscount, trackRedeem } from "@/lib/api";
import { couponSlug } from "@/lib/coupon-slug";
import { useI18n } from "@/i18n/provider";
import { Highlight } from "@/lib/highlight";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ShareButton } from "@/components/ShareButton";
import { useHistory } from "@/lib/use-history";
import { useStreak } from "@/lib/use-streak";
import { useExpiryCountdown } from "@/lib/use-expiry-countdown";
import { useCouponVotes } from "@/lib/use-coupon-votes";
import { CouponActionGroup } from "@/components/CouponActionGroup";
import { fireConfetti } from "@/lib/confetti";
import { trackCouponClick, trackCopyCode } from "@/lib/analytics";

interface Props {
  coupon: Coupon;
  highlight?: string;
  /** If true, this coupon belongs to a merchant with >= 2 active coupons (stackable). */
  isStackable?: boolean;
}

function isNewCoupon(scrapedAt: string): boolean {
  const dt = new Date(scrapedAt).getTime();
  if (!Number.isFinite(dt)) return false;
  return Date.now() - dt < 24 * 60 * 60 * 1000; // < 24 jam
}

function isPopularCoupon(c: Coupon): boolean {
  return (c.view_count ?? 0) >= 3 || (c.redeem_count ?? 0) >= 1 || c.quality_score >= 90;
}

function isFlashHot(c: Coupon): boolean {
  // Ultra-popular: high redeem OR exceptional quality
  return (c.redeem_count ?? 0) >= 10 || c.quality_score >= 95;
}

export function CouponCard({ coupon, highlight = "", isStackable = false }: Props) {
  const { t } = useI18n();
  const expiry = useExpiryCountdown(coupon.expires_at);
  const { getVote } = useCouponVotes();
  const userVote = getVote(coupon.id);
  const isNew = isNewCoupon(coupon.scraped_at);
  const isPopular = isPopularCoupon(coupon);
  const isFlash = isFlashHot(coupon);
  const isReportedExpired = userVote === "expired";

  const expiryClass =
    expiry.urgency === "critical"
      ? "font-bold text-rose-600 dark:text-rose-400 animate-pulse"
      : expiry.urgency === "warning"
        ? "font-semibold text-amber-600 dark:text-amber-400"
        : expiry.urgency === "expired"
          ? "text-rose-500 dark:text-rose-400 line-through"
          : "text-gray-500 dark:text-gray-400";

  return (
    <article
      className={[
        "group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300 ease-out animate-slide-up dark:bg-gray-800",
        "hover:shadow-2xl hover:shadow-brand-500/20 hover:-translate-y-1 hover:scale-[1.02] hover:z-10",
        isReportedExpired
          ? "border-rose-300 opacity-60 saturate-50 dark:border-rose-700"
          : isFlash
            ? "border-amber-300 dark:border-amber-500"
            : "border-gray-200 dark:border-gray-700",
      ].join(" ")}
    >
      {(isNew || isPopular || isFlash || isReportedExpired || isStackable) && (
        <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
          {isReportedExpired && (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
              👎 Dilaporkan expired
            </span>
          )}
          {isFlash && !isReportedExpired && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md animate-pulse">
              <span className="animate-bounce">🔥</span> FLASH HOT
            </span>
          )}
          {isNew && !isReportedExpired && !isFlash && (
            <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
              ✨ BARU
            </span>
          )}
          {isPopular && !isReportedExpired && !isFlash && (
            <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
              🔥 POPULER
            </span>
          )}
          {isStackable && !isReportedExpired && (
            <span
              className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              title="Bisa di-stack dengan kupon lain dari merchant yang sama"
            >
              ✅ STACKABLE
            </span>
          )}
        </div>
      )}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        <ShareButton coupon={coupon} />
        <FavoriteButton couponId={coupon.id} />
      </div>
      <div className={[
        "flex items-start justify-between gap-3 border-b border-dashed border-gray-200 p-4 pr-24 dark:border-gray-700",
        (isNew || isPopular) ? "pt-10" : "",
      ].join(" ")}>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
            <Highlight text={coupon.merchant.name} query={highlight} />
          </div>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Link
              href={`/coupon/${couponSlug(coupon)}`}
              onClick={() => trackCouponClick(coupon.id, coupon.merchant.slug)}
              className="hover:text-brand-600 hover:underline dark:hover:text-brand-400"
            >
              <Highlight text={coupon.title} query={highlight} />
            </Link>
          </h3>
        </div>
        <div className="flex-none rounded-md bg-brand-50 px-2 py-1 text-right dark:bg-brand-800/30">
          <div className="text-[10px] uppercase tracking-wide text-brand-600 dark:text-brand-400">
            {t("coupon.quality") || "Diskon"}
          </div>
          <div className="text-sm font-bold text-brand-700 dark:text-brand-300">
            {formatDiscount(coupon, t)}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 text-sm">
        {coupon.description && (
          <p className="line-clamp-2 text-gray-600 dark:text-gray-300">
            <Highlight text={coupon.description} query={highlight} />
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-gray-500 dark:text-gray-400">
          <span className={expiryClass}>
            <span aria-hidden>{expiry.urgency === "critical" ? "🔥" : "⏰"}</span>{" "}
            {expiry.isLive && (
              <span className="font-mono tabular-nums">{expiry.text}</span>
            )}
            {!expiry.isLive && expiry.text}
          </span>
          <div className="flex items-center gap-2">
            {coupon.quality_score >= 80 && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                ★ {coupon.quality_score}
              </span>
            )}
            {coupon.category && (
              <Link
                href={`/category/${coupon.category.slug}`}
                className="rounded bg-gray-100 px-2 py-0.5 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                {coupon.category.name}
              </Link>
            )}
          </div>
        </div>

        {coupon.code && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-dashed border-brand-400 bg-brand-50/50 px-3 py-2 dark:border-brand-500 dark:bg-brand-900/20">
            <span className="flex-1 font-mono text-sm font-bold tracking-wider text-brand-700 dark:text-brand-300">
              <Highlight text={coupon.code} query={highlight} />
            </span>
            <CouponActionGroup coupon={coupon} />
          </div>
        )}
      </div>
    </article>
  );
}

function CopyButton({ coupon }: { coupon: Coupon }) {
  const { t } = useI18n();
  const { addClaim } = useHistory();
  const { recordClaim } = useStreak();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-md bg-brand-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-brand-700 active:scale-95"
      onClick={async (e) => {
        e.preventDefault();
        if (!coupon.code) return;
        // Capture rect BEFORE await
        const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect();
        try {
          await navigator.clipboard.writeText(coupon.code);
          setCopied(true);
          void trackRedeem(coupon.id);
          trackCopyCode(coupon.id, coupon.code, coupon.merchant.slug);
          addClaim(coupon);
          recordClaim();
          if (rect) {
            try {
              fireConfetti({
                origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
                particleCount: 90,
              });
            } catch {
              /* ignore confetti */
            }
          }
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? t("coupon.copied") : t("coupon.copy")}
    </button>
  );
}
