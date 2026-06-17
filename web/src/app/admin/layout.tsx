"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminGate } from "@/components/admin/AdminGate";

/**
 * Admin layout — sidebar nav + AdminGate auth wrapper.
 *
 * IMPORTANT: AdminGate REQUIRES API key login sebelum render isi.
 * Tanpa key valid, user lihat login form.
 *
 * Sidebar nav links:
 * - /admin → Dashboard (KPI overview + scraper health)
 * - /admin/utm-builder → UTM Link Builder (existing)
 * - /admin/scrapers → Scraper Manager (future)
 * - /admin/coupons → Coupon Manager (future, manual curation UI)
 */

const NAV_ITEMS = [
  { href: "/admin", label: "📊 Dashboard", exact: true },
  { href: "/admin/utm-builder", label: "🔗 UTM Builder", exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <div className="min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-gray-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-xs text-gray-400 hover:text-brand-300"
              >
                ← Site
              </Link>
              <div className="h-4 w-px bg-white/20" />
              <h1 className="font-bold text-white">
                🔐 SuperKupon Admin
              </h1>
            </div>
            <nav className="hidden md:flex md:items-center md:gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
          </div>
          {/* Mobile nav */}
          <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 md:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </AdminGate>
  );
}

function NavLink({
  href,
  label,
  exact,
}: {
  href: string;
  label: string;
  exact: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={
        isActive
          ? "rounded-lg bg-brand-500/20 px-3 py-1.5 text-sm font-medium text-brand-200"
          : "rounded-lg px-3 py-1.5 text-sm text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
      }
    >
      {label}
    </Link>
  );
}
