"use client";

import { useEffect, useState } from "react";

import type { RealtimeEvent, RealtimeStatus } from "@/lib/use-projects";

interface Props {
  status: RealtimeStatus;
  recentEvents: RealtimeEvent[];
  onClearEvents: () => void;
}

function formatStatus(s: RealtimeStatus): { label: string; tone: string; dot: string } {
  switch (s) {
    case "connected":
      return { label: "Live", tone: "text-emerald-300", dot: "bg-emerald-500" };
    case "connecting":
      return { label: "Connecting…", tone: "text-amber-300", dot: "bg-amber-500" };
    case "disconnected":
      return { label: "Offline", tone: "text-gray-400", dot: "bg-gray-500" };
    case "error":
      return { label: "Error", tone: "text-rose-300", dot: "bg-rose-500" };
    case "off":
    default:
      return { label: "Off", tone: "text-gray-500", dot: "bg-gray-600" };
  }
}

function formatRelative(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return "barusan";
  if (seconds < 60) return `${seconds}d lalu`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m lalu`;
  return `${Math.floor(m / 60)}j lalu`;
}

function eventEmoji(type: RealtimeEvent["type"]): string {
  return type === "INSERT" ? "✨" : type === "UPDATE" ? "✏️" : "🗑";
}

export function RealtimeIndicator({ status, recentEvents, onClearEvents }: Props) {
  const [open, setOpen] = useState(false);
  const meta = formatStatus(status);
  const newCount = recentEvents.length;

  // Auto-pop toast for the most recent event
  const [toast, setToast] = useState<RealtimeEvent | null>(null);
  useEffect(() => {
    if (recentEvents.length === 0) return;
    const latest = recentEvents[0];
    setToast(latest);
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [recentEvents]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-700 bg-gray-900/40 px-3 py-2 text-xs transition hover:border-brand-400"
        title={`Realtime ${meta.label}${newCount > 0 ? ` · ${newCount} events` : ""}`}
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            {status === "connected" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={["relative inline-flex h-2.5 w-2.5 rounded-full", meta.dot].join(" ")} />
          </span>
          <span className={["font-semibold", meta.tone].join(" ")}>{meta.label}</span>
        </span>
        {newCount > 0 && (
          <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[9px] font-black text-white">
            {newCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-1 w-72 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
          >
            <div className="border-b border-gray-700 px-3 py-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Realtime Events
                </h3>
                {newCount > 0 && (
                  <button
                    type="button"
                    onClick={onClearEvents}
                    className="text-[10px] font-semibold text-rose-400 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">
                Live changes dari device lain — projects table
              </p>
            </div>

            {newCount === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-gray-500">
                Belum ada event. Edit project di tab/device lain — bakal muncul di sini.
              </div>
            ) : (
              <ul className="max-h-64 overflow-y-auto">
                {recentEvents.map((ev, i) => (
                  <li
                    key={`${ev.at}-${i}`}
                    className="flex items-start gap-2 border-b border-gray-800 px-3 py-2 last:border-0"
                  >
                    <span className="text-base" aria-hidden>
                      {eventEmoji(ev.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white">
                        {ev.type === "INSERT" && "Created"}
                        {ev.type === "UPDATE" && "Updated"}
                        {ev.type === "DELETE" && "Deleted"}
                      </div>
                      <div className="truncate text-[11px] text-gray-400">{ev.projectName}</div>
                    </div>
                    <span className="flex-none text-[10px] text-gray-500">
                      {formatRelative(ev.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Toast — latest event */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[110] max-w-xs animate-slide-up rounded-xl border border-brand-400/40 bg-gradient-to-br from-slate-900 to-slate-800 p-3 shadow-2xl"
        >
          <div className="flex items-start gap-2">
            <span className="text-lg" aria-hidden>{eventEmoji(toast.type)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Live sync
                </span>
              </div>
              <div className="mt-0.5 text-xs font-semibold text-white">
                {toast.type === "INSERT" && "Project dibuat: "}
                {toast.type === "UPDATE" && "Project diupdate: "}
                {toast.type === "DELETE" && "Project dihapus: "}
                <span className="text-brand-300">{toast.projectName}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Tutup"
              className="text-gray-500 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
