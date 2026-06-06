"use client";

import { useNotifications } from "@/lib/use-notifications";

export function ExpiringBanner() {
  const { settings, expiringCount, data } = useNotifications();

  if (!settings.enableExpiring || expiringCount === 0) return null;

  const soonest = data.expiring[0];
  const merchant = soonest?.merchant.name ?? "kupon";

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100 animate-slide-up">
      <span className="text-lg" aria-hidden>⚠️</span>
      <div className="flex-1">
        <strong className="text-amber-100">{expiringCount} kupon hampir berakhir</strong>{" "}
        <span className="text-amber-200/80">
          dalam {settings.expiringWithinDays} hari ke depan
          {settings.merchantFilter ? ` (${settings.merchantFilter})` : ""}.
        </span>
        {soonest && (
          <span className="ml-1 text-amber-200/80">
            Tercepat: <em className="not-italic font-medium text-amber-100">{merchant}</em>
          </span>
        )}
      </div>
    </div>
  );
}
