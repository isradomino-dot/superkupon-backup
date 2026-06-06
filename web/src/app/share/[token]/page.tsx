"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getSupabase,
  STORAGE_BUCKET,
  type ProjectActivityRow,
  type ProjectFileRow,
  type ProjectRow,
  type TagDefRow,
} from "@/lib/supabase";
import { tagColorClasses } from "@/lib/use-project-tags";
import { formatBytes, previewKind } from "@/lib/file-preview";
import { FilePreviewThumb } from "@/components/FilePreviewThumb";
import { FilePreviewModal } from "@/components/FilePreviewModal";

const COLOR_GRADIENTS: Record<string, string> = {
  violet: "from-violet-500 to-violet-700",
  emerald: "from-emerald-500 to-emerald-700",
  rose: "from-rose-500 to-rose-700",
  amber: "from-amber-500 to-orange-600",
  sky: "from-sky-500 to-blue-700",
  pink: "from-pink-500 to-pink-700",
};

export default function PublicProjectPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const sb = getSupabase();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [tags, setTags] = useState<TagDefRow[]>([]);
  const [activities, setActivities] = useState<ProjectActivityRow[]>([]);
  const [files, setFiles] = useState<ProjectFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFileRow | null>(null);

  useEffect(() => {
    if (!sb || !token) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // Fetch project by share_token (must be is_public=true via RLS)
        const { data: projRows, error: projErr } = await sb
          .from("projects")
          .select("*")
          .eq("share_token", token)
          .eq("is_public", true)
          .limit(1);
        if (projErr) throw projErr;
        if (cancelled) return;
        if (!projRows || projRows.length === 0) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const proj = projRows[0] as ProjectRow;
        setProject(proj);

        // Parallel: tags + activity + files (all RLS-allowed via is_public)
        const [tagsRes, actRes, filesRes] = await Promise.all([
          sb.from("project_tags").select("*, project_tags_def(*)").eq("project_id", proj.id),
          sb
            .from("project_activity")
            .select("*")
            .eq("project_id", proj.id)
            .order("created_at", { ascending: false })
            .limit(10),
          sb
            .from("project_files")
            .select("*")
            .eq("project_id", proj.id)
            .order("uploaded_at", { ascending: false }),
        ]);
        if (cancelled) return;

        const tagsList: TagDefRow[] = [];
        for (const row of (tagsRes.data ?? []) as Array<{ project_tags_def: TagDefRow | null }>) {
          if (row.project_tags_def) tagsList.push(row.project_tags_def);
        }
        setTags(tagsList);
        setActivities((actRes.data ?? []) as ProjectActivityRow[]);
        setFiles((filesRes.data ?? []) as ProjectFileRow[]);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sb, token]);

  const handleDownload = async (file: ProjectFileRow) => {
    if (!sb) return;
    const { data } = await sb.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(file.storage_path, 60 * 10);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-800" />
        <div className="h-32 animate-pulse rounded-2xl bg-gray-800" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-600 p-12 text-center">
        <div className="text-6xl">🚫</div>
        <h1 className="mt-4 text-2xl font-bold text-white">Project tidak ditemukan</h1>
        <p className="mt-2 text-sm text-gray-400">
          Link share-nya invalid, expired, atau project udah di-private kembali oleh owner.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-bold text-white"
        >
          ← Ke beranda
        </Link>
      </div>
    );
  }

  const gradient = COLOR_GRADIENTS[project.color] ?? COLOR_GRADIENTS.violet;

  return (
    <div className="space-y-6">
      {/* Public badge */}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
        🌐 Public · Read-only
      </div>

      {/* Hero */}
      <div className={["overflow-hidden rounded-2xl bg-gradient-to-br shadow-xl", gradient].join(" ")}>
        <div className="p-6">
          <div className="flex items-start gap-3">
            <span className="text-5xl" aria-hidden>{project.emoji}</span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-3xl font-black text-white">{project.name}</h1>
              {project.description && (
                <p className="mt-2 text-sm text-white/85">{project.description}</p>
              )}
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-white/80 hover:underline"
                >
                  🔗 {project.url}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <section className="rounded-xl border border-gray-700 bg-gray-900/40 p-4">
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            🏷 Tags
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t.id}
                className={[
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  tagColorClasses(t.color),
                ].join(" ")}
              >
                {t.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Files */}
      {files.length > 0 && (
        <section className="rounded-xl border border-gray-700 bg-gray-900/40 p-5">
          <h2 className="mb-3 text-base font-bold text-white">📎 Attachments ({files.length})</h2>
          <ul className="space-y-2">
            {files.map((f) => {
              const kind = previewKind(f.mime_type, f.name);
              const isPreviewable = kind !== "other";
              return (
                <li
                  key={f.id}
                  className="group flex items-center gap-3 rounded-md border border-gray-700 bg-gray-800/40 p-2 transition hover:border-brand-400 hover:bg-gray-800"
                >
                  <button
                    type="button"
                    onClick={() => (isPreviewable ? setPreviewFile(f) : handleDownload(f))}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    title={isPreviewable ? "Click untuk preview" : "Click untuk download"}
                  >
                    <FilePreviewThumb file={f} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white group-hover:text-brand-300">
                        {f.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <span>{formatBytes(f.size_bytes)}</span>
                        <span>· {f.mime_type ?? "unknown"}</span>
                        {isPreviewable && (
                          <span className="rounded-full bg-violet-500/20 px-1.5 py-0 font-mono text-[9px] uppercase text-violet-300">
                            preview
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(f)}
                    className="flex-none rounded-md bg-emerald-500 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-600"
                  >
                    ⬇
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* Activity */}
      {activities.length > 0 && (
        <section className="rounded-xl border border-gray-700 bg-gray-900/40 p-5">
          <h2 className="mb-3 text-base font-bold text-white">📋 Recent Activity</h2>
          <ul className="space-y-1.5">
            {activities.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 text-xs text-gray-300"
              >
                <span className="font-mono text-[10px] text-gray-500">
                  {new Date(a.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span>—</span>
                <span className="text-gray-200">{a.action.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4 text-center text-xs text-gray-400">
        Powered by{" "}
        <Link href="/" className="text-brand-400 hover:underline">
          SuperKupon
        </Link>{" "}
        · This project is shared publicly by the owner
      </div>
    </div>
  );
}
