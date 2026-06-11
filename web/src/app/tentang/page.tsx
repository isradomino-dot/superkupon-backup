import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tentang Kami — SuperKupon",
  description: "SuperKupon adalah aggregator kupon digital Indonesia. Update otomatis tiap jam dari Shopee, Tokopedia, OVO, dan 22+ merchant lainnya.",
};

export default function TentangPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <header className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/20 via-purple-500/10 to-transparent p-8 text-center animate-slide-up">
        <div className="text-5xl">🎟️</div>
        <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">
          Tentang SuperKupon
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-gray-300">
          Aggregator kupon digital Indonesia. Satu tempat untuk semua promo terbaik
          dari Shopee, Tokopedia, OVO, DANA, Gojek, dan 22+ merchant lainnya.
        </p>
      </header>

      {/* Mission */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
          <span className="text-3xl">🎯</span> Misi Kami
        </h2>
        <p className="mt-4 text-base leading-relaxed text-gray-300">
          Kami percaya semua orang Indonesia berhak dapat akses ke kupon dan promo
          terbaik tanpa harus buka 10+ aplikasi atau website tiap hari.
        </p>
        <p className="mt-3 text-base leading-relaxed text-gray-300">
          SuperKupon dibuat untuk{" "}
          <span className="font-semibold text-brand-300">
            menyatukan, memvalidasi, dan menyajikan kupon
          </span>{" "}
          dari berbagai sumber dalam satu interface yang simple dan cepat — bahkan
          buat kamu yang baru pertama kali pakai aplikasi belanja online.
        </p>
      </section>

      {/* How it works */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
          <span className="text-3xl">⚙️</span> Bagaimana Cara Kerjanya?
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              num: 1,
              emoji: "🤖",
              title: "Scraper Otomatis",
              desc: "Sistem kami scan halaman promo publik resmi merchant tiap 30 menit untuk update kupon terbaru.",
            },
            {
              num: 2,
              emoji: "✅",
              title: "Validasi Kualitas",
              desc: "Tiap kupon diberi quality score 0-100 berdasarkan kelengkapan info, jenis diskon, dan urgency.",
            },
            {
              num: 3,
              emoji: "🎁",
              title: "Disajikan ke Kamu",
              desc: "Kupon yang valid + aktif kami sajikan dengan filter, search, kalkulator, dan tools decision-making.",
            },
          ].map((s) => (
            <div
              key={s.num}
              className="rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-base font-black text-white">
                  {s.num}
                </div>
                <span className="text-3xl">{s.emoji}</span>
              </div>
              <h3 className="mt-3 text-base font-bold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 to-transparent p-6 sm:p-8">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
          <span className="text-3xl">📊</span> SuperKupon by the Numbers
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: "22+", label: "Merchant Partner" },
            { value: "100+", label: "Kupon Aktif" },
            { value: "6", label: "Kategori" },
            { value: "30m", label: "Update Tiap" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"
            >
              <div className="font-mono text-2xl font-black text-emerald-300 sm:text-3xl">
                {s.value}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/stats"
          className="mt-4 inline-block text-xs font-semibold text-emerald-300 hover:underline"
        >
          → Lihat statistik lengkap
        </Link>
      </section>

      {/* Tech stack */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
          <span className="text-3xl">🛠️</span> Tech Stack
        </h2>
        <p className="mt-3 text-sm text-gray-400">
          Dibangun dengan teknologi modern untuk performa dan keandalan maksimal:
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { tier: "Frontend", stack: "Next.js 16, React 19, TypeScript, Tailwind CSS" },
            { tier: "Backend", stack: "FastAPI (Python), SQLAlchemy, APScheduler" },
            { tier: "Database", stack: "PostgreSQL + pg_trgm (fuzzy search)" },
            { tier: "Hosting", stack: "Vercel (frontend) + Railway (backend & DB)" },
          ].map((t) => (
            <div
              key={t.tier}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-300">
                {t.tier}
              </p>
              <p className="mt-1 text-sm text-gray-200">{t.stack}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Important note */}
      <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6">
        <h2 className="flex items-center gap-3 text-lg font-bold text-amber-200">
          <span className="text-2xl">⚠️</span> Disclaimer Penting
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-amber-100/80">
          <li>
            • Kupon di-aggregate dari halaman promo publik & channel resmi merchant.
            Kami{" "}
            <span className="font-semibold">tidak menerbitkan kupon sendiri</span>.
          </li>
          <li>
            • Validitas kupon dapat berubah sewaktu-waktu oleh merchant. Selalu cek
            ulang di merchant asli sebelum digunakan.
          </li>
          <li>
            • SuperKupon{" "}
            <span className="font-semibold">tidak bertanggung jawab</span> atas kupon
            yang sudah expired, dihapus, atau berubah syarat.
          </li>
          <li>
            • Logo dan trademark merchant adalah milik masing-masing perusahaan.
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/15 to-transparent p-6 text-center">
        <h2 className="text-xl font-bold text-white">Mau cek halaman lain?</h2>
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
