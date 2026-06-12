import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";

import { I18nProvider } from "@/i18n/provider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { NotificationProvider } from "@/lib/use-notifications";
import { FavoritesProvider } from "@/lib/use-favorites";
import { FavoritesLink } from "@/components/FavoritesLink";
import { HistoryProvider } from "@/lib/use-history";
import { OnboardingTour } from "@/components/OnboardingTour";
import { StreakProvider } from "@/lib/use-streak";
import { StreakIndicator } from "@/components/StreakIndicator";
import { StreakMilestoneModal } from "@/components/StreakMilestoneModal";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { FavoriteExpiryWatcher } from "@/components/FavoriteExpiryWatcher";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { AskSuperKupon } from "@/components/AskSuperKupon";
import { BackgroundEffect } from "@/components/BackgroundEffect";
import { Sidebar } from "@/components/Sidebar";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://superkupon.vercel.app"),
  title: {
    default: "SuperKupon — Aggregator Kupon Digital Indonesia",
    template: "%s | SuperKupon",
  },
  description:
    "Kupon digital terbaru dari Shopee, DANA, OVO, Tix ID, Tokopedia, Traveloka, dll dalam satu aplikasi. Update otomatis tiap jam.",
  keywords: [
    "kupon", "promo", "diskon", "voucher", "kupon digital", "shopee", "tokopedia",
    "ovo", "dana", "gojek", "grab", "traveloka", "klook", "blibli", "lazada", "indonesia",
  ],
  authors: [{ name: "SuperKupon" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "SuperKupon",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://superkupon.vercel.app",
    title: "SuperKupon — Aggregator Kupon Digital Indonesia",
    description:
      "159+ kupon aktif dari 22 merchant Indonesia. Update otomatis. 100% gratis.",
    siteName: "SuperKupon",
  },
  twitter: {
    card: "summary_large_image",
    title: "SuperKupon — Aggregator Kupon Digital",
    description: "159+ kupon aktif dari 22 merchant Indonesia. Update otomatis.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f97316" },
    { media: "(prefers-color-scheme: dark)", color: "#9a3412" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('kh_theme') || 'dark';
                  var isDark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
                  document.documentElement.classList.add('dark');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <BackgroundEffect />
        <I18nProvider>
          <HistoryProvider>
          <StreakProvider>
          <FavoritesProvider>
          <NotificationProvider>
            <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
              <div className="container-app flex h-14 items-center justify-between gap-3">
                <Link
                  href="/"
                  className="flex items-center gap-2 font-bold text-brand-600 dark:text-brand-400"
                >
                  <span className="inline-block h-6 w-6 rounded-md bg-brand-500" aria-hidden />
                  SuperKupon
                </Link>
                <div className="flex items-center gap-2">
                  <StreakIndicator />
                  <FavoritesLink />
                  <NotificationCenter />
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>
            </header>

            <Sidebar />

            <main className="mx-auto max-w-5xl px-4 py-6 animate-fade-in lg:mx-0 lg:ml-60 lg:max-w-none lg:px-8 xl:px-10 2xl:max-w-[1600px] 2xl:pr-12">{children}</main>

            <Footer />
            <OnboardingTour />
            <StreakMilestoneModal />
            <ServiceWorkerRegistrar />
            <FavoriteExpiryWatcher />
            <PWAInstallBanner />
            <ScrollToTopButton />
            <AskSuperKupon />
            <Analytics />
          </NotificationProvider>
          </FavoritesProvider>
          </StreakProvider>
          </HistoryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="container-app py-6 text-xs text-gray-500 dark:text-gray-400">
        <p>
          Kupon di-aggregate dari halaman promo publik & channel resmi merchant. Validitas
          dapat berubah sewaktu-waktu — cek di merchant asli sebelum digunakan.
        </p>

        {/* Quick nav links */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href="/pilihan"
            className="opacity-70 hover:text-brand-500 hover:underline dark:hover:text-brand-400"
          >
            💡 Pilihan Hari Ini
          </Link>
          <span className="opacity-40">·</span>
          <Link
            href="/belanja-hemat"
            className="opacity-70 hover:text-brand-500 hover:underline dark:hover:text-brand-400"
          >
            🎉 Belanja Hemat
          </Link>
          <span className="opacity-40">·</span>
          <Link
            href="/mood"
            className="opacity-70 hover:text-brand-500 hover:underline dark:hover:text-brand-400"
          >
            🎨 Mood Picker
          </Link>
        </div>

        {/* Legal / info links */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-200/30 pt-3 dark:border-gray-800/50">
          <span className="opacity-60">© 2026 SuperKupon</span>
          <span className="opacity-40">·</span>
          <Link
            href="/tentang"
            className="opacity-70 hover:text-brand-500 hover:underline dark:hover:text-brand-400"
          >
            📋 Tentang Kami
          </Link>
          <span className="opacity-40">·</span>
          <Link
            href="/faq"
            className="opacity-70 hover:text-brand-500 hover:underline dark:hover:text-brand-400"
          >
            ❓ FAQ
          </Link>
          <span className="opacity-40">·</span>
          <Link
            href="/privasi"
            className="opacity-70 hover:text-brand-500 hover:underline dark:hover:text-brand-400"
          >
            🔒 Privacy
          </Link>
          <span className="opacity-40">·</span>
          <Link
            href="/syarat"
            className="opacity-70 hover:text-brand-500 hover:underline dark:hover:text-brand-400"
          >
            📜 Syarat
          </Link>
        </div>
      </div>
    </footer>
  );
}
