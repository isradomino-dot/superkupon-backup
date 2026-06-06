"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/lib/use-auth";
import { ProjectsProvider, useProjects } from "@/lib/use-projects";
import { RealtimeIndicator } from "@/components/RealtimeIndicator";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", emoji: "🏠" },
  { href: "/dashboard/projects", label: "Projects", emoji: "📁" },
  { href: "/sync", label: "Cloud Sync", emoji: "☁️" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-500/10 p-8 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-3 text-xl font-bold text-amber-300">Supabase belum dikonfigurasi</h1>
        <p className="mt-2 text-sm text-amber-200">
          Dashboard butuh Supabase. Lihat <code>supabase_setup.md</code> di project root.
        </p>
        <Link href="/" className="mt-4 inline-block rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-white">
          ← Kembali ke beranda
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-10 text-center">
        <div className="text-5xl">🔐</div>
        <h1 className="mt-3 text-xl font-bold text-white">Sign in dibutuhkan</h1>
        <p className="mt-2 text-sm text-gray-400">
          Dashboard berisi data per-user. Sign in dulu dari header.
        </p>
        <Link href="/" className="mt-4 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-bold text-white">
          ← Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <ProjectsProvider>
      <DashboardChrome pathname={pathname} email={user.email ?? ""}>
        {children}
      </DashboardChrome>
    </ProjectsProvider>
  );
}

function DashboardChrome({
  pathname,
  email,
  children,
}: {
  pathname: string;
  email: string;
  children: ReactNode;
}) {
  const { realtimeStatus, recentEvents, clearRecentEvents } = useProjects();

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
      {/* Sidebar */}
      <aside className="space-y-2">
        <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Signed in
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-white">{email}</div>
        </div>
        <nav className="rounded-xl border border-gray-700 bg-gray-900/40 p-2">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-brand-500 text-white"
                    : "text-gray-300 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <span aria-hidden>{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <RealtimeIndicator
          status={realtimeStatus}
          recentEvents={recentEvents}
          onClearEvents={clearRecentEvents}
        />

        <Link
          href="/"
          className="block rounded-xl border border-gray-700 bg-gray-900/40 p-3 text-center text-xs text-gray-400 transition hover:bg-white/5"
        >
          ← Ke aplikasi
        </Link>
      </aside>

      {/* Main content */}
      <main className="min-w-0">{children}</main>
    </div>
  );
}
