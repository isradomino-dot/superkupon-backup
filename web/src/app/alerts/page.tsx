"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useSavedSearches, type SavedSearch } from "@/lib/use-saved-searches";

function formatRelative(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "barusan";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export default function SavedAlertsPage() {
  const { searches, count, remove, clearAll, hydrated } = useSavedSearches();
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/15 to-orange-500/10 p-6">
        <nav className="mb-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-brand-300 hover:underline">
            Beranda
          </Link>{" "}
          / <span className="text-gray-200">Saved Alerts</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
              <span className="text-amber-400" aria-hidden>🔔</span>
              Saved Search Alerts
            </h1>
            <p className="mt-1 text-sm text-gray-300">
              {count === 0
                ? "Belum ada saved search."
                : `${count} alert aktif · check setiap 5 menit di background`}
            </p>
          </div>
          {count > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Hapus semua saved alerts?")) clearAll();
              }}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
            >
              Hapus semua
            </button>
          )}
        </div>
      </header>

      {/* Permission status */}
      {permission !== "granted" && (
        <div
          className={[
            "rounded-xl border p-4",
            permission === "denied"
              ? "border-rose-400/40 bg-rose-500/10"
              : "border-amber-400/40 bg-amber-500/10",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg">
              {permission === "denied" ? "🚫" : "⚠️"}
            </span>
            <div className="flex-1 text-xs">
              <div
                className={[
                  "font-bold",
                  permission === "denied" ? "text-rose-300" : "text-amber-300",
                ].join(" ")}
              >
                Browser notification:{" "}
                {permission === "denied" ? "BLOCKED" : "Belum di-grant"}
              </div>
              <div className="mt-0.5 text-gray-300">
                {permission === "denied"
                  ? "Lo block notification di browser settings. Saved alerts gak bisa fire notif sampai lo enable."
                  : "Alert butuh permission untuk fire browser notification."}
              </div>
            </div>
            {permission === "default" && (
              <button
                type="button"
                onClick={requestPermission}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
              >
                Enable Notification
              </button>
            )}
          </div>
        </div>
      )}

      {/* List */}
      {!hydrated ? (
        <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-10 text-center text-xs text-gray-500">
          Loading...
        </div>
      ) : count === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {searches.map((s) => (
            <AlertRow key={s.id} alert={s} onRemove={() => remove(s.id)} />
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4 text-xs text-gray-400">
        <h3 className="mb-1 font-bold text-gray-300">ℹ️ Cara kerja</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>Background watcher check tiap saved query setiap 5 menit</li>
          <li>Kalau ada kupon baru match yang belum di-notif → browser notification</li>
          <li>Click notif → buka halaman search result untuk query itu</li>
          <li>Disimpan local di browser ini (per device, gak sync ke cloud)</li>
          <li>Max 10 saved searches</li>
        </ul>
      </div>
    </div>
  );
}

function AlertRow({
  alert,
  onRemove,
}: {
  alert: SavedSearch;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900/40 p-3">
      <span className="text-2xl flex-none" aria-hidden>🔔</span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/?q=${encodeURIComponent(alert.query)}`}
          className="block truncate text-sm font-bold text-white hover:text-brand-300 hover:underline"
        >
          &ldquo;{alert.query}&rdquo;
        </Link>
        <div className="mt-0.5 text-[10px] text-gray-500">
          Saved {formatRelative(alert.createdAt)} · Last check{" "}
          {formatRelative(alert.lastChecked)} · {alert.notifiedCouponIds.length}{" "}
          coupon ke-notif
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Hapus alert "${alert.query}"`}
        className="flex-none rounded-md border border-gray-600 px-3 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/15"
      >
        🗑 Hapus
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-600 p-12 text-center">
      <div className="text-5xl">🔕</div>
      <p className="text-base font-semibold text-gray-200">Belum ada saved alert</p>
      <p className="max-w-md text-sm text-gray-400">
        Cara save: di homepage search bar, ketik query (min 2 karakter) →
        tombol 🔕 di samping &ldquo;Cari&rdquo; → klik jadi 🔔 = saved.
      </p>
      <Link
        href="/"
        className="mt-3 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        ← Coba di Beranda
      </Link>
    </div>
  );
}
