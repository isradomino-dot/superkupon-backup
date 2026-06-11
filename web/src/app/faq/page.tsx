"use client";

import Link from "next/link";
import { useState } from "react";

interface FAQItem {
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  // === UMUM ===
  {
    category: "Umum",
    question: "Apa itu SuperKupon?",
    answer:
      "SuperKupon adalah aggregator kupon digital Indonesia. Kami mengumpulkan kupon promo dari Shopee, Tokopedia, OVO, DANA, dan 22+ merchant lainnya ke satu tempat — jadi kamu gak perlu buka 10+ aplikasi tiap mau belanja.",
  },
  {
    category: "Umum",
    question: "Apakah SuperKupon gratis?",
    answer:
      "Ya, 100% gratis. Tidak ada biaya berlangganan, tidak ada login wajib, dan semua fitur (Smart Pick, Kombo Kupon, Tanya Bot, dll) bisa dipakai langsung tanpa daftar akun.",
  },
  {
    category: "Umum",
    question: "Apakah kupon di SuperKupon asli?",
    answer:
      "Ya, semua kupon di-aggregate dari halaman promo publik resmi merchant (bukan dari sumber tidak terpercaya). Tapi validitas kupon dapat berubah sewaktu-waktu oleh merchant — selalu cek ulang sebelum digunakan.",
  },

  // === PENGGUNAAN ===
  {
    category: "Penggunaan",
    question: "Bagaimana cara pakai kupon dari SuperKupon?",
    answer:
      "Sangat mudah: (1) Cari kupon yang cocok dari Smart Pick, Pilihan Hari Ini, atau search. (2) Klik kupon untuk lihat detail. (3) Klik tombol 'Salin Kode' — kode akan masuk clipboard otomatis. (4) Buka aplikasi merchant (Shopee, Tokopedia, dll), tambah barang ke keranjang, paste kode di kolom voucher/promo saat checkout.",
  },
  {
    category: "Penggunaan",
    question: "Fitur apa yang paling berguna?",
    answer:
      "Tergantung kebutuhan: 🎯 Smart Pick — kalau punya nominal belanja & mau hemat maksimal. 🎁 Kombo Kupon — kalau mau stack 2-3 kupon barengan. 💡 Pilihan Hari Ini — kalau bingung mau pakai apa, auto-curated. 🎨 Mood Picker — kalau mau belanja sesuai mood. 🤖 Tanya SuperKupon Bot — kalau mau search natural language.",
  },
  {
    category: "Penggunaan",
    question: "Kenapa kupon yang saya save hilang?",
    answer:
      "Favorit disimpan di localStorage browser kamu (per device, per browser). Kalau kamu clear cookies/cache atau ganti browser, favorit akan hilang. Untuk sync lintas device, kamu bisa export favorit ke JSON file (di halaman /favorites).",
  },
  {
    category: "Penggunaan",
    question: "Bisa dipakai di HP?",
    answer:
      "Bisa! SuperKupon adalah Progressive Web App (PWA). Kamu bisa install ke HP layaknya aplikasi native: buka di browser HP → klik menu (titik tiga) → 'Install app' atau 'Add to Home Screen'.",
  },

  // === TEKNIS ===
  {
    category: "Teknis",
    question: "Seberapa sering kupon di-update?",
    answer:
      "Scraper otomatis kami scan halaman promo merchant tiap 30 menit. Jadi kupon baru biasanya muncul di SuperKupon dalam 30 menit setelah merchant publish-nya. Cek halaman Statistik untuk lihat 'Kupon Baru 24 Jam' real-time.",
  },
  {
    category: "Teknis",
    question: "Apakah ada bot untuk Telegram/WhatsApp?",
    answer:
      "Belum ada — saat ini fokus di web app. Tapi kamu bisa pakai 'Tanya SuperKupon Bot' (floating button 🤖 di pojok kanan bawah) yang punya fungsi serupa chatbot di web.",
  },
  {
    category: "Teknis",
    question: "Bagaimana cara melaporkan bug atau kupon yang expired?",
    answer:
      "Untuk laporan kupon expired, klik tombol 'Lapor Expired' di halaman detail kupon (per kupon ada button verify). Untuk bug umum, kirim email ke tim kami (lihat halaman Tentang Kami).",
  },

  // === PRIVASI ===
  {
    category: "Privasi",
    question: "Data saya disimpan di mana?",
    answer:
      "Karena kami gak pakai sistem login, kamu gak punya akun di server kami. Data preferensi (favorit, theme, bahasa) disimpan di localStorage browser kamu — bukan di server kami. Cek halaman Privasi untuk detail.",
  },
  {
    category: "Privasi",
    question: "Apakah ada tracking?",
    answer:
      "Kami pakai Vercel Web Analytics untuk track page view aggregate (jumlah visit per halaman) — bukan tracking individual user. Tidak ada cookies tracking pihak ketiga (Facebook, Google Ads, dll).",
  },

  // === KEMITRAAN ===
  {
    category: "Kemitraan",
    question: "Apakah SuperKupon partner resmi merchant?",
    answer:
      "Tidak — SuperKupon adalah aggregator independent. Kami tidak punya hubungan formal dengan Shopee, Tokopedia, OVO, dll. Kupon yg ditampilkan diambil dari halaman promo PUBLIK yang terbuka untuk semua orang.",
  },
  {
    category: "Kemitraan",
    question: "Saya merchant, bisa kerja sama?",
    answer:
      "Bisa! Kalau kamu representative merchant dan mau diundang sebagai partner resmi (highlighted spotlight, custom branding, exclusive coupons), kirim email ke tim kami. Lihat halaman Tentang Kami untuk kontak.",
  },
];

const CATEGORIES = ["Semua", "Umum", "Penggunaan", "Teknis", "Privasi", "Kemitraan"];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = FAQ_DATA.filter((item) => {
    const matchesCategory =
      activeCategory === "Semua" || item.category === activeCategory;
    const matchesSearch =
      !search ||
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <header className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/20 via-purple-500/10 to-transparent p-8 text-center animate-slide-up">
        <div className="text-5xl">❓</div>
        <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">
          FAQ — Pertanyaan Sering Diajukan
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-300">
          Cari jawaban dari{" "}
          <span className="font-semibold text-brand-300">{FAQ_DATA.length} pertanyaan</span>{" "}
          umum tentang SuperKupon — penggunaan, teknis, privasi, dan kemitraan.
        </p>
      </header>

      {/* Search */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
          🔍 Cari pertanyaan
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Misal: 'cara pakai kupon', 'privasi', 'gratis'..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand-400 focus:outline-none"
        />
      </section>

      {/* Category filter */}
      <section className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              activeCategory === cat
                ? "border-brand-400 bg-brand-500/20 text-brand-200"
                : "border-white/10 bg-white/5 text-gray-300 hover:border-brand-400/50",
            ].join(" ")}
          >
            {cat}
            {cat !== "Semua" && (
              <span className="ml-1 text-[10px] text-gray-500">
                ({FAQ_DATA.filter((i) => i.category === cat).length})
              </span>
            )}
          </button>
        ))}
      </section>

      {/* FAQ Items */}
      <section className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <div className="text-4xl">🤷</div>
            <p className="mt-3 text-base font-semibold text-gray-200">
              Gak ada pertanyaan yang cocok
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Coba kata kunci lain atau pilih kategori "Semua"
            </p>
          </div>
        ) : (
          filtered.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={[
                  "overflow-hidden rounded-xl border transition-all",
                  isOpen
                    ? "border-brand-400/40 bg-brand-500/5"
                    : "border-white/10 bg-white/5 hover:border-white/20",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        isOpen
                          ? "bg-brand-500/30 text-brand-200"
                          : "bg-white/10 text-gray-400",
                      ].join(" ")}
                    >
                      {item.category}
                    </span>
                  </div>
                  <span className="ml-auto text-sm text-brand-300">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                <div className="px-4 pb-1">
                  <h3 className="text-sm font-bold text-white sm:text-base">
                    {item.question}
                  </h3>
                </div>
                {isOpen && (
                  <div className="border-t border-white/5 px-4 py-3 animate-slide-up">
                    <p className="text-sm leading-relaxed text-gray-300">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Still have questions */}
      <section className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-6 text-center">
        <h2 className="text-lg font-bold text-white">
          🤝 Masih ada pertanyaan?
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          Coba tanya ke{" "}
          <span className="font-semibold text-emerald-300">
            🤖 Tanya SuperKupon Bot
          </span>{" "}
          (floating button di pojok kanan bawah) — bisa jawab natural language!
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/tentang"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            ← Tentang Kami
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
          >
            🏠 Beranda
          </Link>
        </div>
      </section>
    </div>
  );
}
