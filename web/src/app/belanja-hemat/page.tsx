"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listCoupons, formatDiscount, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { MerchantLogo } from "@/components/MerchantLogo";

export const dynamic = "force-dynamic";

type TabId = "share" | "belanja" | "tips";

interface Tab {
  id: TabId;
  emoji: string;
  label: string;
  desc: string;
}

const TABS: Tab[] = [
  { id: "share", emoji: "🎁", label: "Bagi-Bagi Kupon", desc: "Share ke teman / keluarga via WhatsApp" },
  { id: "belanja", emoji: "🛒", label: "Daftar Belanja", desc: "Input list → dapat kupon per item" },
  { id: "tips", emoji: "📚", label: "Tips & Trik", desc: "Panduan praktis belanja hemat" },
];

// Keyword → category mapping
const KEYWORD_CATEGORIES: Record<string, string> = {
  // Food
  kopi: "food", susu: "food", roti: "food", nasi: "food", makan: "food",
  makanan: "food", snack: "food", minuman: "food", coffee: "food", boba: "food",
  bakso: "food", ayam: "food", pizza: "food", burger: "food",
  // Fashion
  baju: "fashion", celana: "fashion", sepatu: "fashion", fashion: "fashion",
  outfit: "fashion", kemeja: "fashion", kaos: "fashion", hijab: "fashion",
  jaket: "fashion", sandal: "fashion",
  // E-commerce
  sembako: "ecommerce", elektronik: "ecommerce", gadget: "ecommerce",
  shopee: "ecommerce", tokopedia: "ecommerce", lazada: "ecommerce",
  hp: "ecommerce", laptop: "ecommerce", aksesoris: "ecommerce",
  belanja: "ecommerce", barang: "ecommerce", produk: "ecommerce",
  // Transport
  ojek: "transport", taksi: "transport", grab: "transport", gojek: "transport",
  transport: "transport", motor: "transport", mobil: "transport",
  // Entertainment
  film: "entertainment", nonton: "entertainment", bioskop: "entertainment",
  netflix: "entertainment", streaming: "entertainment", konser: "entertainment",
  tiket: "entertainment", hiburan: "entertainment",
  // Bills
  pulsa: "bills", listrik: "bills", tagihan: "bills", topup: "bills",
  internet: "bills", wifi: "bills", paketan: "bills", bayar: "bills",
};

function matchItemToCategory(item: string): string | null {
  const lower = item.toLowerCase().trim();
  for (const [keyword, category] of Object.entries(KEYWORD_CATEGORIES)) {
    if (lower.includes(keyword)) return category;
  }
  return null;
}

interface TipItem {
  emoji: string;
  title: string;
  desc: string;
}

const TIPS: TipItem[] = [
  {
    emoji: "🛒",
    title: "Cara Pakai Kupon di Checkout",
    desc: "1. Tambah barang ke keranjang · 2. Klik 'Pakai Kupon' / 'Voucher' · 3. Paste kode di kolom · 4. Klik 'Apply'. Diskon otomatis terapply ke total bayar.",
  },
  {
    emoji: "💰",
    title: "Bedanya Cashback vs Diskon",
    desc: "Diskon: harga langsung turun di checkout. Cashback: bayar harga normal, uang kembali ke saldo/wallet setelah transaksi. Cashback biasanya lebih besar tapi butuh tunggu.",
  },
  {
    emoji: "🎯",
    title: "5 Hari Tanggal Promo Terbesar",
    desc: "Tanggal kembar (1.1, 2.2, dst), 25 (gajian), Hari Belanja Online Nasional (12.12), Lebaran/Idul Fitri, Tahun Baru. Kupon paling banyak muncul di hari-hari ini.",
  },
  {
    emoji: "⏰",
    title: "Hindari Kupon Expired",
    desc: "Save kupon ke Favorit ❤️ — sistem auto-track expire date. Aktifkan Saved Alerts 🔔 untuk dapat notifikasi sebelum expire. Cek Pilihan Hari Ini untuk lihat 'Last Chance' kupon.",
  },
  {
    emoji: "🔥",
    title: "Cara Stacking Kupon",
    desc: "Stacking = pakai 2-3 kupon barengan untuk hemat maksimal. Aturan: tipe diskon berbeda bisa di-stack (persen + cashback ✅), tipe sama gak bisa (2 cashback ❌). Lihat fitur Kombo Kupon untuk auto-detect.",
  },
  {
    emoji: "📱",
    title: "Install SuperKupon di HP",
    desc: "Buka SuperKupon di Chrome HP → klik menu (titik 3) → 'Install app' / 'Add to Home Screen'. Jadi icon kayak aplikasi biasa, akses lebih cepat, dan dapat notifikasi.",
  },
  {
    emoji: "🎁",
    title: "Cek Syarat Sebelum Pakai",
    desc: "Min belanja: total cart harus >= angka tertentu. Max diskon: diskon dibatasi maksimum Rp. Khusus produk tertentu: gak semua barang dapat diskon. Baca detail kupon dulu sebelum checkout.",
  },
  {
    emoji: "🤖",
    title: "Pakai 'Tanya SuperKupon' Bot",
    desc: "Klik bubble 🤖 di pojok kanan bawah → ketik bebas. Misal 'kupon makan murah', 'shopee cashback 50 ribu'. Bot ngerti bahasa sehari-hari & selalu kasih hasil.",
  },
];

export default function BelanjaHematPage() {
  const [tab, setTab] = useState<TabId>("share");

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/20 via-purple-500/10 to-transparent p-6 animate-slide-up">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <span className="text-4xl">🎉</span>
          Belanja Hemat
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Hub fitur sosial & praktis: bagi kupon ke teman, daftar belanja pintar, dan tips
          belanja hemat dari A-Z.
        </p>
      </header>

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "flex-1 min-w-[140px] rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
              tab === t.id
                ? "bg-gradient-to-br from-brand-500 to-purple-500 text-white shadow-lg shadow-brand-500/30"
                : "text-gray-300 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            <span className="mr-1">{t.emoji}</span>
            <span className="text-xs sm:text-sm">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "share" && <ShareTab />}
      {tab === "belanja" && <BelanjaTab />}
      {tab === "tips" && <TipsTab />}
    </div>
  );
}

// =============================================================
// TAB 1: Bagi-Bagi Kupon ke Teman
// =============================================================

function ShareTab() {
  const { t } = useI18n();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    listCoupons({ limit: 10, sort: "quality" }, { signal: ctrl.signal })
      .then((c) => {
        if (!ctrl.signal.aborted) setCoupons(c);
      })
      .catch((e) => {
        if (!isAbortError(e)) setCoupons([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  return (
    <section className="space-y-4 animate-slide-up">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          🎁 Bagi Kupon ke Teman
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Pilih kupon → klik tombol share → kirim ke WhatsApp / Telegram / dll. Sekali klik,
          temenmu langsung dapat kode + link kupon.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <ShareCard key={c.id} coupon={c} discount={formatDiscount(c, t)} />
          ))}
        </div>
      )}
    </section>
  );
}

function ShareCard({ coupon, discount }: { coupon: Coupon; discount: string }) {
  const [shared, setShared] = useState(false);

  const buildMessage = (): string => {
    const lines = [
      `🎁 *${coupon.merchant.name}* — ${coupon.title}`,
      ``,
      coupon.code ? `Kode: *${coupon.code}*` : `Promo otomatis (no kode)`,
      `Diskon: *${discount}*`,
    ];
    if (coupon.min_spend) {
      lines.push(`Min belanja: Rp ${coupon.min_spend.toLocaleString("id-ID")}`);
    }
    if (coupon.expires_at) {
      const exp = new Date(coupon.expires_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
      });
      lines.push(`Berlaku sampai: ${exp}`);
    }
    lines.push(``);
    lines.push(`Detail kupon: https://superkupon.vercel.app/coupon/${coupon.id}`);
    lines.push(``);
    lines.push(`✨ Via SuperKupon — aggregator kupon Indonesia`);
    return lines.join("\n");
  };

  const handleShare = async () => {
    const msg = buildMessage();
    // Try Web Share API first (mobile-friendly)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Kupon ${coupon.merchant.name}`, text: msg });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch {
        /* user cancelled or not supported, fallback */
      }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(msg);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(buildMessage())}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(`https://superkupon.vercel.app/coupon/${coupon.id}`)}&text=${encodeURIComponent(buildMessage())}`;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-brand-400/40">
      <div className="flex items-start gap-3">
        <MerchantLogo merchant={coupon.merchant} size={40} rounded="md" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-300">
            {coupon.merchant.name}
          </p>
          <h3 className="line-clamp-1 text-sm font-bold text-white">{coupon.title}</h3>
          <div className="mt-1 flex items-center gap-2">
            {coupon.code && (
              <code className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                {coupon.code}
              </code>
            )}
            <span className="text-xs font-semibold text-emerald-300">{discount}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white shadow transition hover:scale-105"
        >
          📱 WhatsApp
        </a>
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0088cc] px-3 py-1.5 text-xs font-bold text-white shadow transition hover:scale-105"
        >
          ✈️ Telegram
        </a>
        <button
          type="button"
          onClick={handleShare}
          className={[
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
            shared
              ? "bg-emerald-500 text-white"
              : "border border-white/15 bg-white/5 text-gray-200 hover:bg-white/10",
          ].join(" ")}
        >
          {shared ? "✓ Disalin!" : "📋 Salin Pesan"}
        </button>
      </div>
    </div>
  );
}

// =============================================================
// TAB 2: Daftar Belanja Pintar
// =============================================================

function BelanjaTab() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [matches, setMatches] = useState<
    { item: string; category: string | null; coupons: Coupon[] }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    const items = input
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (items.length === 0) return;

    setLoading(true);
    const results = await Promise.all(
      items.map(async (item) => {
        const category = matchItemToCategory(item);
        if (!category) return { item, category: null, coupons: [] };
        const coupons = await listCoupons({
          category,
          limit: 2,
          sort: "quality",
        }).catch(() => []);
        return { item, category, coupons };
      }),
    );
    setMatches(results);
    setLoading(false);
  };

  const totalCoupons = matches.reduce((sum, m) => sum + m.coupons.length, 0);

  return (
    <section className="space-y-4 animate-slide-up">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          🛒 Daftar Belanja Pintar
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Tulis daftar belanjamu (1 item per baris atau pisah koma). Sistem cariin kupon yang
          cocok per item. Contoh: kopi, baju, pulsa
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-brand-400/30 bg-white/5 p-5">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"kopi\nbaju\npulsa Telkomsel\nmakan siang"}
          rows={5}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
        />
        <button
          type="button"
          onClick={handleCheck}
          disabled={!input.trim() || loading}
          className="w-full rounded-lg bg-gradient-to-r from-brand-500 to-purple-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-[1.01] disabled:opacity-50"
        >
          {loading ? "⏳ Mencari kupon..." : "✨ Cariin Kupon Terbaik"}
        </button>
      </div>

      {matches.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-300">
            <span className="font-bold text-brand-300">{totalCoupons} kupon</span> ditemukan
            untuk {matches.length} item belanja
          </p>
          {matches.map((m, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white">
                  🛒 {m.item}
                  {m.category && (
                    <span className="ml-2 text-xs font-normal text-brand-300">
                      → kategori {m.category}
                    </span>
                  )}
                </h3>
                <span className="text-xs text-gray-500">
                  {m.coupons.length} kupon
                </span>
              </div>
              {m.coupons.length === 0 ? (
                <p className="mt-2 text-xs text-amber-300">
                  💡 Item ini gak ada kategori yang cocok. Coba kata kunci lain (kopi, baju,
                  pulsa, dll).
                </p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {m.coupons.map((c) => (
                    <Link
                      key={c.id}
                      href={`/coupon/${c.id}`}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 p-2 transition hover:border-brand-400/40 hover:bg-white/10"
                    >
                      <MerchantLogo merchant={c.merchant} size={28} rounded="md" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs font-bold text-white">{c.title}</p>
                        <p className="text-[10px] text-gray-400">{c.merchant.name}</p>
                      </div>
                      <span className="flex-none rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-200">
                        {formatDiscount(c, t)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-gray-400">
        <p className="font-bold text-gray-300">💡 Kata kunci yang didukung:</p>
        <p className="mt-1">
          <strong className="text-amber-300">Makanan:</strong> kopi, susu, makan, snack, kuliner
          ·{" "}
          <strong className="text-pink-300">Fashion:</strong> baju, celana, sepatu, outfit ·{" "}
          <strong className="text-sky-300">Transport:</strong> ojek, taksi, grab, gojek ·{" "}
          <strong className="text-violet-300">Hiburan:</strong> film, nonton, tiket, netflix ·{" "}
          <strong className="text-emerald-300">Bayar:</strong> pulsa, listrik, tagihan, wifi
        </p>
      </div>
    </section>
  );
}

// =============================================================
// TAB 3: Tips & Trik
// =============================================================

function TipsTab() {
  return (
    <section className="space-y-4 animate-slide-up">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          📚 Tips & Trik Belanja Hemat
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Panduan praktis untuk maksimalkan kupon — dari pemula sampai mahir.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TIPS.map((tip, i) => (
          <TipCard key={i} tip={tip} number={i + 1} />
        ))}
      </div>
    </section>
  );
}

function TipCard({ tip, number }: { tip: TipItem; number: number }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5 transition hover:border-brand-400/40 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl transition-transform group-hover:scale-110">
          {tip.emoji}
        </span>
        <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-200">
          Tip #{number}
        </span>
      </div>
      <h3 className="mt-3 text-base font-bold text-white">{tip.title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-gray-300">{tip.desc}</p>
    </div>
  );
}
