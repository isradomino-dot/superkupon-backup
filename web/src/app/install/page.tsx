import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install di HP — SuperKupon",
  description: "Tutorial install SuperKupon sebagai aplikasi di HP (Android, iPhone) dan Desktop. Akses lebih cepat + offline support.",
};

interface Browser {
  id: string;
  name: string;
  emoji: string;
  platform: string;
  color: string;
  steps: { num: number; text: string; tip?: string }[];
}

const BROWSERS: Browser[] = [
  {
    id: "chrome-android",
    name: "Chrome",
    emoji: "📱",
    platform: "Android",
    color: "from-emerald-500/30 to-teal-500/15 border-emerald-400/40",
    steps: [
      { num: 1, text: "Buka superkupon.vercel.app di Chrome HP-mu" },
      { num: 2, text: "Tap tombol ⋮ (titik tiga) di pojok kanan atas" },
      { num: 3, text: 'Pilih "Install app" atau "Add to Home Screen"', tip: "Kalau opsi ini gak muncul, scroll ke menu setting Chrome → Site permissions → Add to Home screen" },
      { num: 4, text: "Tap Install / Tambahkan di popup" },
      { num: 5, text: "Done! Icon SuperKupon muncul di home screen HP-mu", tip: "Buka icon-nya — keliatan kayak aplikasi biasa (no browser UI)" },
    ],
  },
  {
    id: "safari-ios",
    name: "Safari",
    emoji: "🍎",
    platform: "iPhone / iPad",
    color: "from-sky-500/30 to-blue-500/15 border-sky-400/40",
    steps: [
      { num: 1, text: "Buka superkupon.vercel.app di Safari" },
      { num: 2, text: "Tap tombol Share 􀈂 di toolbar bawah (icon kotak dengan panah atas)" },
      { num: 3, text: 'Scroll ke bawah → tap "Add to Home Screen"' },
      { num: 4, text: 'Edit nama icon kalo mau, lalu tap "Add" di kanan atas' },
      { num: 5, text: "Icon SuperKupon muncul di home screen", tip: "iOS treat PWA seperti app biasa — bisa fullscreen tanpa browser UI" },
    ],
  },
  {
    id: "chrome-desktop",
    name: "Chrome",
    emoji: "💻",
    platform: "Desktop (Windows/Mac/Linux)",
    color: "from-purple-500/30 to-violet-500/15 border-purple-400/40",
    steps: [
      { num: 1, text: "Buka superkupon.vercel.app di Chrome desktop" },
      { num: 2, text: "Lihat URL bar di kanan, ada icon install 📥 (kotak dengan panah)", tip: "Kalau gak muncul, klik ⋮ → Save and share → Install SuperKupon" },
      { num: 3, text: "Klik icon install / pilih dari menu" },
      { num: 4, text: 'Klik "Install" di popup konfirmasi' },
      { num: 5, text: "SuperKupon kebuka sebagai standalone app window", tip: "Pin ke taskbar (klik kanan icon di taskbar → Pin)" },
    ],
  },
  {
    id: "edge-desktop",
    name: "Edge",
    emoji: "🔷",
    platform: "Windows (Built-in)",
    color: "from-cyan-500/30 to-blue-500/15 border-cyan-400/40",
    steps: [
      { num: 1, text: "Buka superkupon.vercel.app di Edge" },
      { num: 2, text: "Klik ⋯ (titik tiga) di pojok kanan atas" },
      { num: 3, text: 'Pilih "Apps" → "Install this site as an app"' },
      { num: 4, text: "Beri nama (default: SuperKupon) → klik Install" },
      { num: 5, text: "Bisa pinned ke Start menu atau taskbar otomatis" },
    ],
  },
];

const BENEFITS = [
  { emoji: "⚡", title: "Akses Lebih Cepat", desc: "1 tap dari home screen, gak perlu ketik URL tiap kali" },
  { emoji: "📲", title: "Tampak Kayak App Native", desc: "Fullscreen tanpa browser UI, look & feel kayak aplikasi biasa" },
  { emoji: "💾", title: "Akses Offline", desc: "Halaman yang udah dibuka tetap bisa diakses tanpa internet (service worker)" },
  { emoji: "🔔", title: "Push Notifications", desc: "Bisa nerima notifikasi (kalo diaktifkan)" },
  { emoji: "🎯", title: "Lightweight", desc: "Cuma ~2MB storage, gak makan space kayak app native" },
  { emoji: "🔄", title: "Auto-Update", desc: "Selalu versi terbaru, gak perlu update manual" },
];

export default function InstallPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/20 via-purple-500/10 to-transparent p-6 sm:p-8 animate-slide-up">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <span className="text-4xl">📱</span>
          Install di HP
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          SuperKupon adalah{" "}
          <strong className="text-brand-300">Progressive Web App (PWA)</strong> — bisa
          install di HP/Desktop layaknya aplikasi native. Akses lebih cepat, support
          offline, dan terasa kayak app beneran.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
            ✅ 100% Free
          </span>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
            ✅ No App Store
          </span>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
            ✅ ~2MB Only
          </span>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
            ✅ Auto-Update
          </span>
        </div>
      </header>

      {/* Benefits */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <h2 className="text-base font-bold text-white">
          🌟 Kenapa Install sebagai App?
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="text-2xl">{b.emoji}</div>
              <p className="mt-2 text-sm font-bold text-white">{b.title}</p>
              <p className="mt-1 text-xs text-gray-400">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Per-browser tutorials */}
      <section>
        <h2 className="mb-3 text-base font-bold text-white">
          📋 Tutorial per Browser
        </h2>
        <p className="mb-4 text-sm text-gray-400">
          Pilih browser & platform yang kamu pakai:
        </p>
        <div className="space-y-3">
          {BROWSERS.map((browser) => (
            <details
              key={browser.id}
              className={[
                "overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition",
                browser.color,
              ].join(" ")}
            >
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{browser.emoji}</span>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {browser.name}
                      </h3>
                      <p className="text-xs text-white/70">{browser.platform}</p>
                    </div>
                  </div>
                  <span className="text-white/60">▼ Buka tutorial</span>
                </div>
              </summary>

              <div className="mt-4 border-t border-white/10 pt-4">
                <ol className="space-y-3">
                  {browser.steps.map((step) => (
                    <li key={step.num} className="flex gap-3">
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">
                        {step.num}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-white">{step.text}</p>
                        {step.tip && (
                          <p className="mt-1 rounded-md bg-amber-500/10 p-2 text-[11px] text-amber-200">
                            💡 {step.tip}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Troubleshoot */}
      <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-amber-200">
          🔧 Troubleshoot
        </h2>
        <details className="mt-3 cursor-pointer">
          <summary className="text-sm font-semibold text-amber-200 hover:underline">
            ❓ Tombol install gak muncul
          </summary>
          <p className="mt-2 text-xs text-amber-100/90">
            PWA butuh syarat: HTTPS (✅ kita pakai), service worker (✅ kita pakai), dan
            manifest (✅ kita pakai). Kalo tombol install gak muncul, browser-mu mungkin
            cache lama. Coba: clear cache → reload page → cek menu install lagi.
          </p>
        </details>
        <details className="mt-3 cursor-pointer">
          <summary className="text-sm font-semibold text-amber-200 hover:underline">
            ❓ Apakah aman?
          </summary>
          <p className="mt-2 text-xs text-amber-100/90">
            100% aman. PWA jalan di sandbox browser, gak punya akses sistem (unlike
            native app yang minta permission lokasi/kamera/dll). Data semua tersimpan
            di browser kamu, bukan device storage native.
          </p>
        </details>
        <details className="mt-3 cursor-pointer">
          <summary className="text-sm font-semibold text-amber-200 hover:underline">
            ❓ Cara uninstall?
          </summary>
          <p className="mt-2 text-xs text-amber-100/90">
            Sama kayak app biasa — tap & hold icon → Uninstall/Remove. Atau dari
            browser: Settings → Site Settings → SuperKupon → Remove.
          </p>
        </details>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/15 to-transparent p-6 text-center">
        <h2 className="text-base font-bold text-white">
          🚀 Setelah Install, Coba Fitur Ini:
        </h2>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/decide"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            🎯 Smart Pick
          </Link>
          <Link
            href="/mood"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            🎨 Mood Picker
          </Link>
          <Link
            href="/pilihan"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            💡 Pilihan Hari Ini
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
