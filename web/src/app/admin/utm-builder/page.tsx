"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

/**
 * UTM Builder — generate URL dengan UTM tracking params buat IG/TikTok/dll.
 *
 * Use case: SuperKupon pakai @superkupon.id di IG. Setiap link di bio/story/post
 * harus pakai UTM beda biar di GA4 lo bisa pisahin:
 * - "Traffic dari IG bio" vs "Traffic dari IG story" vs "Traffic dari TikTok"
 * - "Campaign launch week" vs "Campaign 1212 promo"
 *
 * Tanpa UTM, semua traffic dari IG masuk sebagai "direct" — gak bisa attribution.
 *
 * Akses: /admin/utm-builder (no auth — client-side tool, gak akses sensitive data)
 */

const PRESETS = [
  {
    name: "IG Bio Link",
    source: "instagram",
    medium: "bio",
    campaign: "launch-week-1",
    icon: "📷",
  },
  {
    name: "IG Story",
    source: "instagram",
    medium: "story",
    campaign: "launch-week-1",
    icon: "📸",
  },
  {
    name: "IG Reel Caption",
    source: "instagram",
    medium: "reel",
    campaign: "launch-week-1",
    icon: "🎬",
  },
  {
    name: "TikTok Bio",
    source: "tiktok",
    medium: "bio",
    campaign: "launch-week-1",
    icon: "🎵",
  },
  {
    name: "TikTok Video Caption",
    source: "tiktok",
    medium: "video",
    campaign: "launch-week-1",
    icon: "🎬",
  },
  {
    name: "Twitter / X Post",
    source: "twitter",
    medium: "tweet",
    campaign: "launch-week-1",
    icon: "🐦",
  },
  {
    name: "WhatsApp Share",
    source: "whatsapp",
    medium: "share",
    campaign: "launch-week-1",
    icon: "💬",
  },
  {
    name: "Email Newsletter",
    source: "email",
    medium: "newsletter",
    campaign: "weekly-digest",
    icon: "📧",
  },
];

export default function UtmBuilderPage() {
  const [baseUrl, setBaseUrl] = useState("https://superkupon.vercel.app");
  const [source, setSource] = useState("instagram");
  const [medium, setMedium] = useState("bio");
  const [campaign, setCampaign] = useState("launch-week-1");
  const [content, setContent] = useState("");
  const [term, setTerm] = useState("");
  const [copied, setCopied] = useState(false);

  const generatedUrl = useMemo(() => {
    if (!baseUrl) return "";
    try {
      const url = new URL(baseUrl);
      if (source) url.searchParams.set("utm_source", source);
      if (medium) url.searchParams.set("utm_medium", medium);
      if (campaign) url.searchParams.set("utm_campaign", campaign);
      if (content) url.searchParams.set("utm_content", content);
      if (term) url.searchParams.set("utm_term", term);
      return url.toString();
    } catch {
      return "INVALID URL — pastikan format https://...";
    }
  }, [baseUrl, source, medium, campaign, content, term]);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setSource(preset.source);
    setMedium(preset.medium);
    setCampaign(preset.campaign);
    setContent("");
    setTerm("");
  };

  const handleCopy = async () => {
    if (!generatedUrl || generatedUrl.startsWith("INVALID")) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = generatedUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="text-sm text-brand-400 hover:underline"
        >
          ← Balik ke Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-white">
          🔗 UTM Link Builder
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Bikin link tracking biar attribution traffic dari IG/TikTok bisa di-pisah di
          Google Analytics. Tanpa UTM, semua masuk sebagai "direct" — gak bisa tau
          source-nya.
        </p>
      </div>

      {/* Quick Presets */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <h2 className="mb-3 text-sm font-semibold text-gray-200">
          ⚡ Quick Preset (Klik buat Auto-Fill)
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs transition hover:border-brand-400 hover:bg-brand-500/10"
            >
              <span className="text-base">{p.icon}</span>
              <span className="text-gray-200">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div>
          <label className="block text-sm font-medium text-gray-200">
            Base URL
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://superkupon.vercel.app"
            className="mt-1 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Halaman target. Default: homepage. Bisa diganti ke `/coupon/123`,
            `/merchant/shopee`, dll.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-200">
              Source <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="instagram, tiktok, twitter"
              className="mt-1 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Platform asal (instagram, tiktok, dll)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200">
              Medium <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              placeholder="bio, story, post, reel"
              className="mt-1 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Tipe konten (bio, story, dll)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200">
              Campaign
            </label>
            <input
              type="text"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="launch-week-1, harbolnas-2026"
              className="mt-1 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Nama campaign untuk grouping
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200">
              Content (Opsional)
            </label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="banner-top, cta-button"
              className="mt-1 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Buat A/B test (banner versi A vs B)
            </p>
          </div>
        </div>
      </div>

      {/* Generated URL */}
      <div className="rounded-xl border-2 border-brand-400/40 bg-brand-500/10 p-5 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-200">
            🔗 URL Hasil (Copy & Pake di IG/TikTok bio)
          </h2>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!generatedUrl || generatedUrl.startsWith("INVALID")}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-40"
          >
            {copied ? "✓ Tersalin!" : "📋 Salin URL"}
          </button>
        </div>
        <div className="break-all rounded-lg bg-gray-900/80 p-3 font-mono text-xs text-emerald-300">
          {generatedUrl || "Isi form di atas dulu..."}
        </div>
        {generatedUrl && !generatedUrl.startsWith("INVALID") && (
          <p className="mt-2 text-xs text-gray-400">
            ✅ Paste URL ini di IG bio / TikTok caption / Twitter post. Pas user
            klik, Google Analytics akan track sebagai traffic dari{" "}
            <strong className="text-brand-300">
              {source}/{medium}
            </strong>
            .
          </p>
        )}
      </div>

      {/* How to Use */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <h2 className="mb-3 text-sm font-semibold text-gray-200">
          💡 Tips Pakai UTM
        </h2>
        <ul className="space-y-2 text-xs text-gray-300">
          <li>
            <strong className="text-white">📌 IG Bio</strong>: Pasang 1 link di
            bio dengan UTM source=instagram, medium=bio. Pas user klik dari profile
            page, langsung ke-track.
          </li>
          <li>
            <strong className="text-white">📸 IG Story</strong>: Pakai UTM
            medium=story biar bisa pisahin "traffic dari bio" vs "traffic dari
            story swipe-up".
          </li>
          <li>
            <strong className="text-white">🎬 TikTok</strong>: Pakai UTM
            source=tiktok, medium=video di caption video. TikTok caption bisa di-tap
            user.
          </li>
          <li>
            <strong className="text-white">💬 WhatsApp Broadcast</strong>: Pakai
            UTM source=whatsapp, medium=share — biar ke-track terpisah dari organic.
          </li>
        </ul>
      </div>

      {/* Where to See Result */}
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-5 backdrop-blur">
        <h2 className="mb-3 text-sm font-semibold text-emerald-200">
          📊 Cek Hasil di GA4
        </h2>
        <p className="text-xs text-gray-300">
          Setelah deploy + ada visitor klik link dengan UTM, buka{" "}
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-300 underline"
          >
            Google Analytics 4
          </a>{" "}
          → <strong>Reports → Acquisition → Traffic acquisition</strong>. Lo akan
          lihat breakdown traffic per source/medium.
        </p>
      </div>
    </div>
  );
}
