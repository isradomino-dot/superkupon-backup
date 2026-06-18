"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useNotifications } from "@/lib/use-notifications";
import { useFavorites } from "@/lib/use-favorites";
import { useHistory } from "@/lib/use-history";
import { useStreak } from "@/lib/use-streak";
import { formatDiscount, formatExpiry } from "@/lib/api";
import { fireConfetti } from "@/lib/confetti";
import { couponHref } from "@/lib/coupon-slug";
import type { Coupon } from "@/lib/types";

export function NotificationCenter() {
  const {
    settings,
    setSettings,
    data,
    newCount,
    expiringCount,
    totalCount,
    enableShopeeAlert,
    requestBrowserPermission,
    resetSeen,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new" | "expiring" | "settings">("new");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const items = tab === "new" ? data.new : tab === "expiring" ? data.expiring : [];
  const shopeeActive = settings.merchantFilter === "shopee";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-gray-300 transition hover:bg-white/10 hover:text-white"
      >
        <BellIcon />
        {totalCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold text-white shadow">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[100] mt-2 w-[360px] overflow-hidden rounded-xl border-2 border-brand-400/30 bg-[#16131f] shadow-2xl shadow-black/70 ring-1 ring-black/40">
          <div className="flex border-b border-white/10">
            <TabButton active={tab === "new"} onClick={() => setTab("new")} count={newCount}>
              Baru
            </TabButton>
            <TabButton active={tab === "expiring"} onClick={() => setTab("expiring")} count={expiringCount}>
              Hampir Berakhir
            </TabButton>
            <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>
              ⚙
            </TabButton>
          </div>

          {tab !== "settings" ? (
            <div className="max-h-[440px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  {tab === "new" ? "Belum ada kupon baru" : "Tidak ada kupon expiring"}
                </div>
              ) : (
                items.map((c) => (
                  <NotifItem
                    key={c.id}
                    coupon={c}
                    onClose={() => setOpen(false)}
                  />
                ))
              )}
            </div>
          ) : (
            <SettingsPanel
              settings={settings}
              setSettings={setSettings}
              onShopee={enableShopeeAlert}
              onPushPerm={requestBrowserPermission}
              onResetSeen={resetSeen}
              shopeeActive={shopeeActive}
            />
          )}

          <div className="border-t border-white/10 bg-[#0f0e1a] p-2 text-center">
            <Link
              href="/?expiring=true"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-brand-300 hover:underline"
            >
              Lihat semua kupon →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifItem({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const { isFavorite, toggle: toggleFav } = useFavorites();
  const { addClaim } = useHistory();
  const { recordClaim } = useStreak();
  const [skipped, setSkipped] = useState(false);

  if (skipped) return null;
  const fav = isFavorite(coupon.id);

  const handleShare = async () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}${couponHref(coupon)}`;
    const text = `${coupon.merchant.name}: ${coupon.title}${coupon.code ? ` · Kode: ${coupon.code}` : ""}\n${url}\n\nvia SuperKupon`;
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: coupon.title,
          text,
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="border-b border-white/5 p-3 transition hover:bg-white/5">
      <Link
        href={couponHref(coupon)}
        onClick={onClose}
        className="block"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-brand-400">
          {coupon.merchant.name}
        </div>
        <div className="mt-0.5 line-clamp-2 text-sm font-medium text-gray-100">
          {coupon.title}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
          <span className="rounded bg-brand-500/15 px-1.5 py-0.5 font-semibold text-brand-300">
            {formatDiscount(coupon)}
          </span>
          <span>⏰ {formatExpiry(coupon.expires_at)}</span>
        </div>
      </Link>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <ActionChip
          icon={fav ? "♥" : "♡"}
          label={fav ? "Saved" : "Save"}
          active={fav}
          onClick={() => toggleFav(coupon.id)}
        />
        <ActionChip icon="📤" label="Share" onClick={handleShare} />
        <ActionChip
          icon="✓"
          label="Sudah pakai"
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            fireConfetti({
              origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
              particleCount: 50,
              spread: 90,
              startVelocity: 12,
              colors: ["#10b981", "#34d399", "#facc15", "#a78bfa"],
            });
            addClaim(coupon);
            recordClaim();
            setTimeout(() => setSkipped(true), 350);
          }}
        />
        <ActionChip icon="✕" label="Skip" onClick={() => setSkipped(true)} />
      </div>
    </div>
  );
}

function ActionChip({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition",
        active
          ? "bg-rose-500/20 text-rose-300"
          : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function TabButton({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 px-3 py-2.5 text-xs font-semibold transition",
        active ? "bg-white/5 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
      ].join(" ")}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}

function SettingsPanel({
  settings,
  setSettings,
  onShopee,
  onPushPerm,
  onResetSeen,
  shopeeActive,
}: {
  settings: ReturnType<typeof useNotifications>["settings"];
  setSettings: ReturnType<typeof useNotifications>["setSettings"];
  onShopee: () => void;
  onPushPerm: () => Promise<NotificationPermission>;
  onResetSeen: () => void;
  shopeeActive: boolean;
}) {
  const [permStatus, setPermStatus] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermStatus(Notification.permission);
    }
  }, []);

  return (
    <div className="space-y-4 p-4">
      <Section title="Aktifkan notifikasi">
        <Toggle
          label="Kupon baru"
          on={settings.enableNew}
          onChange={(v) => setSettings({ enableNew: v })}
        />
        <Toggle
          label="Peringatan kupon expiring"
          on={settings.enableExpiring}
          onChange={(v) => setSettings({ enableExpiring: v })}
        />
      </Section>

      <Section title="Filter merchant">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSettings({ merchantFilter: undefined })}
            className={chipClass(!settings.merchantFilter)}
          >
            Semua merchant
          </button>
          <button
            type="button"
            onClick={onShopee}
            className={chipClass(shopeeActive)}
          >
            🛍️ Aktifkan alert Shopee
          </button>
        </div>
        {shopeeActive && (
          <p className="mt-2 text-xs text-brand-300">
            ✓ Hanya kupon Shopee yang akan trigger notifikasi
          </p>
        )}
      </Section>

      <Section title="Threshold expiring">
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <span>Warning kupon expiring dalam</span>
          <select
            value={settings.expiringWithinDays}
            onChange={(e) => setSettings({ expiringWithinDays: Number(e.target.value) })}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1"
          >
            <option value={1}>1 hari</option>
            <option value={3}>3 hari</option>
            <option value={7}>7 hari</option>
            <option value={14}>14 hari</option>
          </select>
        </div>
      </Section>

      <Section title="Browser push">
        {permStatus === "unsupported" ? (
          <p className="text-xs text-gray-400">Browser tidak support Notification API</p>
        ) : permStatus === "granted" ? (
          <Toggle
            label="Push notification desktop"
            on={settings.browserPush}
            onChange={(v) => setSettings({ browserPush: v })}
          />
        ) : (
          <button
            type="button"
            onClick={async () => {
              const p = await onPushPerm();
              setPermStatus(p);
            }}
            className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
          >
            Izinkan browser push
          </button>
        )}
      </Section>

      <button
        type="button"
        onClick={onResetSeen}
        className="text-xs text-gray-400 hover:text-gray-200 hover:underline"
      >
        Reset history notifikasi
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1.5 text-sm text-gray-200">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={[
          "relative h-5 w-9 rounded-full transition",
          on ? "bg-brand-500" : "bg-white/15",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
            on ? "left-[18px]" : "left-0.5",
          ].join(" ")}
        />
      </button>
    </label>
  );
}

function chipClass(active: boolean): string {
  return [
    "rounded-full px-3 py-1 text-xs font-medium transition",
    active
      ? "bg-brand-500 text-white shadow-glow"
      : "border border-white/15 bg-white/5 text-gray-300 hover:border-brand-400 hover:bg-brand-500/10",
  ].join(" ");
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
