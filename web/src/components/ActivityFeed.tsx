"use client";

import { useProjectActivity } from "@/lib/use-project-activity";
import type { ActivityAction, ProjectActivityRow } from "@/lib/supabase";

interface Props {
  projectId: string;
}

const ACTION_META: Record<
  ActivityAction,
  { emoji: string; label: string; color: string }
> = {
  created: { emoji: "✨", label: "Created project", color: "text-emerald-300" },
  updated: { emoji: "✏️", label: "Updated", color: "text-sky-300" },
  deleted: { emoji: "🗑", label: "Deleted", color: "text-rose-300" },
  shared: { emoji: "🔗", label: "Shared publicly", color: "text-amber-300" },
  unshared: { emoji: "🔒", label: "Made private", color: "text-gray-300" },
  tag_added: { emoji: "🏷", label: "Added tag", color: "text-violet-300" },
  tag_removed: { emoji: "🏷", label: "Removed tag", color: "text-gray-300" },
  file_uploaded: { emoji: "📎", label: "Uploaded file", color: "text-sky-300" },
  file_deleted: { emoji: "🗑", label: "Deleted file", color: "text-rose-300" },
};

function formatRelative(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}d lalu`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function detailSummary(row: ProjectActivityRow): string | null {
  if (!row.details) return null;
  const d = row.details;
  if (typeof d.name === "string") return d.name as string;
  if (typeof d.tag_name === "string") return d.tag_name as string;
  if (typeof d.file_name === "string") return d.file_name as string;
  if (typeof d.field === "string") {
    return `${d.field as string}${d.from !== undefined && d.to !== undefined ? `: ${String(d.from)} → ${String(d.to)}` : ""}`;
  }
  return null;
}

export function ActivityFeed({ projectId }: Props) {
  const { activities, loading } = useProjectActivity(projectId);

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-white">📋 Activity Log</h2>
        <span className="text-[10px] text-gray-500">{activities.length} events</span>
      </header>

      {loading && activities.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-gray-800/60" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-600 p-6 text-center text-xs text-gray-500">
          Belum ada activity. Edit project untuk mulai logging.
        </div>
      ) : (
        <ul className="space-y-2">
          {activities.map((a) => {
            const meta = ACTION_META[a.action] ?? {
              emoji: "📝",
              label: a.action,
              color: "text-gray-300",
            };
            const detail = detailSummary(a);
            return (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-md border border-gray-700 bg-gray-800/40 p-2.5"
              >
                <span className="text-lg flex-none" aria-hidden>{meta.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className={["text-xs font-semibold", meta.color].join(" ")}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-gray-500">{formatRelative(a.created_at)}</span>
                  </div>
                  {detail && (
                    <div className="mt-0.5 truncate text-[11px] text-gray-300">{detail}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
