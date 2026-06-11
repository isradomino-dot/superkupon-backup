import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SuperKupon",
  description: "Kebijakan privasi SuperKupon. Data apa yang kami kumpulkan, bagaimana kami menggunakannya, dan hak Anda sebagai user.",
};

const LAST_UPDATED = "9 Juni 2026";

interface Section {
  num: string;
  title: string;
  emoji: string;
  content: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    num: "1",
    emoji: "📋",
    title: "Data yang Kami Kumpulkan",
    content: (
      <>
        <p>
          SuperKupon adalah layanan aggregator kupon yang{" "}
          <strong className="text-emerald-300">tidak memerlukan registrasi akun</strong>.
          Kami sangat membatasi data yang dikumpulkan:
        </p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            <strong className="text-white">Data localStorage (di perangkat Anda):</strong>{" "}
            Favorit, preferensi tema, bahasa, history pencarian. Data ini disimpan{" "}
            <strong>HANYA</strong> di browser Anda, tidak terkirim ke server kami.
          </li>
          <li>
            <strong className="text-white">Cookies Teknis:</strong> Cookie sesi sederhana
            untuk fungsi UI (theme dark/light, bahasa). Tidak ada cookie tracking pihak
            ketiga.
          </li>
          <li>
            <strong className="text-white">Analytics Anonim:</strong> Kami pakai Vercel
            Web Analytics untuk mengukur trafik aggregate (jumlah pengunjung per
            halaman) — TIDAK mengidentifikasi individu.
          </li>
          <li>
            <strong className="text-white">Notifikasi Browser:</strong> Jika Anda izinkan
            notifikasi, izin ini disimpan di browser Anda dan dikelola oleh browser —
            kami tidak menyimpan token notifikasi di server.
          </li>
        </ul>
      </>
    ),
  },
  {
    num: "2",
    emoji: "🎯",
    title: "Cara Penggunaan Data",
    content: (
      <>
        <p>Data yang kami akses digunakan secara terbatas untuk:</p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            <strong className="text-white">Personalisasi UI:</strong> Menyimpan
            preferensi tema, bahasa, dan favorit di browser Anda — biar gak perlu set
            ulang tiap kunjungan.
          </li>
          <li>
            <strong className="text-white">Improvement Layanan:</strong> Analytics
            aggregate dipakai untuk tau halaman mana yang paling sering dibuka — biar
            kami bisa fokus polish bagian yg paling dipakai.
          </li>
          <li>
            <strong className="text-white">Fungsionalitas Inti:</strong> Memuat kupon
            dari database, menampilkan rekomendasi, dan menjalankan kalkulasi savings.
          </li>
        </ul>
        <p className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">
          ✅ <strong>Yang TIDAK kami lakukan:</strong> Jual data ke pihak ketiga,
          tracking lintas-website, profil iklan, atau identifikasi individu.
        </p>
      </>
    ),
  },
  {
    num: "3",
    emoji: "🍪",
    title: "Cookies & Storage",
    content: (
      <>
        <p>Kami pakai 3 jenis penyimpanan di browser Anda:</p>
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-bold text-brand-300">📦 localStorage</p>
            <p className="mt-1 text-xs text-gray-300">
              Menyimpan: favorit, theme, bahasa, history. Tidak ada tanggal kedaluwarsa
              (sampai Anda hapus manual).
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-bold text-brand-300">🍪 Cookies</p>
            <p className="mt-1 text-xs text-gray-300">
              Hanya cookie teknis (preferensi bahasa). Tidak ada cookies marketing atau
              third-party tracking.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-bold text-brand-300">📊 Vercel Analytics</p>
            <p className="mt-1 text-xs text-gray-300">
              Anonim, aggregate. Tidak menyimpan IP atau identitas individual.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    num: "4",
    emoji: "👤",
    title: "Hak Anda Sebagai User",
    content: (
      <>
        <p>
          Sesuai dengan{" "}
          <strong className="text-white">UU Perlindungan Data Pribadi (UU PDP) Indonesia</strong>,
          Anda memiliki hak penuh atas data Anda:
        </p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            <strong className="text-white">Hak Akses:</strong> Data Anda ada di
            browser, bukan server kami — Anda bisa akses kapan saja via DevTools (F12 →
            Application → Storage).
          </li>
          <li>
            <strong className="text-white">Hak Hapus:</strong> Clear cookies/cache
            browser, atau pergi ke <code className="rounded bg-white/10 px-1">Settings</code>{" "}
            → <code className="rounded bg-white/10 px-1">Clear site data</code>{" "}
            kapanpun.
          </li>
          <li>
            <strong className="text-white">Hak Portabilitas:</strong> Halaman{" "}
            <Link href="/favorites" className="text-brand-300 hover:underline">
              /favorites
            </Link>{" "}
            punya tombol "Export ke JSON" — download data Anda untuk backup atau pindah
            device.
          </li>
          <li>
            <strong className="text-white">Hak Berhenti:</strong> Tinggal tutup tab/uninstall
            PWA. Tidak ada langganan, tidak ada penagihan.
          </li>
        </ul>
      </>
    ),
  },
  {
    num: "5",
    emoji: "🤝",
    title: "Pihak Ketiga",
    content: (
      <>
        <p>Layanan pihak ketiga yang kami gunakan:</p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            <strong className="text-white">Vercel:</strong> Hosting frontend dan
            analytics aggregate. Vercel privacy policy:{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-300 hover:underline"
            >
              vercel.com/legal/privacy-policy
            </a>
          </li>
          <li>
            <strong className="text-white">Railway:</strong> Hosting backend dan
            database (Postgres). Railway privacy:{" "}
            <a
              href="https://railway.app/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-300 hover:underline"
            >
              railway.app/legal/privacy
            </a>
          </li>
        </ul>
        <p className="mt-3 text-sm">
          Kami{" "}
          <strong className="text-emerald-300">
            tidak menggunakan
          </strong>{" "}
          Google Analytics, Facebook Pixel, atau tracking marketing pihak ketiga
          lainnya.
        </p>
      </>
    ),
  },
  {
    num: "6",
    emoji: "👶",
    title: "Perlindungan Anak",
    content: (
      <>
        <p>
          SuperKupon dapat digunakan oleh siapa saja, termasuk anak-anak di bawah 17
          tahun. Karena kami{" "}
          <strong className="text-emerald-300">tidak mengumpulkan data identitas</strong>
          , tidak ada risiko data anak-anak yang bocor ke server kami.
        </p>
        <p className="mt-3">
          Namun untuk transaksi belanja menggunakan kupon, kami sarankan orang tua
          tetap mendampingi anak-anak agar tidak ada transaksi yang tidak disengaja.
        </p>
      </>
    ),
  },
  {
    num: "7",
    emoji: "🔄",
    title: "Perubahan Kebijakan",
    content: (
      <>
        <p>
          Kebijakan privasi ini bisa berubah seiring waktu (misal: penambahan fitur,
          perubahan layanan pihak ketiga). Versi terbaru selalu tersedia di halaman
          ini, dengan tanggal "Last Updated" di bawah.
        </p>
        <p className="mt-3">
          Perubahan signifikan akan diumumkan di banner home page minimal 7 hari
          sebelum berlaku.
        </p>
      </>
    ),
  },
  {
    num: "8",
    emoji: "📧",
    title: "Kontak",
    content: (
      <>
        <p>
          Punya pertanyaan, request data, atau laporan terkait privasi? Hubungi kami
          via:
        </p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            <strong className="text-white">GitHub Issues:</strong>{" "}
            <a
              href="https://github.com/isradomino-dot/superkupon/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-300 hover:underline"
            >
              github.com/isradomino-dot/superkupon/issues
            </a>{" "}
            (untuk laporan teknis)
          </li>
          <li>
            <strong className="text-white">FAQ:</strong>{" "}
            <Link href="/faq" className="text-brand-300 hover:underline">
              /faq
            </Link>{" "}
            (cek dulu apakah pertanyaan sudah dijawab)
          </li>
        </ul>
      </>
    ),
  },
];

export default function PrivasiPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/15 via-purple-500/5 to-transparent p-6 sm:p-8 animate-slide-up">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-gray-300">
          Cara SuperKupon mengelola data dan privasi Anda. Dokumen ini ditulis dalam
          Bahasa Indonesia yang mudah dipahami — bukan legal jargon yang bikin pusing.
        </p>
        <p className="mt-3 text-xs text-gray-400">
          📅 Last Updated: <span className="text-brand-300">{LAST_UPDATED}</span>
        </p>
      </header>

      {/* TLDR */}
      <section className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-emerald-200">
          ⚡ TL;DR — Ringkasan 30 Detik
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm text-emerald-100/90">
          <li>✅ Tidak ada login wajib — gak ada akun di server kami</li>
          <li>✅ Data tersimpan di browser Anda (localStorage) — bukan server</li>
          <li>✅ Tidak ada Google Analytics / Facebook Pixel tracking</li>
          <li>✅ Tidak menjual data ke pihak ketiga (ever)</li>
          <li>✅ Mengikuti UU PDP Indonesia (Perlindungan Data Pribadi)</li>
        </ul>
      </section>

      {/* Sections */}
      {SECTIONS.map((s) => (
        <section
          key={s.num}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6"
        >
          <h2 className="flex items-center gap-3 text-xl font-bold text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-black text-white">
              {s.num}
            </span>
            <span className="text-2xl">{s.emoji}</span>
            {s.title}
          </h2>
          <div className="mt-4 text-sm leading-relaxed text-gray-300">
            {s.content}
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="rounded-2xl border border-brand-400/30 bg-brand-500/10 p-6 text-center">
        <h2 className="text-base font-bold text-white">
          Punya pertanyaan privasi spesifik?
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          Cek FAQ atau hubungi kami via GitHub Issues.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/faq"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            ❓ FAQ
          </Link>
          <Link
            href="/syarat"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            📜 Syarat & Ketentuan
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
