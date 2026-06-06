"use client";

import { useNotifications } from "@/lib/use-notifications";

interface Props {
  merchantSlug: string;
  merchantName: string;
}

export function NotifyMeButton({ merchantSlug, merchantName }: Props) {
  const { settings, setSettings, requestBrowserPermission } = useNotifications();
  const isActive = settings.merchantFilter === merchantSlug;

  const toggle = async () => {
    if (isActive) {
      // disable filter
      setSettings({ merchantFilter: undefined });
      return;
    }
    // enable filter for this merchant + ensure browser perm
    setSettings({
      merchantFilter: merchantSlug,
      enableNew: true,
      enableExpiring: true,
    });
    if (!settings.browserPush) {
      await requestBrowserPermission();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isActive}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        isActive
          ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
          : "border-white/15 bg-white/5 text-gray-300 hover:border-brand-400 hover:bg-brand-500/10 hover:text-brand-300",
      ].join(" ")}
      title={
        isActive
          ? `Notifikasi aktif untuk ${merchantName} — klik buat matiin`
          : `Aktifkan notifikasi kupon baru dari ${merchantName}`
      }
    >
      <span aria-hidden>{isActive ? "🔔" : "🔕"}</span>
      {isActive ? "Notifikasi aktif" : "Beritahu kupon baru"}
    </button>
  );
}
