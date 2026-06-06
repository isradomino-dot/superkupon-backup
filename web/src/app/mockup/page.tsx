"use client";

import Link from "next/link";
import { useState } from "react";

import { MerchantLogo } from "@/components/MerchantLogo";

const MOCK_MERCHANTS = [
  { slug: "shopee", name: "Shopee", website: "https://shopee.co.id" },
  { slug: "tokopedia", name: "Tokopedia", website: "https://www.tokopedia.com" },
  { slug: "grab", name: "Grab", website: "https://www.grab.com" },
  { slug: "dana", name: "DANA", website: "https://dana.id" },
];

const MOCK_COUPON = {
  id: 999,
  title: "Diskon 70% Brand Lokal",
  code: "SHOPEEFASHION70",
  discount: "70%",
  expiry: "3 hari lagi",
  merchant: MOCK_MERCHANTS[0],
  quality: 95,
  description:
    "Flash sale fashion lokal Shopee Mall. Min belanja Rp 100.000.",
};

type CardVariant = "compact" | "standard" | "hero";
type ThemeKey = "violet" | "emerald" | "rose" | "amber";
type SearchVariant = "minimal" | "expanded" | "voice-prominent";
type EmptyStyle = "icon" | "illustration" | "skeleton-cta";

const THEMES: Record<ThemeKey, { name: string; accent: string; gradFrom: string; gradTo: string; ring: string }> = {
  violet: {
    name: "Violet (Current)",
    accent: "text-violet-600 dark:text-violet-400",
    gradFrom: "from-violet-500",
    gradTo: "to-violet-700",
    ring: "ring-violet-500/30",
  },
  emerald: {
    name: "Emerald Fresh",
    accent: "text-emerald-600 dark:text-emerald-400",
    gradFrom: "from-emerald-500",
    gradTo: "to-emerald-700",
    ring: "ring-emerald-500/30",
  },
  rose: {
    name: "Rose Warm",
    accent: "text-rose-600 dark:text-rose-400",
    gradFrom: "from-rose-500",
    gradTo: "to-rose-700",
    ring: "ring-rose-500/30",
  },
  amber: {
    name: "Amber Bold",
    accent: "text-amber-600 dark:text-amber-400",
    gradFrom: "from-amber-500",
    gradTo: "to-orange-600",
    ring: "ring-amber-500/30",
  },
};

export default function MockupPage() {
  const [cardVariant, setCardVariant] = useState<CardVariant>("standard");
  const [theme, setTheme] = useState<ThemeKey>("violet");
  const [searchVariant, setSearchVariant] = useState<SearchVariant>("expanded");
  const [emptyStyle, setEmptyStyle] = useState<EmptyStyle>("icon");
  const [detailVariant, setDetailVariant] = useState<"current" | "split">("current");

  return (
    <div className="space-y-10">
      {/* Hero */}
      <header className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-600 via-purple-700 to-violet-900 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              🎨 Design Lab
            </div>
            <h1 className="mt-2 text-3xl font-black">Interactive Mockup</h1>
            <p className="mt-1 max-w-2xl text-sm text-violet-100">
              Eksplorasi UI variants & feature concepts sebelum implement.
              Klik chip, hover element, toggle theme — semua interaktif buat preview.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
          >
            ← Ke aplikasi
          </Link>
        </div>
      </header>

      {/* Card Layout Variants */}
      <Section
        number="1"
        title="Card Layout Variants"
        hint="3 density level untuk coupon card — pick based on user use case (browsing vs scanning vs detail-focused)"
      >
        <Tabs
          options={[
            { value: "compact", label: "Compact (list-style)" },
            { value: "standard", label: "Standard (current)" },
            { value: "hero", label: "Hero (showcase)" },
          ]}
          value={cardVariant}
          onChange={(v) => setCardVariant(v as CardVariant)}
        />

        <div className="mt-4">
          {cardVariant === "compact" && <CompactCard />}
          {cardVariant === "standard" && <StandardCard />}
          {cardVariant === "hero" && <HeroCard />}
        </div>

        <CalloutBox>
          <strong>{VARIANT_LABELS[cardVariant]}</strong>: {VARIANT_RATIONALES[cardVariant]}
        </CalloutBox>
      </Section>

      {/* Theme Variants */}
      <Section
        number="2"
        title="Color Theme Palette"
        hint="Brand color anywhere violet sentries — preview alternatif"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
            const t = THEMES[key];
            const active = theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                className={[
                  "flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition",
                  active
                    ? "border-white shadow-lg " + t.ring + " ring-4"
                    : "border-gray-700 hover:border-gray-400",
                ].join(" ")}
              >
                <div className={[
                  "h-12 rounded-lg bg-gradient-to-br",
                  t.gradFrom, t.gradTo,
                ].join(" ")} />
                <div>
                  <div className="text-xs font-bold text-white">{t.name}</div>
                  <div className={["text-[10px] font-medium", t.accent].join(" ")}>
                    {active ? "✓ Selected" : "Click preview"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900/50 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Preview hero dengan tema: <span className={THEMES[theme].accent}>{THEMES[theme].name}</span>
          </div>
          <div className={[
            "mt-2 rounded-xl bg-gradient-to-br p-5",
            THEMES[theme].gradFrom, THEMES[theme].gradTo,
          ].join(" ")}>
            <h3 className="text-lg font-bold text-white">Kupon Digital Indonesia</h3>
            <p className="mt-1 text-sm text-white/80">Shopee · DANA · OVO · Tix ID — semua dalam satu aplikasi.</p>
            <button type="button" className="mt-3 rounded-md bg-white px-3 py-1 text-xs font-bold text-gray-900">
              Cari Kupon
            </button>
          </div>
        </div>
      </Section>

      {/* Detail Page Variants */}
      <Section
        number="3"
        title="Detail Page Hero Variants"
        hint="Coupon detail page — 2 layout approach"
      >
        <Tabs
          options={[
            { value: "current", label: "Current (stacked)" },
            { value: "split", label: "Split (left-info / right-CTA)" },
          ]}
          value={detailVariant}
          onChange={(v) => setDetailVariant(v as "current" | "split")}
        />
        <div className="mt-4">
          {detailVariant === "current" ? <DetailStacked /> : <DetailSplit />}
        </div>
      </Section>

      {/* Search Variants */}
      <Section
        number="4"
        title="Search Bar Style Experiments"
        hint="Different search prominence levels"
      >
        <Tabs
          options={[
            { value: "minimal", label: "Minimal" },
            { value: "expanded", label: "Expanded (current)" },
            { value: "voice-prominent", label: "Voice-first" },
          ]}
          value={searchVariant}
          onChange={(v) => setSearchVariant(v as SearchVariant)}
        />
        <div className="mt-4">
          {searchVariant === "minimal" && <SearchMinimal />}
          {searchVariant === "expanded" && <SearchExpanded />}
          {searchVariant === "voice-prominent" && <SearchVoice />}
        </div>
      </Section>

      {/* Empty State Variants */}
      <Section
        number="5"
        title="Empty State Styles"
        hint="What user sees ketika gak ada kupon yang cocok"
      >
        <Tabs
          options={[
            { value: "icon", label: "Icon + text (current)" },
            { value: "illustration", label: "Big illustration" },
            { value: "skeleton-cta", label: "Skeleton + CTA" },
          ]}
          value={emptyStyle}
          onChange={(v) => setEmptyStyle(v as EmptyStyle)}
        />
        <div className="mt-4">
          {emptyStyle === "icon" && <EmptyIcon />}
          {emptyStyle === "illustration" && <EmptyIllustration />}
          {emptyStyle === "skeleton-cta" && <EmptySkeleton />}
        </div>
      </Section>

      {/* Future Concepts */}
      <Section
        number="6"
        title="Future Concepts (Belum Diimplement)"
        hint="Ide-ide yang bisa lo evaluate dulu visual-wise — sebelum putusin worth dibikin atau gak"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ConceptCard
            emoji="🗺️"
            title="Map View Nearby Coupons"
            description="Tampilkan kupon dalam mode peta — pin tiap merchant outlet dengan badge diskon."
            mockup={<MapMockup />}
          />
          <ConceptCard
            emoji="📊"
            title="Coupon Comparison"
            description="Bandingkan 2-3 kupon side-by-side: discount, min spend, expiry, terms — buat keputusan cepat."
            mockup={<CompareMockup />}
          />
          <ConceptCard
            emoji="🧾"
            title="Receipt Calculator"
            description="Input nilai belanja → instant calc total saving dari kombinasi multiple kupon stackable."
            mockup={<CalculatorMockup />}
          />
          <ConceptCard
            emoji="🔗"
            title="Share via QR Code"
            description="Generate QR per kupon untuk share ke teman offline (event, store)."
            mockup={<QRMockup />}
          />
        </div>
      </Section>

      {/* Footer link */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4 text-center text-sm text-gray-400">
        Punya ide lain? Buka tab dengan keyword feature, gw bantu implement.
        <br />
        <Link href="/" className="mt-2 inline-block text-violet-400 hover:underline">
          ← Balik ke beranda utama
        </Link>
      </div>
    </div>
  );
}

const VARIANT_LABELS: Record<CardVariant, string> = {
  compact: "Compact (List)",
  standard: "Standard (Current)",
  hero: "Hero (Showcase)",
};

const VARIANT_RATIONALES: Record<CardVariant, string> = {
  compact:
    "List-style cocok untuk power user yang scan banyak kupon cepet. Density tinggi, less visual noise. Pakai di /favorites atau search results.",
  standard:
    "Balance antara info dan visual — yang dipake sekarang di homepage. Sweet spot untuk casual browsing.",
  hero:
    "Big card cocok untuk featured kupon (banner, top picks). Visual impact tinggi tapi consume lebih banyak space.",
};

/* ===========================================================
 * Reusable UI primitives
 * =========================================================== */

function Section({
  number,
  title,
  hint,
  children,
}: {
  number: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-black text-violet-500">{number}.</span>
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-xs text-gray-400">{hint}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-4">
        {children}
      </div>
    </section>
  );
}

function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={[
            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
            value === o.value
              ? "border-violet-500 bg-violet-500 text-white"
              : "border-gray-700 bg-gray-800 text-gray-300 hover:border-violet-400",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CalloutBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-md border-l-4 border-violet-500 bg-violet-500/10 px-3 py-2 text-xs text-gray-200">
      💡 {children}
    </div>
  );
}

/* ===========================================================
 * Card variants
 * =========================================================== */

function CompactCard() {
  return (
    <div className="divide-y divide-gray-700 rounded-xl border border-gray-700 bg-gray-900">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 hover:bg-gray-800/50">
          <MerchantLogo merchant={MOCK_MERCHANTS[i % MOCK_MERCHANTS.length]} size={32} rounded="md" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">
              {MOCK_COUPON.title}
            </div>
            <div className="text-xs text-gray-400">
              {MOCK_MERCHANTS[i % MOCK_MERCHANTS.length].name} · {MOCK_COUPON.expiry}
            </div>
          </div>
          <div className="flex-none text-right">
            <div className="text-lg font-black text-violet-400">{MOCK_COUPON.discount}</div>
            <button type="button" className="text-[10px] font-semibold text-emerald-400 hover:underline">
              Salin →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StandardCard() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <article key={i} className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <div className="border-b border-dashed border-gray-700 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-violet-400">
                <MerchantLogo merchant={MOCK_MERCHANTS[i % MOCK_MERCHANTS.length]} size={18} rounded="sm" />
                {MOCK_MERCHANTS[i % MOCK_MERCHANTS.length].name}
              </div>
              <div className="rounded bg-violet-500/20 px-2 py-0.5 text-sm font-bold text-violet-300">
                {MOCK_COUPON.discount}
              </div>
            </div>
            <h3 className="mt-1 text-sm font-semibold text-white">{MOCK_COUPON.title}</h3>
          </div>
          <div className="space-y-2 p-3 text-xs">
            <p className="text-gray-400">{MOCK_COUPON.description}</p>
            <div className="flex items-center justify-between text-gray-500">
              <span>⏰ {MOCK_COUPON.expiry}</span>
              <span className="text-emerald-400">★ {MOCK_COUPON.quality}</span>
            </div>
            <button
              type="button"
              className="w-full rounded bg-violet-500 px-2 py-1 text-xs font-bold text-white hover:bg-violet-600"
            >
              Salin {MOCK_COUPON.code}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function HeroCard() {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-violet-500/40 bg-gradient-to-br from-violet-900/40 to-gray-900">
      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-violet-500 to-purple-700 p-6 text-white">
          <MerchantLogo merchant={MOCK_MERCHANTS[0]} size={48} rounded="md" className="mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider">Featured</div>
          <div className="mt-1 text-5xl font-black">{MOCK_COUPON.discount}</div>
          <div className="text-xs">OFF</div>
        </div>
        <div className="col-span-2 space-y-3 p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-violet-300">
            {MOCK_MERCHANTS[0].name} · ★ {MOCK_COUPON.quality}
          </div>
          <h3 className="text-2xl font-black text-white">{MOCK_COUPON.title}</h3>
          <p className="text-sm text-gray-300">{MOCK_COUPON.description}</p>
          <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-violet-400/60 bg-violet-500/10 p-3">
            <span className="flex-1 font-mono text-lg font-black text-violet-200">
              {MOCK_COUPON.code}
            </span>
            <button
              type="button"
              className="rounded-md bg-violet-500 px-4 py-2 text-sm font-bold text-white hover:bg-violet-600"
            >
              Salin Kode
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>⏰ {MOCK_COUPON.expiry}</span>
            <span>1.2k disalin</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
 * Detail page variants
 * =========================================================== */

function DetailStacked() {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-start justify-between gap-4 border-b border-dashed border-gray-700 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-violet-400">
            <MerchantLogo merchant={MOCK_MERCHANTS[0]} size={18} rounded="sm" />
            {MOCK_MERCHANTS[0].name}
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">{MOCK_COUPON.title}</h2>
          <p className="mt-1 text-sm text-gray-300">{MOCK_COUPON.description}</p>
        </div>
        <div className="rounded-xl bg-violet-500/15 px-4 py-3 text-center">
          <div className="text-[10px] uppercase text-violet-300">Diskon</div>
          <div className="text-3xl font-black text-violet-200">{MOCK_COUPON.discount}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg border-2 border-dashed border-violet-400 bg-violet-500/10 p-3">
        <span className="flex-1 font-mono text-xl font-black text-violet-200">{MOCK_COUPON.code}</span>
        <button type="button" className="rounded bg-violet-500 px-5 py-2.5 text-sm font-bold text-white">
          Salin
        </button>
      </div>
    </div>
  );
}

function DetailSplit() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-violet-400">
          <MerchantLogo merchant={MOCK_MERCHANTS[0]} size={18} rounded="sm" />
          {MOCK_MERCHANTS[0].name}
        </div>
        <h2 className="mt-2 text-2xl font-bold text-white">{MOCK_COUPON.title}</h2>
        <p className="mt-2 text-sm text-gray-300">{MOCK_COUPON.description}</p>
        <dl className="mt-4 space-y-1.5 text-xs">
          {[
            ["⏰ Berlaku sampai", MOCK_COUPON.expiry],
            ["🛒 Min belanja", "Rp 100.000"],
            ["💰 Max diskon", "Rp 150.000"],
            ["⭐ Kualitas", `${MOCK_COUPON.quality}/100`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <dt className="text-gray-400">{k}</dt>
              <dd className="font-semibold text-gray-100">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-violet-400/40 bg-gradient-to-br from-violet-500/15 to-purple-700/15 p-5">
        <div className="text-center">
          <div className="text-[10px] uppercase text-violet-300">Diskon</div>
          <div className="text-6xl font-black text-violet-200">{MOCK_COUPON.discount}</div>
        </div>
        <div className="rounded-lg border-2 border-dashed border-violet-400/60 bg-gray-900/50 p-3 text-center">
          <div className="text-[10px] uppercase text-violet-300">Kode Promo</div>
          <div className="mt-1 font-mono text-xl font-black text-violet-100">{MOCK_COUPON.code}</div>
        </div>
        <button type="button" className="rounded-lg bg-violet-500 py-3 text-sm font-bold text-white hover:bg-violet-600">
          🌐 Pakai di {MOCK_MERCHANTS[0].name}
        </button>
        <div className="flex gap-2">
          <button type="button" className="flex-1 rounded-lg border border-gray-600 py-2 text-xs text-gray-300 hover:bg-gray-700">
            📤 Share
          </button>
          <button type="button" className="flex-1 rounded-lg border border-gray-600 py-2 text-xs text-gray-300 hover:bg-gray-700">
            ♥ Favorit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
 * Search variants
 * =========================================================== */

function SearchMinimal() {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-3">
      <input
        type="search"
        placeholder="Cari kupon..."
        className="w-full border-b border-gray-600 bg-transparent py-2 text-sm text-white placeholder:text-gray-500 focus:border-violet-400 focus:outline-none"
      />
    </div>
  );
}

function SearchExpanded() {
  return (
    <div className="rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 p-5">
      <h3 className="text-lg font-bold text-white">Cari Kupon Lo</h3>
      <p className="text-xs text-violet-200">Merchant, kode promo, atau kategori</p>
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <input
            type="search"
            placeholder="Cari kupon, merchant, atau kode..."
            className="w-full rounded-lg border-gray-300 bg-white px-3 py-2 pr-10 text-sm shadow-sm focus:outline-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🎤</span>
        </div>
        <button type="button" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-violet-700">
          Cari
        </button>
      </div>
    </div>
  );
}

function SearchVoice() {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-5 text-center">
      <button
        type="button"
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-3xl text-white shadow-lg hover:scale-105"
        title="Tap to speak"
      >
        🎤
      </button>
      <p className="mt-3 text-sm font-semibold text-white">Tap untuk ngomong</p>
      <p className="mt-1 text-xs text-gray-400">"Cari kupon Shopee diskon 50 persen"</p>
      <div className="mt-3 text-[10px] text-gray-500">
        atau{" "}
        <button type="button" className="text-violet-400 underline">
          ketik manual
        </button>
      </div>
    </div>
  );
}

/* ===========================================================
 * Empty state variants
 * =========================================================== */

function EmptyIcon() {
  return (
    <div className="rounded-xl border border-dashed border-gray-600 p-10 text-center">
      <div className="text-5xl">📭</div>
      <p className="mt-3 font-semibold text-gray-200">Belum ada kupon</p>
      <p className="mt-1 text-xs text-gray-500">Tunggu scheduler scrape atau cek merchant lain.</p>
    </div>
  );
}

function EmptyIllustration() {
  return (
    <div className="rounded-xl border border-dashed border-violet-400/40 bg-gradient-to-br from-violet-500/5 to-pink-500/5 p-10 text-center">
      <div className="mx-auto h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/30 to-pink-500/30 p-8 text-7xl">
        <div className="animate-pulse">🎟️</div>
      </div>
      <h3 className="mt-4 text-lg font-bold text-white">Pencarian kosong</h3>
      <p className="mt-1 text-sm text-gray-400">
        Coba filter lain atau browse kupon featured dari sidebar.
      </p>
      <button type="button" className="mt-4 rounded-md bg-violet-500 px-4 py-2 text-sm font-bold text-white">
        Lihat featured →
      </button>
    </div>
  );
}

function EmptySkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-center">
        <p className="text-sm font-semibold text-amber-300">
          ⚠️ Backend tampaknya sedang down
        </p>
        <p className="mt-1 text-xs text-amber-200">
          Beberapa kupon yang lo pernah lihat masih bisa diakses (cached).
        </p>
        <button type="button" className="mt-3 rounded bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">
          ↻ Coba lagi
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 opacity-40">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-700" />
        ))}
      </div>
    </div>
  );
}

/* ===========================================================
 * Future concept mockups
 * =========================================================== */

function ConceptCard({
  emoji,
  title,
  description,
  mockup,
}: {
  emoji: string;
  title: string;
  description: string;
  mockup: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-gray-700/50"
      >
        <span className="text-3xl" aria-hidden>{emoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="mt-1 text-xs text-gray-400">{description}</p>
        </div>
        <span className="text-gray-500">{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="border-t border-gray-700 bg-gray-900/50 p-4">
          {mockup}
        </div>
      )}
    </div>
  );
}

function MapMockup() {
  return (
    <div className="relative h-48 overflow-hidden rounded-lg bg-gradient-to-br from-emerald-900/30 to-teal-900/30">
      {/* fake roads */}
      <div className="absolute inset-x-2 top-12 h-0.5 bg-gray-700" />
      <div className="absolute inset-y-2 left-1/3 w-0.5 bg-gray-700" />
      {/* pins */}
      {[
        { x: 18, y: 22, label: "70%", color: "rose" },
        { x: 50, y: 40, label: "50%", color: "amber" },
        { x: 75, y: 60, label: "30%", color: "emerald" },
      ].map((pin, i) => (
        <div
          key={i}
          className={[
            "absolute flex h-8 w-8 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full text-[10px] font-black text-white shadow-lg",
            pin.color === "rose" ? "bg-rose-500" : pin.color === "amber" ? "bg-amber-500" : "bg-emerald-500",
          ].join(" ")}
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
        >
          {pin.label}
        </div>
      ))}
      <div className="absolute bottom-2 left-2 rounded bg-gray-900/80 px-2 py-1 text-[10px] text-gray-300">
        📍 Jakarta Selatan
      </div>
    </div>
  );
}

function CompareMockup() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { name: "Shopee", disc: "70%", min: "100k", expiry: "3d" },
        { name: "Tokopedia", disc: "50%", min: "50k", expiry: "1d", winner: true },
      ].map((c, i) => (
        <div
          key={i}
          className={[
            "rounded-lg border p-3",
            c.winner
              ? "border-emerald-400 bg-emerald-500/10"
              : "border-gray-700 bg-gray-900/50",
          ].join(" ")}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">{c.name}</span>
            {c.winner && <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black text-white">BEST</span>}
          </div>
          <div className="mt-1 text-xl font-black text-violet-300">{c.disc}</div>
          <div className="mt-1 text-[10px] text-gray-400">
            Min: Rp {c.min} · {c.expiry}
          </div>
        </div>
      ))}
    </div>
  );
}

function CalculatorMockup() {
  const [spend, setSpend] = useState(150000);
  const saving = Math.min(Math.floor((spend * 70) / 100), 150000);
  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-400">Estimasi belanja</label>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
        <input
          type="number"
          value={spend}
          onChange={(e) => setSpend(Number(e.target.value) || 0)}
          className="w-full rounded-md border border-gray-600 bg-gray-800 py-2 pl-8 pr-2 text-sm text-white"
        />
      </div>
      <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-center">
        <div className="text-[10px] uppercase text-emerald-300">Total Saving</div>
        <div className="mt-1 text-2xl font-black text-emerald-200">
          Rp {saving.toLocaleString("id-ID")}
        </div>
        <div className="mt-1 text-[10px] text-emerald-300">dari 3 kupon stackable</div>
      </div>
    </div>
  );
}

function QRMockup() {
  return (
    <div className="rounded-lg bg-white p-4 text-center">
      <div
        className="mx-auto h-32 w-32 bg-gray-900"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #fff 0 4px, #000 4px 8px), repeating-linear-gradient(90deg, #fff 0 4px, transparent 4px 8px)",
          backgroundBlendMode: "difference",
        }}
        aria-hidden
      />
      <div className="mt-2 font-mono text-xs font-bold text-gray-900">SHOPEEFASHION70</div>
      <div className="text-[10px] text-gray-600">Scan dengan SuperKupon app</div>
    </div>
  );
}
