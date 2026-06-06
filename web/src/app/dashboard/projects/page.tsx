"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useProjects } from "@/lib/use-projects";
import { tagColorClasses, useProjectTags } from "@/lib/use-project-tags";
import { useAuth } from "@/lib/use-auth";
import type { ProjectRow, ProjectStatus } from "@/lib/supabase";

type FilterKey = "all" | ProjectStatus;

const EMOJI_PALETTE = ["📁", "💡", "🎯", "🚀", "🎨", "📊", "🔥", "⚡", "🌟", "📦", "🎟️", "🛒"];
const COLOR_PALETTE = [
  { id: "violet", label: "Violet", classes: "from-violet-500 to-violet-700" },
  { id: "emerald", label: "Emerald", classes: "from-emerald-500 to-emerald-700" },
  { id: "rose", label: "Rose", classes: "from-rose-500 to-rose-700" },
  { id: "amber", label: "Amber", classes: "from-amber-500 to-orange-600" },
  { id: "sky", label: "Sky", classes: "from-sky-500 to-blue-700" },
  { id: "pink", label: "Pink", classes: "from-pink-500 to-pink-700" },
];

function colorFor(id: string): string {
  return (
    COLOR_PALETTE.find((c) => c.id === id)?.classes ?? "from-violet-500 to-violet-700"
  );
}

export default function ProjectsPage() {
  const { projects, loading, error, createProject, deleteProject, refresh } = useProjects();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "all") return projects;
    return projects.filter((p) => p.status === filter);
  }, [projects, filter]);

  const counts = useMemo(
    () => ({
      all: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      draft: projects.filter((p) => p.status === "draft").length,
      archived: projects.filter((p) => p.status === "archived").length,
    }),
    [projects],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-xs text-gray-400">
            CRUD project tracker. Bisa dipake buat campaign, content drafts, atau apa aja.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-brand-600"
        >
          {showCreate ? "✕ Tutup" : "+ Buat Project"}
        </button>
      </header>

      {showCreate && (
        <CreateProjectForm
          onCreate={async (input) => {
            const created = await createProject(input);
            if (created) setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {error && (
        <div className="rounded-md bg-rose-500/15 px-3 py-2 text-xs font-medium text-rose-300">
          ✗ {error}{" "}
          <button type="button" onClick={refresh} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(["all", "active", "draft", "archived"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              filter === f
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-gray-700 bg-gray-800 text-gray-300 hover:border-brand-400",
            ].join(" ")}
          >
            {f === "all" ? "Semua" : f.charAt(0).toUpperCase() + f.slice(1)}{" "}
            <span className="opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={() => deleteProject(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  onDelete,
}: {
  project: ProjectRow;
  onDelete: () => Promise<boolean>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { tagsForProject } = useProjectTags();
  const { user } = useAuth();
  const tags = tagsForProject(project.id);
  const isCollaborator = user && user.id !== project.user_id;

  return (
    <article
      className={[
        "group relative overflow-hidden rounded-xl border border-gray-700 bg-gray-900/50 transition hover:border-brand-400 hover:shadow-lg",
      ].join(" ")}
    >
      <div className={["h-2 bg-gradient-to-r", colorFor(project.color)].join(" ")} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl" aria-hidden>{project.emoji}</span>
            <Link
              href={`/dashboard/projects/${project.id}`}
              className="min-w-0 flex-1 truncate text-base font-bold text-white hover:underline"
            >
              {project.name}
            </Link>
          </div>
          <div className="flex flex-none items-center gap-1">
            {isCollaborator && (
              <span
                title="Lo collaborator (bukan owner) project ini"
                className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300"
              >
                👥 Shared
              </span>
            )}
            {project.is_public && (
              <span
                title="Project is public — shared via link"
                className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300"
              >
                🌐 Public
              </span>
            )}
            <StatusPill status={project.status} />
          </div>
        </div>

        {project.description && (
          <p className="mt-2 line-clamp-2 text-xs text-gray-400">{project.description}</p>
        )}

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 4).map((t) => (
              <span
                key={t.id}
                className={[
                  "rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
                  tagColorClasses(t.color),
                ].join(" ")}
              >
                {t.name}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="rounded-full border border-gray-600 px-1.5 py-0.5 text-[9px] text-gray-400">
                +{tags.length - 4}
              </span>
            )}
          </div>
        )}

        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block truncate text-[11px] text-brand-400 hover:underline"
          >
            🔗 {project.url}
          </a>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-gray-700 pt-2">
          <div className="text-[10px] text-gray-500">
            Updated {new Date(project.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
          </div>
          <div className="flex gap-1">
            <Link
              href={`/dashboard/projects/${project.id}`}
              className="rounded px-2 py-0.5 text-[10px] font-bold text-brand-400 hover:bg-brand-500/15"
            >
              Edit
            </Link>
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await onDelete();
                    setConfirmDelete(false);
                  }}
                  className="rounded bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-rose-600"
                >
                  Yakin?
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded bg-gray-700 px-2 py-0.5 text-[10px] font-bold text-gray-300 hover:bg-gray-600"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded px-2 py-0.5 text-[10px] font-bold text-rose-400 hover:bg-rose-500/15"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function CreateProjectForm({
  onCreate,
  onCancel,
}: {
  onCreate: (input: {
    name: string;
    description?: string;
    emoji?: string;
    color?: string;
    url?: string;
    status?: ProjectStatus;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [color, setColor] = useState("violet");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      emoji,
      color,
      url: url.trim() || undefined,
      status,
    });
    setBusy(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border-2 border-brand-400/40 bg-gradient-to-br from-violet-500/10 to-blue-500/10 p-5 animate-slide-up"
    >
      <h2 className="text-base font-bold text-white">Buat Project Baru</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-gray-300">Nama Project *</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My awesome project"
            maxLength={100}
            className="mt-1 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-300">URL (opsional)</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-gray-300">Deskripsi</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Apa tujuan project ini..."
          rows={2}
          maxLength={500}
          className="mt-1 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <span className="text-xs font-semibold text-gray-300">Emoji</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {EMOJI_PALETTE.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-md text-lg transition",
                  emoji === e ? "bg-brand-500" : "bg-gray-800 hover:bg-gray-700",
                ].join(" ")}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-300">Color</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                className={[
                  "h-8 w-8 rounded-md bg-gradient-to-br transition",
                  c.classes,
                  color === c.id ? "ring-2 ring-white" : "opacity-60 hover:opacity-100",
                ].join(" ")}
                aria-label={c.label}
                title={c.label}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-300">Status</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {(["active", "draft", "archived"] as ProjectStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition",
                  status === s
                    ? "bg-brand-500 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="flex-1 rounded-md bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Creating..." : "+ Buat Project"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

function StatusPill({ status }: { status: ProjectStatus }) {
  const config = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
    archived: "bg-gray-500/15 text-gray-400 border-gray-500/40",
    draft: "bg-amber-500/15 text-amber-300 border-amber-400/40",
  }[status];
  return (
    <span className={["flex-none rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", config].join(" ")}>
      {status}
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-600 p-12 text-center">
      <div className="text-5xl">📦</div>
      <p className="mt-3 text-base font-semibold text-white">Belum ada project</p>
      <p className="mt-1 text-xs text-gray-500">Mulai dengan bikin project pertama lo.</p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 rounded-md bg-brand-500 px-4 py-2 text-sm font-bold text-white"
      >
        + Buat Project Baru
      </button>
    </div>
  );
}
