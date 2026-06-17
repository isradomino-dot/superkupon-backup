"use client";

import { useEffect, useState } from "react";
import {
  fetchScrapeLogs,
  fetchScrapers,
  triggerScraper,
  type ScrapeLog,
  type ScraperInfo,
} from "@/lib/admin-api";

/**
 * Tabel scraper health — gabung registry info + last run log per target_id.
 * Plus tombol trigger manual scrape per scraper.
 */
export function ScraperHealthTable() {
  const [scrapers, setScrapers] = useState<ScraperInfo[]>([]);
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, l] = await Promise.all([fetchScrapers(), fetchScrapeLogs(200)]);
      setScrapers(s);
      setLogs(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTrigger = async (targetId: string) => {
    setTriggering(targetId);
    try {
      await triggerScraper(targetId);
      await loadData(); // refresh logs
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trigger failed");
    } finally {
      setTriggering(null);
    }
  };

  // Group last log per target_id
  const lastLogByTarget: Record<string, ScrapeLog> = {};
  logs.forEach((log) => {
    if (!lastLogByTarget[log.target_id]) {
      lastLogByTarget[log.target_id] = log;
    }
  });

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
        Loading scraper data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
        ❌ {error}
        <button
          onClick={loadData}
          className="ml-3 underline hover:text-red-200"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-200">
          🤖 Scraper Health ({scrapers.length} scrapers)
        </h3>
        <button
          onClick={loadData}
          className="rounded-md border border-white/10 px-2 py-1 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-300"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                Scraper
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                Merchant
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                Last Run
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-400">
                Items
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {scrapers.map((scraper) => {
              const last = lastLogByTarget[scraper.target_id];
              const isHealthy =
                last && last.status === "success" && last.items_found > 0;
              const isWarn = last && last.items_found === 0;
              const isError = last && last.status === "failed";

              return (
                <tr
                  key={scraper.target_id}
                  className="transition hover:bg-white/5"
                >
                  <td className="px-4 py-2.5">
                    <div className="font-mono text-xs text-brand-300">
                      {scraper.target_id}
                    </div>
                    <div className="text-xs text-gray-500">
                      Tier: {scraper.tier} · {scraper.interval_minutes}min
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-300">
                    {scraper.merchant_slug}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {last ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={
                              isError
                                ? "text-red-400"
                                : isWarn
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }
                          >
                            {isError ? "●" : isWarn ? "●" : "●"}
                          </span>
                          <span className="text-gray-300">
                            {formatRelativeTime(last.started_at)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {last.status}
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500">never</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs">
                    {last ? (
                      <>
                        <div className="text-gray-200">
                          {last.items_found} found
                        </div>
                        <div className="text-gray-500">
                          {last.items_new} new · {last.items_updated} upd
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleTrigger(scraper.target_id)}
                      disabled={triggering === scraper.target_id}
                      className="rounded border border-white/10 px-2 py-1 text-xs text-gray-300 transition hover:border-brand-400 hover:text-brand-300 disabled:opacity-40"
                    >
                      {triggering === scraper.target_id ? "..." : "▶ Run"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-white/10 bg-white/5 px-4 py-2 text-xs text-gray-500">
        💡 Tip: Klik <strong className="text-gray-300">▶ Run</strong> buat
        trigger manual scrape per scraper. Atau lihat full log di tab
        Scrape Logs nanti.
      </div>
    </div>
  );
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "baru aja";
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}j lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}h lalu`;
}
