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
import { HistoryLink } from "@/components/HistoryLink";
import { OnboardingTour } from "@/components/OnboardingTour";
import { StreakProvider } from "@/lib/use-streak";
import { StreakIndicator } from "@/components/StreakIndicator";
import { StreakMilestoneModal } from "@/components/StreakMilestoneModal";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { FavoriteExpiryWatcher } from "@/components/FavoriteExpiryWatcher";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { SavedSearchWatcher } from "@/components/SavedSearchWatcher";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { AuthProvider } from "@/lib/use-auth";
import { AuthButton } from "@/components/AuthButton";
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
        <I18nProvider>
          <AuthProvider>
          <HistoryProvider>
          <StreakProvider>
          <FavoritesProvider>
          <NotificationProvider>
            <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
              <div className="container-app flex h-14 items-center justify-between gap-3">
                <Link
                  href="/"
                  className="flex items-center gap-2 font-bold text-brand-600 dark:text-brand-400"
                >
                  <span className="inline-block h-6 w-6 rounded-md bg-brand-500" aria-hidden />
                  SuperKupon
                </Link>
                <div className="flex items-center gap-2">
                  <AuthButton />
                  <StreakIndicator />
                  <HistoryLink />
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
            <SavedSearchWatcher />
            <PWAInstallBanner />
            <ScrollToTopButton />
            <Analytics />
          </NotificationProvider>
          </FavoritesProvider>
          </StreakProvider>
          </HistoryProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="container-app py-6 text-xs text-gray-500 dark:text-gray-400">
        Kupon di-aggregate dari halaman promo publik & channel resmi merchant. Validitas dapat
        berubah sewaktu-waktu — cek di merchant asli sebelum digunakan.
        <br />
        <span className="opacity-70">© 2026 SuperKupon — Studio AAA Premium</span>
        <span className="opacity-40"> · </span>
        <Link href="/mockup" className="opacity-70 hover:text-brand-500 hover:underline dark:hover:text-brand-400">
          🎨 Design Lab
        </Link>
        <span className="opacity-40"> · </span>
        <Link href="/map" className="opacity-70 hover:text-brand-500 hover:underline dark:hover:text-brand-400">
          🗺️ Map View
        </Link>
        <span className="opacity-40"> · </span>
        <Link href="/dashboard" className="opacity-70 hover:text-brand-500 hover:underline dark:hover:text-brand-400">
          🏠 Dashboard
        </Link>
        <span className="opacity-40"> · </span>
        <Link href="/alerts" className="opacity-70 hover:text-brand-500 hover:underline dark:hover:text-brand-400">
          🔔 Alerts
        </Link>
        <span className="opacity-40"> · </span>
        <Link href="/bookmarklet" className="opacity-70 hover:text-brand-500 hover:underline dark:hover:text-brand-400">
          🔖 Bookmarklet
        </Link>
      </div>
    </footer>
  );
}
