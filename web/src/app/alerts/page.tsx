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

const SUGGESTED_QUERIES = [
  { q: "shopee", emoji: "🛍️", label: "Shopee" },
  { q: "tokopedia", emoji: "🛒", label: "Tokopedia" },
  { q: "makan", emoji: "🍔", label: "Makanan" },
  { q: "cashback", emoji: "💰", label: "Cashback" },
  { q: "gratis ongkir", emoji: "🚚", label: "Gratis Ongkir" },
  { q: "ovo", emoji: "💳", label: "OVO" },
  { q: "diskon 50", emoji: "📉", label: "Diskon 50%" },
  { q: "traveloka", emoji: "✈️", label: "Traveloka" },
];

export default function SavedAlertsPage() {
  const { searches, count, add, remove, clearAll, isSaved, hydrated } =
    useSavedSearches();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [input, setInput] = useState("");
  const [toast, setToast] = useState<{ kind: "added" | "exists" | "tooShort"; query: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const handleAdd = (queryArg?: string) => {
    const q = (queryArg ?? input).trim();
    if (q.length < 2) {
      setToast({ kind: "tooShort", query: q });
      setTimeout(() => setToast(null), 2500);
      return;
    }
    if (isSaved(q)) {
      setToast({ kind: "exists", query: q });
      setTimeout(() => setToast(null), 2500);
      return;
    }
    const created = add(q);
    if (created) {
      setToast({ kind: "added", query: q });
      setInput("");
      setTimeout(() => setToast(null), 2500);
      // Request permission kalau belum
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "default"
      ) {
        void Notification.requestPermission().then((p) => setPermission(p));
      }
    }
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
              <span className="text-amber-400" aria-hidden>
                🔔
              </span>
              Saved Search Alerts
            </h1>
            <p className="mt-1 text-sm text-gray-300">
              {count === 0
                ? "Dapat notifikasi kalau ada kupon baru match. Save query di bawah ↓"
                : `${count} alert aktif · cek otomatis tiap 5 menit`}
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

      {/* ⭐ NEW: Add alert form — langsung di page, gak perlu ke homepage */}
      <section className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/15 via-purple-500/5 to-transparent p-5 shadow-lg">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-white">
          <span className="text-2xl">➕</span>
          Tambah Alert Baru
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Misal: shopee cashback, makanan, gratis ongkir..."
            maxLength={50}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-brand-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
          />
          <button
            type="submit"
            disabled={input.trim().length < 2 || count >= 10}
            className="rounded-lg bg-gradient-to-r from-brand-500 to-purple-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:shadow-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            🔔 Set Alert
          </button>
        </form>

        {count >= 10 && (
          <p className="mt-2 text-xs text-amber-300">
            ⚠️ Sudah max 10 alert. Hapus salah satu dulu untuk tambah baru.
          </p>
        )}

        {/* Suggested chips */}
        <div className="mt-4 border-t border-white/5 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            💡 Atau pilih dari saran populer:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUERIES.map((s) => {
              const already = isSaved(s.q);
              return (
                <button
                  key={s.q}
                  type="button"
                  onClick={() => handleAdd(s.q)}
                  disabled={already || count >= 10}
                  className={[
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    already
                      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300 cursor-not-allowed"
                      : "border-white/10 bg-white/5 text-gray-200 hover:border-brand-400 hover:bg-brand-500/15 hover:text-white",
                  ].join(" ")}
                >
                  <span aria-hidden>{s.emoji}</span>
                  <span>{s.label}</span>
                  {already && <span className="text-[10px]">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toast inline */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={[
              "mt-3 rounded-lg px-3 py-2 text-xs font-semibold",
              toast.kind === "added"
                ? "bg-emerald-500/20 text-emerald-200"
                : toast.kind === "exists"
                  ? "bg-amber-500/20 text-amber-200"
                  : "bg-rose-500/20 text-rose-200",
            ].join(" ")}
          >
            {toast.kind === "added" &&
              `✓ Alert untuk "${toast.query}" aktif! Notifikasi browser akan muncul kalau ada kupon baru match.`}
            {toast.kind === "exists" && `⚠️ Alert "${toast.query}" udah tersimpan.`}
            {toast.kind === "tooShort" && "❌ Query minimal 2 karakter."}
          </div>
        )}
      </section>

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
            <span className="text-lg">{permission === "denied" ? "🚫" : "⚠️"}</span>
            <div className="flex-1 text-xs">
              <div
                className={[
                  "font-bold",
                  permission === "denied" ? "text-rose-300" : "text-amber-300",
                ].join(" ")}
              >
                Browser notification: {permission === "denied" ? "BLOCKED" : "Belum di-grant"}
              </div>
              <div className="mt-0.5 text-gray-300">
                {permission === "denied"
                  ? "Notif di-block di browser settings. Saved alerts gak bisa fire notifikasi sampai di-enable lagi."
                  : "Notifikasi browser butuh permission. Klik tombol kanan untuk enable."}
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
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-600 p-10 text-center">
          <div className="text-5xl">🔕</div>
          <p className="text-base font-semibold text-gray-200">Belum ada alert</p>
          <p className="max-w-md text-sm text-gray-400">
            Pakai form di atas untuk tambah alert pertama. Atau klik salah satu dari saran chip.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Alert Aktifmu ({count})
          </p>
          {searches.map((s) => (
            <AlertRow key={s.id} alert={s} onRemove={() => remove(s.id)} />
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4 text-xs text-gray-400">
        <h3 className="mb-1 font-bold text-gray-300">ℹ️ Cara kerja</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>Background watcher cek tiap saved query setiap 5 menit</li>
          <li>Kalau ada kupon baru match yang belum di-notif → browser notification</li>
          <li>Klik notif → buka halaman search result untuk query itu</li>
          <li>Disimpan local di browser ini (per device, gak sync ke cloud)</li>
          <li>Maksimum 10 saved searches</li>
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
    <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900/40 p-3 transition hover:border-brand-400/40">
      <span className="flex-none text-2xl" aria-hidden>
        🔔
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/?q=${encodeURIComponent(alert.query)}`}
          className="block truncate text-sm font-bold text-white hover:text-brand-300 hover:underline"
        >
          &ldquo;{alert.query}&rdquo;
        </Link>
        <div className="mt-0.5 text-[10px] text-gray-500">
          Saved {formatRelative(alert.createdAt)} · Last check{" "}
          {formatRelative(alert.lastChecked)} · {alert.notifiedCouponIds.length} kupon
          ke-notif
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
