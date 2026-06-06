"use client";

import Link from "next/link";

import { useAuth } from "@/lib/use-auth";
import { useProjects } from "@/lib/use-projects";
import { useFavorites } from "@/lib/use-favorites";
import { useMerchantFollows } from "@/lib/use-merchant-follows";
import { PendingInvitesBanner } from "@/components/PendingInvitesBanner";

export default function DashboardPage() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const { count: favCount } = useFavorites();
  const { count: followCount } = useMerchantFollows();

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const archivedProjects = projects.filter((p) => p.status === "archived").length;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-blue-700 p-6 text-white shadow-xl">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
          🏠 Dashboard
        </div>
        <h1 className="mt-2 text-3xl font-black">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-violet-100">
          Overview data lo — projects, favorit, follows, dan sync state.
        </p>
      </header>

      <PendingInvitesBanner />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Projects" value={projects.length} emoji="📁" color="violet" href="/dashboard/projects" />
        <StatCard label="Active" value={activeProjects} emoji="🟢" color="emerald" />
        <StatCard label="Favorit kupon" value={favCount} emoji="♥" color="rose" href="/favorites" />
        <StatCard label="Merchant follows" value={followCount} emoji="💖" color="pink" />
      </div>

      {/* Recent projects preview */}
      <section className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Recent Projects</h2>
          <Link
            href="/dashboard/projects"
            className="text-xs font-semibold text-brand-400 hover:underline"
          >
            Lihat semua →
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-600 p-6 text-center text-sm text-gray-400">
            Belum ada project. Buat di tab Projects.
          </div>
        ) : (
          <ul className="space-y-2">
            {projects.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/projects/${p.id}`}
                  className="flex items-center gap-3 rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2 transition hover:border-brand-400 hover:bg-gray-800"
                >
                  <span className="text-xl" aria-hidden>{p.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{p.name}</div>
                    {p.description && (
                      <div className="truncate text-xs text-gray-400">{p.description}</div>
                    )}
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {archivedProjects > 0 && (
        <p className="text-center text-xs text-gray-500">
          + {archivedProjects} project archived
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  emoji,
  color,
  href,
}: {
  label: string;
  value: number;
  emoji: string;
  color: "violet" | "emerald" | "rose" | "pink";
  href?: string;
}) {
  const colorClasses = {
    violet: "from-violet-500/20 to-violet-700/20 border-violet-400/30",
    emerald: "from-emerald-500/20 to-emerald-700/20 border-emerald-400/30",
    rose: "from-rose-500/20 to-rose-700/20 border-rose-400/30",
    pink: "from-pink-500/20 to-pink-700/20 border-pink-400/30",
  }[color];

  const content = (
    <div className={["rounded-xl border bg-gradient-to-br p-4 transition", colorClasses, href ? "hover:scale-[1.02] cursor-pointer" : ""].join(" ")}>
      <div className="text-2xl" aria-hidden>{emoji}</div>
      <div className="mt-2 text-3xl font-black text-white tabular-nums">{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { label: "Active", color: "bg-emerald-500/15 text-emerald-300" },
    archived: { label: "Archived", color: "bg-gray-500/15 text-gray-400" },
    draft: { label: "Draft", color: "bg-amber-500/15 text-amber-300" },
  }[status as "active" | "archived" | "draft"] ?? { label: status, color: "bg-gray-500/15 text-gray-400" };

  return (
    <span className={["flex-none rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", config.color].join(" ")}>
      {config.label}
    </span>
  );
}
