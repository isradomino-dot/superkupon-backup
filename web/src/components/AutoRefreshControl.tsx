"use client";

import {
  INTERVAL_OPTIONS,
  type AutoRefreshIntervalSec,
  type AutoRefreshState,
} from "@/lib/use-auto-refresh";

function formatRelative(ts: number | null): string {
  if (ts === null) return "—";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return "barusan";
  if (seconds < 60) return `${seconds}d lalu`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  return `${h}j lalu`;
}

function formatCountdown(sec: number | null): string {
  if (sec === null) return "—";
  if (sec <= 0) return "0d";
  if (sec < 60) return `${sec}d`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${String(s).padStart(2, "0")}d`;
}

interface Props {
  state: AutoRefreshState;
}

export function AutoRefreshControl({ state }: Props) {
  const {
    intervalSec,
    setIntervalSec,
    isActive,
    isVisible,
    isRunning,
    lastRefreshAt,
    nextRefreshIn,
    refreshNow,
  } = state;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Status indicator */}
      <div className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
        {isActive && isVisible ? (
          <span className="relative flex h-2 w-2">
            <span
              className={[
                "absolute inline-flex h-full w-full rounded-full opacity-75",
                isRunning ? "bg-amber-400 animate-ping" : "bg-emerald-500 animate-ping",
              ].join(" ")}
            />
            <span
              className={[
                "relative inline-flex h-2 w-2 rounded-full",
                isRunning ? "bg-amber-500" : "bg-emerald-500",
              ].join(" ")}
            />
          </span>
        ) : isActive && !isVisible ? (
          <span className="h-2 w-2 rounded-full bg-gray-400" title="Paused — tab tidak aktif" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
        )}
        <span>
          Auto-refresh:{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {isActive ? (isVisible ? (isRunning ? "Updating…" : `${formatCountdown(nextRefreshIn)}`) : "Paused") : "Off"}
          </span>
        </span>
      </div>

      {/* Interval dropdown */}
      <label className="sr-only" htmlFor="auto-refresh-interval">
        Auto-refresh interval
      </label>
      <select
        id="auto-refresh-interval"
        value={intervalSec}
        onChange={(e) => setIntervalSec(Number(e.target.value) as AutoRefreshIntervalSec)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      >
        {INTERVAL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Manual refresh */}
      <button
        type="button"
        onClick={() => refreshNow()}
        disabled={isRunning}
        title="Refresh sekarang"
        aria-label="Refresh sekarang"
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-brand-500 dark:hover:bg-gray-700"
      >
        <span aria-hidden className={isRunning ? "animate-spin" : ""}>
          ↻
        </span>
        {isRunning ? "..." : "Refresh"}
      </button>

      {/* Last refresh timestamp */}
      <span className="text-gray-500 dark:text-gray-400" title={lastRefreshAt ? new Date(lastRefreshAt).toLocaleString("id-ID") : ""}>
        {lastRefreshAt !== null ? `· ${formatRelative(lastRefreshAt)}` : ""}
      </span>
    </div>
  );
}
