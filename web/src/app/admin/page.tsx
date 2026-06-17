"use client";

import { useEffect, useState } from "react";
import { KPICard } from "@/components/admin/KPICard";
import { ScraperHealthTable } from "@/components/admin/ScraperHealthTable";
import {
  fetchPublicStats,
  triggerScrapeAll,
  type PublicStats,
} from "@/lib/admin-api";

/**
 * Admin Dashboard — central hub buat atasan/admin.
 *
 * Sections:
 * 1. KPI cards (6 main metrics)
 * 2. Top merchants leaderboard
 * 3. Scraper health table
 * 4. Quick actions (trigger scrape all)
 */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrapingAll, setScrapingAll] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const s = await fetchPublicStats();
      setStats(s);
    } catch (e) {
      console.error("Failed to load stats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleScrapeAll = async () => {
    setScrapingAll(true);
    setScrapeResult(null);
    try {
      const result = await triggerScrapeAll();
      const totalNew = result.results.reduce((sum, r) => sum + (r.items_new || 0), 0);
      const totalUpd = result.results.reduce(
        (sum, r) => sum + (r.items_updated || 0),
        0,
      );
      setScrapeResult(
        `✅ Scraped ${result.results.length} scrapers · ${totalNew} kupon baru · ${totalUpd} updated`,
      );
      // Refresh stats after scrape
      setTimeout(loadStats, 2000);
    } catch (e) {
      setScrapeResult(`❌ ${e instanceof Error ? e.message : "Scrape failed"}`);
    } finally {
      setScrapingAll(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
        <p className="mt-1 text-sm text-gray-400">
          Real-time stats + scraper health. Last updated:{" "}
          {stats?.last_updated
            ? new Date(stats.last_updated).toLocaleString("id-ID")
            : "loading..."}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="text-sm font-medium text-gray-300">⚡ Quick Actions:</div>
        <button
          onClick={handleScrapeAll}
          disabled={scrapingAll}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {scrapingAll ? "⏳ Scraping all..." : "▶ Trigger Scrape All"}
        </button>
        <button
          onClick={loadStats}
          disabled={loading}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:border-brand-400 hover:text-brand-300"
        >
          🔄 Refresh Stats
        </button>
        {scrapeResult && (
          <div className="ml-auto text-xs text-emerald-300">{scrapeResult}</div>
        )}
      </div>

      {/* KPI Grid */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          📊 Key Metrics
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KPICard
            label="Total Active"
            value={stats?.total_active ?? "—"}
            icon="🎟️"
            color="purple"
            hint="Kupon aktif"
          />
          <KPICard
            label="New 24h"
            value={stats?.new_24h ?? "—"}
            icon="✨"
            color="green"
            hint="Fresh today"
          />
          <KPICard
            label="Merchants"
            value={stats?.merchant_count ?? "—"}
            icon="🏪"
            color="blue"
            hint="Active partners"
          />
          <KPICard
            label="Categories"
            value={stats?.category_count ?? "—"}
            icon="📂"
            color="amber"
            hint="Coverage"
          />
          <KPICard
            label="Total Views"
            value={stats?.total_views ?? "—"}
            icon="👁️"
            color="pink"
            hint="Engagement"
          />
          <KPICard
            label="Total Redeems"
            value={stats?.total_redeems ?? "—"}
            icon="✅"
            color="red"
            hint="Conversion"
          />
        </div>
      </section>

      {/* Top Merchants */}
      {stats?.top_merchants && stats.top_merchants.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            🏆 Top Merchants (by kupon count)
          </h3>
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
            <ol className="divide-y divide-white/5">
              {stats.top_merchants.slice(0, 10).map((m, idx) => (
                <li
                  key={m.slug}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/5"
                >
                  <span className="w-6 text-center text-sm font-bold text-gray-500">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-200">
                      {m.name}
                    </div>
                    <div className="font-mono text-xs text-gray-500">
                      {m.slug}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-brand-300">
                      {m.count}
                    </div>
                    <div className="text-xs text-gray-500">kupon</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Scraper Health Table */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          🤖 Scraper Health
        </h3>
        <ScraperHealthTable />
      </section>

      {/* Tips Section */}
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur">
        <h3 className="text-sm font-semibold text-amber-200">
          💡 Tips Penggunaan Dashboard
        </h3>
        <ul className="mt-2 space-y-1.5 text-xs text-amber-100/80">
          <li>
            • <strong>Trigger Scrape All</strong>: manual refresh semua scraper
            sekaligus (Google News, Telegram, dll)
          </li>
          <li>
            • <strong>▶ Run</strong> per scraper: trigger individual scraper
            kalau cuma mau refresh 1 source
          </li>
          <li>
            • <strong>Total Active</strong>: jumlah kupon yang lagi tampil di
            website. Naik = scraper kerja, turun = banyak yang expired
          </li>
          <li>
            • <strong>New 24h</strong>: kupon baru masuk dalam 24 jam terakhir
            — indikator scraper health
          </li>
          <li>
            • Klik logout (kanan atas) kalau udah selesai
          </li>
        </ul>
      </section>
    </div>
  );
}
