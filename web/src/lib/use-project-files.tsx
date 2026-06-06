"use client";

import { useCallback, useEffect, useState } from "react";

import { getSupabase, STORAGE_BUCKET, type ProjectFileRow } from "@/lib/supabase";
import { useAuth } from "@/lib/use-auth";
import { useActivityLogger } from "@/lib/use-project-activity";

const MAX_FILE_SIZE_MB = 10;

interface UseProjectFilesResult {
  files: ProjectFileRow[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  uploadProgress: number;
  refresh: () => Promise<void>;
  uploadFile: (file: File) => Promise<ProjectFileRow | null>;
  deleteFile: (file: ProjectFileRow) => Promise<boolean>;
  getDownloadUrl: (file: ProjectFileRow) => Promise<string | null>;
}

/** Sanitize filename: keep alphanum + dot, replace rest with underscore */
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export function useProjectFiles(projectId?: string): UseProjectFilesResult {
  const { user } = useAuth();
  const sb = getSupabase();
  const logActivity = useActivityLogger();
  const [files, setFiles] = useState<ProjectFileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sb || !projectId) {
      setFiles([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await sb
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("uploaded_at", { ascending: false });
      if (err) throw err;
      setFiles((data ?? []) as ProjectFileRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load files");
    } finally {
      setLoading(false);
    }
  }, [sb, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const uploadFile = useCallback(
    async (file: File): Promise<ProjectFileRow | null> => {
      if (!sb || !user || !projectId) return null;
      setError(null);

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File terlalu besar (max ${MAX_FILE_SIZE_MB}MB)`);
        return null;
      }

      setUploading(true);
      setUploadProgress(0);
      try {
        const sanitized = safeName(file.name);
        const ts = Math.floor((typeof performance !== "undefined" ? performance.now() : 1) * 1000);
        const path = `${user.id}/${projectId}/${ts}_${sanitized}`;

        // Step 1: Upload to Storage
        const { error: upErr } = await sb.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "application/octet-stream",
          });
        if (upErr) throw upErr;
        setUploadProgress(70);

        // Step 2: Insert metadata row
        const { data: rowData, error: insErr } = await sb
          .from("project_files")
          .insert({
            project_id: projectId,
            user_id: user.id,
            name: file.name,
            size_bytes: file.size,
            mime_type: file.type || null,
            storage_path: path,
          })
          .select()
          .single();
        if (insErr) {
          // Rollback storage upload
          await sb.storage.from(STORAGE_BUCKET).remove([path]);
          throw insErr;
        }
        setUploadProgress(100);

        const row = rowData as ProjectFileRow;
        setFiles((prev) => [row, ...prev]);
        void logActivity(projectId, "file_uploaded", { file_name: row.name, size: row.size_bytes });
        return row;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload gagal");
        return null;
      } finally {
        setUploading(false);
        setTimeout(() => setUploadProgress(0), 1500);
      }
    },
    [sb, user, projectId, logActivity],
  );

  const deleteFile = useCallback(
    async (file: ProjectFileRow): Promise<boolean> => {
      if (!sb || !user) return false;
      setError(null);
      try {
        // Delete storage first; if it fails, still try DB delete (may be already missing)
        await sb.storage.from(STORAGE_BUCKET).remove([file.storage_path]);
        const { error: err } = await sb.from("project_files").delete().eq("id", file.id);
        if (err) throw err;
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
        void logActivity(file.project_id, "file_deleted", { file_name: file.name });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete gagal");
        return false;
      }
    },
    [sb, user, logActivity],
  );

  const getDownloadUrl = useCallback(
    async (file: ProjectFileRow): Promise<string | null> => {
      if (!sb) return null;
      try {
        const { data, error: err } = await sb.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(file.storage_path, 60 * 10); // 10 min
        if (err) throw err;
        return data?.signedUrl ?? null;
      } catch {
        return null;
      }
    },
    [sb],
  );

  return {
    files,
    loading,
    uploading,
    error,
    uploadProgress,
    refresh,
    uploadFile,
    deleteFile,
    getDownloadUrl,
  };
}
