"use client";

import { useState } from "react";

import type { Coupon } from "@/lib/types";
import { trackRedeem } from "@/lib/api";
import { wrapAffiliateLink } from "@/lib/affiliate";
import { trackCopyCode, trackOutboundClick } from "@/lib/analytics";
import { useI18n } from "@/i18n/provider";
import { useHistory } from "@/lib/use-history";
import { useStreak } from "@/lib/use-streak";
import { fireConfetti } from "@/lib/confetti";
import { useAuth } from "@/components/auth/AuthProvider";

interface Props {
  coupon: Coupon;
}

const REMINDER_KEY = "sk_reminders_v1";

interface ReminderEntry {
  couponId: number;
  remindAt: number;
  title: string;
  merchant: string;
}

function saveReminder(coupon: Coupon, hoursFromNow: number) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    const list: ReminderEntry[] = raw ? JSON.parse(raw) : [];
    const remindAt = Date.now() + hoursFromNow * 60 * 60 * 1000;
    list.push({
      couponId: coupon.id,
      remindAt,
      title: coupon.title,
      merchant: coupon.merchant.name,
    });
    localStorage.setItem(REMINDER_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/**
 * Multi-action button group: Copy code, Open merchant site, Set reminder.
 * Compact horizontal layout for use within CouponCard.
 */
export function CouponActionGroup({ coupon }: Props) {
  const { t } = useI18n();
  const { addClaim } = useHistory();
  const { recordClaim } = useStreak();
  const { requireLogin } = useAuth();
  const [copied, setCopied] = useState(false);
  const [reminded, setReminded] = useState(false);
  const [showReminderMenu, setShowReminderMenu] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!coupon.code) return;
    // Gate: butuh login dulu untuk akses kode kupon
    if (!requireLogin()) return;
    // Capture rect BEFORE await (synthetic event nulled after async)
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
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const handleSetReminder = (hours: number) => {
    saveReminder(coupon, hours);
    setReminded(true);
    setShowReminderMenu(false);
    setTimeout(() => setReminded(false), 2400);
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        void Notification.requestPermission();
      }
    }
  };

  return (
    <div className="relative inline-flex overflow-hidden rounded-md shadow-sm" onClick={(e) => e.stopPropagation()}>
      {/* Copy button */}
      {coupon.code && (
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 bg-brand-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-brand-700"
          title="Salin kode promo"
        >
          {copied ? "✓ " + (t("coupon.copied") || "Tersalin") : "⚡ " + (t("coupon.copy") || "Salin")}
        </button>
      )}

      {/* Open merchant site — gated for affiliate revenue protection */}
      {coupon.merchant.website && (
        <a
          href={wrapAffiliateLink(coupon.merchant.slug, coupon.merchant.website, coupon.id)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            // Gate: butuh login dulu sebelum redirect ke merchant
            if (!requireLogin()) {
              e.preventDefault();
              return;
            }
            trackOutboundClick(coupon.merchant.slug, coupon.id);
          }}
          className="inline-flex items-center gap-0.5 border-l border-white/20 bg-emerald-500 px-2 py-1 text-xs font-bold text-white transition hover:bg-emerald-600"
          title={`Buka ${coupon.merchant.name}`}
        >
          🌐
        </a>
      )}

      {/* Reminder dropdown trigger */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setShowReminderMenu((v) => !v);
        }}
        className="inline-flex items-center gap-0.5 border-l border-white/20 bg-amber-500 px-2 py-1 text-xs font-bold text-white transition hover:bg-amber-600"
        title="Set reminder"
        aria-haspopup="menu"
        aria-expanded={showReminderMenu}
      >
        {reminded ? "✓" : "⏰"}
      </button>

      {showReminderMenu && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="border-b border-gray-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Ingatkan dalam:
          </div>
          {[
            { h: 1, label: "1 jam lagi" },
            { h: 6, label: "6 jam lagi" },
            { h: 24, label: "Besok" },
            { h: 24 * 3, label: "3 hari lagi" },
          ].map((opt) => (
            <button
              key={opt.h}
              type="button"
              onClick={() => handleSetReminder(opt.h)}
              className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 transition hover:bg-amber-50 dark:text-gray-200 dark:hover:bg-amber-900/30"
            >
              ⏰ {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
