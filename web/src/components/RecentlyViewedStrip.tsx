"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { useRecentlyViewed, type RecentViewRecord } from "@/lib/use-recently-viewed";
import { MerchantLogo } from "@/components/MerchantLogo";

function formatRelative(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "barusan";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  const d = Math.floor(h / 24);
  return `${d}h lalu`;
}

function formatDiscount(r: RecentViewRecord): string {
  switch (r.discountType) {
    case "percent":
      return `${r.discountValue}%`;
    case "fixed":
      return `Rp ${r.discountValue.toLocaleString("id-ID")}`;
    case "cashback":
      return r.discountValue < 100
        ? `CB ${r.discountValue}%`
        : `CB ${(r.discountValue / 1000) | 0}k`;
    case "free_shipping":
      return "Gratis Ongkir";
    case "bogo":
      return "B1G1";
    default:
      return "Promo";
  }
}

export function RecentlyViewedStrip() {
  const { records, remove, clear } = useRecentlyViewed();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 8);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  const scrollBy = (offset: number) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  if (records.length === 0) return null;

  return (
    <section className="space-y-2.5 rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/8 via-transparent to-violet-500/8 p-4 animate-slide-up">
      <header className="flex items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-bold text-white">
            <span aria-hidden>🕒</span> Baru Lo Lihat
          </h2>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {records.length} kupon terakhir lo browse — klik untuk lanjut
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 hover:underline"
        >
          ✕ Clear
        </button>
      </header>

      <div className="relative">
        {/* Left arrow */}
        {showLeft && (
          <button
            type="button"
            onClick={() => scrollBy(-280)}
            aria-label="Scroll left"
            className="absolute -left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-700 bg-gray-900/90 text-white shadow-lg backdrop-blur transition hover:bg-gray-800"
          >
            ←
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth pb-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-600/40 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-track]:bg-transparent"
        >
          {records.map((r) => (
            <RecentCard key={r.id} record={r} onRemove={() => remove(r.id)} />
          ))}
        </div>

        {/* Right arrow */}
        {showRight && (
          <button
            type="button"
            onClick={() => scrollBy(280)}
            aria-label="Scroll right"
            className="absolute -right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-700 bg-gray-900/90 text-white shadow-lg backdrop-blur transition hover:bg-gray-800"
          >
            →
          </button>
        )}
      </div>
    </section>
  );
}

function RecentCard({
  record,
  onRemove,
}: {
  record: RecentViewRecord;
  onRemove: () => void;
}) {
  return (
    <Link
      href={`/coupon/${record.id}`}
      className="group relative flex h-32 w-40 flex-none snap-start flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900/70 p-2.5 transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lg hover:shadow-brand-500/20"
    >
      {/* Remove button (hover) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Hapus ${record.title} dari recently viewed`}
        title="Hapus dari history"
        className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800/90 text-[10px] text-gray-400 opacity-0 transition hover:bg-rose-500/80 hover:text-white group-hover:opacity-100"
      >
        ✕
      </button>

      {/* Merchant header */}
      <div className="flex items-center gap-1.5">
        <MerchantLogo
          merchant={{
            slug: record.merchantSlug,
            name: record.merchantName,
            website: record.merchantWebsite,
          }}
          size={20}
          rounded="sm"
        />
        <span className="truncate text-[10px] font-bold uppercase tracking-wide text-brand-400">
          {record.merchantName}
        </span>
      </div>

      {/* Title */}
      <p className="mt-1 line-clamp-2 flex-1 text-[11px] font-semibold text-gray-100 group-hover:text-white">
        {record.title}
      </p>

      {/* Footer: discount + time */}
      <div className="flex items-end justify-between gap-1">
        <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-black text-brand-300">
          {formatDiscount(record)}
        </span>
        <span className="text-[9px] text-gray-500">{formatRelative(record.viewedAt)}</span>
      </div>
    </Link>
  );
}
