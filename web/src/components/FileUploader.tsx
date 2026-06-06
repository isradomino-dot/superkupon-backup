"use client";

import { useRef, useState } from "react";

import { useProjectFiles } from "@/lib/use-project-files";
import type { ProjectFileRow } from "@/lib/supabase";
import { formatBytes, previewKind } from "@/lib/file-preview";
import { FilePreviewThumb } from "@/components/FilePreviewThumb";
import { FilePreviewModal } from "@/components/FilePreviewModal";

interface Props {
  projectId: string;
}

export function FileUploader({ projectId }: Props) {
  const { files, loading, uploading, uploadProgress, error, uploadFile, deleteFile, getDownloadUrl } =
    useProjectFiles(projectId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<ProjectFileRow | null>(null);

  const handleFiles = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    for (const f of Array.from(filesList)) {
      await uploadFile(f);
    }
  };

  const handleDownload = async (file: ProjectFileRow) => {
    const url = await getDownloadUrl(file);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleRowClick = (file: ProjectFileRow) => {
    const kind = previewKind(file.mime_type, file.name);
    if (kind === "other") {
      void handleDownload(file);
    } else {
      setPreviewFile(file);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-white">📎 File Attachments</h2>
        <span className="text-[10px] text-gray-500">
          {files.length} file{files.length !== 1 ? "s" : ""} · max 10MB/file
        </span>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={[
          "rounded-xl border-2 border-dashed p-6 text-center transition",
          dragOver
            ? "border-brand-400 bg-brand-500/10"
            : "border-gray-600 hover:border-gray-500",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => {
            void handleFiles(e.target.files);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="hidden"
        />
        <div className="text-3xl">📤</div>
        <p className="mt-2 text-sm font-semibold text-white">
          {uploading ? "Uploading..." : "Drag-and-drop atau click untuk upload"}
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-2 rounded-md bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow hover:bg-brand-600 disabled:opacity-50"
        >
          + Browse file
        </button>

        {uploading && uploadProgress > 0 && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-gray-400">{uploadProgress}%</div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-rose-500/15 px-3 py-2 text-xs font-medium text-rose-300">
          ✗ {error}
        </div>
      )}

      {/* Files list */}
      <div className="mt-4">
        {loading && files.length === 0 ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-gray-800/60" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center text-xs text-gray-500">Belum ada file</div>
        ) : (
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
                    onClick={() => handleRowClick(f)}
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
                        {f.mime_type && <span>· {f.mime_type}</span>}
                        <span>· {new Date(f.uploaded_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                        {isPreviewable && (
                          <span className="rounded-full bg-violet-500/20 px-1.5 py-0 font-mono text-[9px] uppercase text-violet-300">
                            preview
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="flex flex-none gap-1">
                    <button
                      type="button"
                      onClick={() => handleDownload(f)}
                      className="rounded px-2 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/15"
                      title="Download"
                    >
                      ⬇
                    </button>
                    {confirmDelete === f.id ? (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteFile(f);
                            setConfirmDelete(null);
                          }}
                          className="rounded bg-rose-500 px-2 py-1 text-[10px] font-bold text-white"
                        >
                          Yakin?
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="rounded bg-gray-700 px-2 py-1 text-[10px] font-bold text-gray-300"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(f.id)}
                        className="rounded px-2 py-1 text-xs font-bold text-rose-400 hover:bg-rose-500/15"
                        title="Delete"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </section>
  );
}
