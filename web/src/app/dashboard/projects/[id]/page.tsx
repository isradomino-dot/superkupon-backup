"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useProjects } from "@/lib/use-projects";
import { useActivityLogger } from "@/lib/use-project-activity";
import { useProjectTags } from "@/lib/use-project-tags";
import { useAuth } from "@/lib/use-auth";
import { TagPicker } from "@/components/TagPicker";
import { ActivityFeed } from "@/components/ActivityFeed";
import { FileUploader } from "@/components/FileUploader";
import { ShareModal } from "@/components/ShareModal";
import { CollaboratorList } from "@/components/CollaboratorList";
import type { ProjectStatus } from "@/lib/supabase";

const EMOJI_PALETTE = ["📁", "💡", "🎯", "🚀", "🎨", "📊", "🔥", "⚡", "🌟", "📦", "🎟️", "🛒"];
const COLOR_PALETTE = [
  { id: "violet", classes: "from-violet-500 to-violet-700" },
  { id: "emerald", classes: "from-emerald-500 to-emerald-700" },
  { id: "rose", classes: "from-rose-500 to-rose-700" },
  { id: "amber", classes: "from-amber-500 to-orange-600" },
  { id: "sky", classes: "from-sky-500 to-blue-700" },
  { id: "pink", classes: "from-pink-500 to-pink-700" },
];

function colorFor(id: string): string {
  return COLOR_PALETTE.find((c) => c.id === id)?.classes ?? "from-violet-500 to-violet-700";
}

export default function ProjectEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { getProject, updateProject, deleteProject, loading } = useProjects();
  const project = getProject(id);
  const logActivity = useActivityLogger();
  const { tagsForProject } = useProjectTags();
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [color, setColor] = useState("violet");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "ok" | "err">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Hydrate form when project loads
  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setDescription(project.description ?? "");
    setEmoji(project.emoji);
    setColor(project.color);
    setUrl(project.url ?? "");
    setStatus(project.status);
  }, [project]);

  if (loading && !project) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-10 text-center text-sm text-gray-400">
        Loading project...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-xl border border-dashed border-gray-600 p-10 text-center">
        <div className="text-5xl">🚫</div>
        <h2 className="mt-3 text-lg font-bold text-white">Project gak ditemukan</h2>
        <p className="mt-1 text-xs text-gray-400">
          Mungkin udah dihapus atau ID salah.
        </p>
        <Link
          href="/dashboard/projects"
          className="mt-4 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-bold text-white"
        >
          ← Ke daftar projects
        </Link>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setSaveStatus("idle");
    const updated = await updateProject(project.id, {
      name: name.trim(),
      description: description.trim() || null,
      emoji,
      color,
      url: url.trim() || null,
      status,
    });
    setSaving(false);
    setSaveStatus(updated ? "ok" : "err");
    setTimeout(() => setSaveStatus("idle"), 2400);
  };

  const handleDelete = async () => {
    const ok = await deleteProject(project.id);
    if (ok) router.push("/dashboard/projects");
  };

  return (
    <div className="space-y-6">
      <nav className="text-xs text-gray-400">
        <Link href="/dashboard/projects" className="hover:text-brand-400 hover:underline">
          Projects
        </Link>
        {" › "}
        <span className="text-gray-200">{project.name}</span>
      </nav>

      {/* Hero with current style */}
      <div className={["overflow-hidden rounded-2xl bg-gradient-to-br shadow-xl", colorFor(color)].join(" ")}>
        <div className="p-6">
          <div className="flex items-start gap-3">
            <span className="text-5xl" aria-hidden>{emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                Editing
              </div>
              <h1 className="mt-1 truncate text-3xl font-black text-white">{name || "Untitled"}</h1>
              {description && <p className="mt-1 line-clamp-2 text-sm text-white/80">{description}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border border-gray-700 bg-gray-900/40 p-5"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-gray-300">Nama Project *</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="mt-1 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-300">URL</span>
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
            rows={3}
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

        <div className="flex flex-wrap items-center gap-2 border-t border-gray-700 pt-4">
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>
          {saveStatus === "ok" && (
            <span className="text-xs font-medium text-emerald-400">✓ Tersimpan</span>
          )}
          {saveStatus === "err" && (
            <span className="text-xs font-medium text-rose-400">✗ Save gagal</span>
          )}
          <div className="ml-auto flex gap-2">
            <Link
              href="/dashboard/projects"
              className="rounded-md border border-gray-600 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/5"
            >
              ← Cancel
            </Link>
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-md bg-rose-500 px-3 py-2 text-xs font-bold text-white hover:bg-rose-600"
                >
                  Yakin delete?
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md bg-gray-700 px-3 py-2 text-xs font-bold text-gray-300 hover:bg-gray-600"
                >
                  Batal
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
              >
                🗑 Delete
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Tags */}
      <section className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">🏷 Tags</h2>
          <span className="text-[10px] text-gray-500">
            {tagsForProject(project.id).length} tag(s)
          </span>
        </header>
        <TagPicker
          projectId={project.id}
          onTagChange={(action, tag) =>
            void logActivity(project.id, action === "added" ? "tag_added" : "tag_removed", {
              tag_name: tag.name,
            })
          }
        />
      </section>

      {/* Sharing */}
      <section className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">🔗 Sharing</h2>
          <span
            className={[
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              project.is_public
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-gray-700/40 text-gray-400",
            ].join(" ")}
          >
            {project.is_public ? "🌐 Public" : "🔒 Private"}
          </span>
        </header>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="w-full rounded-md bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-brand-600"
        >
          {project.is_public ? "📤 Manage Sharing" : "📤 Share Project"}
        </button>
      </section>

      {/* Collaborators */}
      {user && (
        <CollaboratorList
          projectId={project.id}
          projectName={project.name}
          ownerUserId={project.user_id}
          currentUserId={user.id}
        />
      )}

      {/* Files */}
      <FileUploader projectId={project.id} />

      {/* Activity Log */}
      <ActivityFeed projectId={project.id} />

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        project={project}
        onToggleSharing={async (isPublic) => {
          await updateProject(project.id, { is_public: isPublic });
        }}
      />

      {/* Metadata */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4 text-xs text-gray-400">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-semibold text-gray-300">Created:</span>{" "}
            {new Date(project.created_at).toLocaleString("id-ID")}
          </div>
          <div>
            <span className="font-semibold text-gray-300">Updated:</span>{" "}
            {new Date(project.updated_at).toLocaleString("id-ID")}
          </div>
          <div className="col-span-2 truncate font-mono text-[10px]">
            <span className="font-semibold text-gray-300">ID:</span> {project.id}
          </div>
        </div>
      </div>
    </div>
  );
}
