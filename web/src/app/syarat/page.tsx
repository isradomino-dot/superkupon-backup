import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — SuperKupon",
  description: "Syarat dan ketentuan penggunaan layanan SuperKupon. Aturan penggunaan, batasan tanggung jawab, dan hak kekayaan intelektual.",
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
    emoji: "✅",
    title: "Penerimaan Syarat",
    content: (
      <>
        <p>
          Dengan mengakses dan menggunakan SuperKupon (selanjutnya disebut "Layanan"),
          Anda dianggap setuju dan terikat dengan syarat dan ketentuan ini.
        </p>
        <p className="mt-3">
          Jika Anda tidak setuju dengan salah satu syarat di bawah, mohon{" "}
          <strong className="text-amber-300">tidak menggunakan</strong> Layanan kami.
        </p>
      </>
    ),
  },
  {
    num: "2",
    emoji: "🎯",
    title: "Tujuan Layanan",
    content: (
      <>
        <p>
          SuperKupon adalah layanan{" "}
          <strong className="text-white">aggregator kupon digital</strong> — kami
          menyatukan kupon dan promo dari berbagai merchant Indonesia ke satu tempat.
        </p>
        <p className="mt-3">Kami menyediakan informasi tentang:</p>
        <ul className="ml-6 mt-2 list-disc space-y-1">
          <li>Kupon promo digital dari berbagai merchant</li>
          <li>Kalkulator hematan dan rekomendasi</li>
          <li>Tools decision-making (Smart Pick, Kombo, Mood Picker, dll)</li>
          <li>Educational content (Tips, FAQ)</li>
        </ul>
        <p className="mt-3">
          Kami{" "}
          <strong className="text-rose-300">BUKAN</strong> penerbit kupon — kami hanya
          mengumpulkan dari sumber publik resmi merchant.
        </p>
      </>
    ),
  },
  {
    num: "3",
    emoji: "👤",
    title: "Penggunaan yang Diizinkan",
    content: (
      <>
        <p>Anda dapat menggunakan Layanan untuk:</p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>Mencari dan melihat kupon untuk penggunaan pribadi</li>
          <li>
            Berbagi kupon ke teman/keluarga via tombol Share di halaman Belanja Hemat
          </li>
          <li>Menggunakan tools rekomendasi untuk kebutuhan belanja pribadi</li>
          <li>
            Save favorit untuk akses cepat (tersimpan di browser Anda sendiri)
          </li>
          <li>
            Install sebagai PWA di HP/desktop Anda
          </li>
        </ul>
      </>
    ),
  },
  {
    num: "4",
    emoji: "🚫",
    title: "Penggunaan yang Dilarang",
    content: (
      <>
        <p>Anda DILARANG melakukan hal berikut saat menggunakan Layanan:</p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            <strong className="text-rose-300">Scraping/crawling otomatis</strong> di
            luar penggunaan normal browser (rate limit dan IP block berlaku)
          </li>
          <li>
            <strong className="text-rose-300">Reverse engineering</strong> backend API
            untuk redistribusi data
          </li>
          <li>
            <strong className="text-rose-300">Mengklaim ownership</strong> atas data
            kupon yang kami sajikan (data milik merchant masing-masing)
          </li>
          <li>
            <strong className="text-rose-300">Spam atau abuse</strong> notifikasi
            browser, email, atau form input
          </li>
          <li>
            <strong className="text-rose-300">Modifikasi konten</strong> untuk tujuan
            menyesatkan user lain
          </li>
          <li>
            <strong className="text-rose-300">Penggunaan komersial massal</strong>{" "}
            (resale kode, marketplace voucher) tanpa izin tertulis
          </li>
        </ul>
      </>
    ),
  },
  {
    num: "5",
    emoji: "⚖️",
    title: "Disclaimer & Batasan Tanggung Jawab",
    content: (
      <>
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4">
          <p className="font-bold text-amber-200">⚠️ PENTING — Mohon Dibaca</p>
        </div>
        <p className="mt-3">
          Layanan disediakan "AS IS" (apa adanya) dan "AS AVAILABLE" (sebagaimana
          tersedia). Kami{" "}
          <strong className="text-white">
            tidak memberikan garansi
          </strong>{" "}
          atas:
        </p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            <strong className="text-white">Validitas kupon</strong> — Kupon dapat
            expired, dihapus, atau berubah syarat sewaktu-waktu oleh merchant. Selalu
            cek ulang di merchant asli.
          </li>
          <li>
            <strong className="text-white">Akurasi informasi</strong> — Detail kupon
            (diskon, min belanja, expiry) di-scrape otomatis dan mungkin tidak update
            real-time.
          </li>
          <li>
            <strong className="text-white">Ketersediaan layanan</strong> — Layanan
            dapat mengalami downtime, maintenance, atau perubahan tanpa pemberitahuan.
          </li>
          <li>
            <strong className="text-white">Hasil transaksi</strong> — Kami tidak
            bertanggung jawab atas kerugian, penolakan kupon, atau masalah transaksi
            di merchant asli.
          </li>
        </ul>
        <p className="mt-3 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">
          🔴 SuperKupon tidak bertanggung jawab atas kerugian langsung maupun tidak
          langsung yang timbul dari penggunaan informasi di Layanan ini.
        </p>
      </>
    ),
  },
  {
    num: "6",
    emoji: "©️",
    title: "Hak Kekayaan Intelektual",
    content: (
      <>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong className="text-white">Logo & Brand Merchant:</strong> Trademark
            dan logo merchant (Shopee, Tokopedia, OVO, dll) adalah milik perusahaan
            masing-masing. Kami menggunakan untuk tujuan identifikasi sesuai{" "}
            <em>fair use</em>.
          </li>
          <li>
            <strong className="text-white">Konten Kupon:</strong> Teks promo, kode,
            dan deskripsi adalah milik merchant — kami hanya mengaggregate.
          </li>
          <li>
            <strong className="text-white">Source Code SuperKupon:</strong> Code
            project ada di{" "}
            <a
              href="https://github.com/isradomino-dot/superkupon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-300 hover:underline"
            >
              GitHub
            </a>{" "}
            (private repository).
          </li>
          <li>
            <strong className="text-white">Design & UX:</strong> Layout, animasi,
            ikon, dan implementasi UI adalah karya original SuperKupon.
          </li>
        </ul>
      </>
    ),
  },
  {
    num: "7",
    emoji: "🔗",
    title: "Link & Layanan Pihak Ketiga",
    content: (
      <>
        <p>
          Layanan kami berisi link keluar ke website/aplikasi merchant (Shopee,
          Tokopedia, dll). Kami{" "}
          <strong className="text-white">tidak bertanggung jawab</strong> atas:
        </p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>Konten yang ada di website merchant tersebut</li>
          <li>Kebijakan privasi mereka</li>
          <li>Transaksi yang Anda lakukan dengan mereka</li>
          <li>Perubahan promo atau kupon di sisi mereka</li>
        </ul>
      </>
    ),
  },
  {
    num: "8",
    emoji: "🔄",
    title: "Perubahan Syarat",
    content: (
      <>
        <p>
          Kami berhak mengubah syarat dan ketentuan ini sewaktu-waktu. Perubahan akan
          berlaku setelah dipublikasikan di halaman ini.
        </p>
        <p className="mt-3">
          Untuk perubahan signifikan, kami akan menampilkan banner notifikasi di home
          page minimal{" "}
          <strong className="text-brand-300">7 hari</strong> sebelum perubahan berlaku.
        </p>
        <p className="mt-3 text-xs text-gray-400">
          Versi terbaru selalu tersedia di halaman ini. Cek tanggal "Last Updated" di
          atas.
        </p>
      </>
    ),
  },
  {
    num: "9",
    emoji: "⚖️",
    title: "Hukum yang Berlaku",
    content: (
      <>
        <p>
          Syarat dan ketentuan ini diatur oleh{" "}
          <strong className="text-white">Hukum Republik Indonesia</strong>. Setiap
          perselisihan akan diselesaikan melalui:
        </p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            <strong className="text-white">Negosiasi langsung</strong> via GitHub
            Issues atau email
          </li>
          <li>
            <strong className="text-white">Mediasi</strong> jika negosiasi tidak
            berhasil
          </li>
          <li>
            <strong className="text-white">Pengadilan</strong> di yurisdiksi Indonesia
            sebagai pilihan terakhir
          </li>
        </ul>
      </>
    ),
  },
  {
    num: "10",
    emoji: "📧",
    title: "Kontak",
    content: (
      <>
        <p>Punya pertanyaan, keluhan, atau request terkait Syarat & Ketentuan?</p>
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
            </a>
          </li>
          <li>
            <strong className="text-white">FAQ:</strong>{" "}
            <Link href="/faq" className="text-brand-300 hover:underline">
              /faq
            </Link>
          </li>
        </ul>
      </>
    ),
  },
];

export default function SyaratPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/15 via-purple-500/5 to-transparent p-6 sm:p-8 animate-slide-up">
        <div className="text-5xl">📜</div>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
          Syarat & Ketentuan
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-gray-300">
          Aturan main penggunaan SuperKupon. Dokumen ini ditulis dalam Bahasa
          Indonesia yang mudah dipahami, bukan legal jargon yang njelimet.
        </p>
        <p className="mt-3 text-xs text-gray-400">
          📅 Last Updated: <span className="text-brand-300">{LAST_UPDATED}</span>
        </p>
      </header>

      {/* TLDR */}
      <section className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-amber-200">
          ⚡ TL;DR — Intinya
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm text-amber-100/90">
          <li>✅ Pakai SuperKupon untuk kebutuhan pribadi — boleh</li>
          <li>✅ Share kupon ke teman/keluarga — boleh</li>
          <li>❌ Scraping massal API kami — tidak boleh (auto-blocked)</li>
          <li>❌ Resale kupon untuk komersial massal — perlu izin</li>
          <li>⚠️ Validitas kupon kewenangan merchant — selalu cek ulang</li>
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
          Masih ada yang gak jelas?
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
            href="/privasi"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            🔒 Privacy Policy
          </Link>
          <Link
            href="/tentang"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            📋 Tentang Kami
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
