"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Bookmarklet JavaScript — extracts the retailer domain from current page,
 * opens SuperKupon search filtered by it in a new tab.
 *
 * Edit dengan hati-hati — single-line, no newlines, properly escaped.
 */
const BOOKMARKLET_TEMPLATE = (origin: string) =>
  `javascript:(function(){var h=location.hostname.replace(/^www\\./,'');var p=h.split('.')[0];var url='${origin}/?q='+encodeURIComponent(p);window.open(url,'_blank','noopener,noreferrer');})();`;

const MERCHANT_EXAMPLES = [
  { domain: "shopee.co.id", brand: "Shopee" },
  { domain: "tokopedia.com", brand: "Tokopedia" },
  { domain: "lazada.co.id", brand: "Lazada" },
  { domain: "blibli.com", brand: "Blibli" },
  { domain: "traveloka.com", brand: "Traveloka" },
  { domain: "grab.com", brand: "Grab" },
];

export default function BookmarkletPage() {
  const [origin, setOrigin] = useState("https://superkupon.id");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const bookmarkletCode = BOOKMARKLET_TEMPLATE(origin);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-br from-sky-600 via-indigo-700 to-violet-800 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              🔖 Browser Bookmarklet
            </div>
            <h1 className="mt-2 text-3xl font-black">SuperKupon Instant Search</h1>
            <p className="mt-2 max-w-2xl text-sm text-sky-100">
              Drag tombol di bawah ke bookmark bar browser lo. Saat lo lagi belanja
              di Shopee/Tokopedia/dll, click bookmark → langsung buka SuperKupon
              dengan search pre-filtered ke merchant tersebut.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
          >
            ← Beranda
          </Link>
        </div>
      </header>

      {/* The bookmarklet itself */}
      <section className="rounded-2xl border-2 border-sky-400/40 bg-gradient-to-br from-sky-500/10 to-violet-500/10 p-6 text-center">
        <h2 className="text-sm font-bold uppercase tracking-wider text-sky-300">
          ⬇ Drag tombol ini ke Bookmark Bar lo ⬇
        </h2>

        {/* The draggable bookmarklet link */}
        <div className="my-5 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href={bookmarkletCode}
            onClick={(e) => e.preventDefault()}
            draggable
            className="inline-flex cursor-grab items-center gap-2 rounded-full border-2 border-sky-400 bg-gradient-to-br from-sky-500 to-violet-600 px-6 py-3 text-base font-black text-white shadow-2xl shadow-sky-500/30 transition hover:scale-105 active:cursor-grabbing"
          >
            <span aria-hidden>🎟</span>
            Cari di SuperKupon
          </a>
        </div>

        <p className="mt-3 text-[11px] text-gray-400">
          💡 Tip: kalau bookmark bar gak kelihatan, tekan{" "}
          <kbd className="rounded bg-gray-700 px-1.5 font-mono text-[10px] text-gray-200">
            Ctrl+Shift+B
          </kbd>{" "}
          (Windows/Linux) atau{" "}
          <kbd className="rounded bg-gray-700 px-1.5 font-mono text-[10px] text-gray-200">
            ⌘+Shift+B
          </kbd>{" "}
          (Mac) buat toggle.
        </p>
      </section>

      {/* How to install */}
      <section className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5">
        <h2 className="mb-3 text-base font-bold text-white">📖 Cara Install</h2>
        <ol className="space-y-2.5 text-sm text-gray-200">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white">
              1
            </span>
            <span>
              <strong>Pastikan bookmark bar visible</strong> — pencet Ctrl+Shift+B / ⌘+Shift+B
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white">
              2
            </span>
            <span>
              <strong>Drag tombol &quot;🎟 Cari di SuperKupon&quot; di atas</strong> ke bookmark bar
              lo (browser top bar yang menampilkan saved bookmarks)
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white">
              3
            </span>
            <span>
              <strong>Done!</strong> Bookmarklet sekarang ke-save sebagai bookmark
            </span>
          </li>
        </ol>
      </section>

      {/* How to use */}
      <section className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5">
        <h2 className="mb-3 text-base font-bold text-white">🚀 Cara Pakai</h2>
        <ol className="space-y-2.5 text-sm text-gray-200">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
              1
            </span>
            <span>
              Buka website e-commerce / brand favorit lo (misal: shopee.co.id, tokopedia.com)
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
              2
            </span>
            <span>
              Click bookmark <strong>&quot;🎟 Cari di SuperKupon&quot;</strong> di bookmark bar
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
              3
            </span>
            <span>
              Tab baru bakal terbuka ke SuperKupon dengan kupon dari merchant tersebut sudah pre-filtered
            </span>
          </li>
        </ol>
      </section>

      {/* Examples */}
      <section className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5">
        <h2 className="mb-3 text-base font-bold text-white">📋 Examples</h2>
        <p className="mb-3 text-xs text-gray-400">
          Saat lo lagi di domain berikut, click bookmarklet bakal buka:
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MERCHANT_EXAMPLES.map((m) => (
            <div
              key={m.domain}
              className="flex items-center gap-2 rounded-md border border-gray-700 bg-gray-800/40 p-2.5 text-xs"
            >
              <span className="font-mono text-gray-400">{m.domain}</span>
              <span className="text-gray-500">→</span>
              <span className="font-semibold text-brand-300">
                /?q={m.brand.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Copy raw code (advanced) */}
      <section className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">🔧 Raw Code (Advanced)</h2>
          <button
            type="button"
            onClick={handleCopy}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-bold shadow transition",
              copied
                ? "bg-emerald-500 text-white"
                : "bg-brand-500 text-white hover:bg-brand-600",
            ].join(" ")}
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>
        </div>
        <p className="mb-2 text-xs text-gray-400">
          Kalau drag gak work (some browsers block javascript: URL), copy code ini
          dan create bookmark manual dengan URL = code below.
        </p>
        <pre className="overflow-x-auto rounded-md border border-gray-700 bg-black/40 p-3 text-[10px] text-emerald-300">
          <code>{bookmarkletCode}</code>
        </pre>
      </section>

      <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4 text-xs text-gray-400">
        <h3 className="mb-1 font-bold text-gray-300">🔒 Privacy</h3>
        Bookmarklet berjalan client-side di browser lo. Code di atas pure JavaScript
        yang cuma baca <code>location.hostname</code> dan buka URL SuperKupon baru.
        Gak ada tracking, gak ada data kirim ke server.
      </div>
    </div>
  );
}
