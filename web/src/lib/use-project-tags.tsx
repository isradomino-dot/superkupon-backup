"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getSupabase, type TagDefRow } from "@/lib/supabase";
import { useAuth } from "@/lib/use-auth";

export const TAG_COLOR_PALETTE = [
  { id: "gray", classes: "bg-gray-500/20 text-gray-300 border-gray-500/40" },
  { id: "violet", classes: "bg-violet-500/20 text-violet-300 border-violet-500/40" },
  { id: "emerald", classes: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  { id: "amber", classes: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { id: "rose", classes: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  { id: "sky", classes: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
];

export function tagColorClasses(color: string): string {
  return (
    TAG_COLOR_PALETTE.find((c) => c.id === color)?.classes ??
    TAG_COLOR_PALETTE[0].classes
  );
}

interface ProjectTagsByProject {
  [projectId: string]: TagDefRow[];
}

interface UseProjectTagsResult {
  allTags: TagDefRow[];
  projectTags: ProjectTagsByProject;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTag: (name: string, color?: string) => Promise<TagDefRow | null>;
  deleteTag: (tagId: string) => Promise<boolean>;
  attachTag: (projectId: string, tagId: string) => Promise<boolean>;
  detachTag: (projectId: string, tagId: string) => Promise<boolean>;
  tagsForProject: (projectId: string) => TagDefRow[];
}

export function useProjectTags(): UseProjectTagsResult {
  const { user } = useAuth();
  const sb = getSupabase();
  const [allTags, setAllTags] = useState<TagDefRow[]>([]);
  const [projectTags, setProjectTags] = useState<ProjectTagsByProject>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sb || !user) {
      setAllTags([]);
      setProjectTags({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [tagsRes, junctionRes] = await Promise.all([
        sb
          .from("project_tags_def")
          .select("*")
          .eq("user_id", user.id)
          .order("name"),
        sb.from("project_tags").select("*, project_tags_def(*)"),
      ]);
      if (tagsRes.error) throw tagsRes.error;
      if (junctionRes.error) throw junctionRes.error;

      setAllTags((tagsRes.data ?? []) as TagDefRow[]);

      const grouped: ProjectTagsByProject = {};
      for (const row of (junctionRes.data ?? []) as Array<{
        project_id: string;
        project_tags_def: TagDefRow;
      }>) {
        if (!row.project_tags_def) continue;
        if (!grouped[row.project_id]) grouped[row.project_id] = [];
        grouped[row.project_id].push(row.project_tags_def);
      }
      setProjectTags(grouped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load tags");
    } finally {
      setLoading(false);
    }
  }, [sb, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTag = useCallback(
    async (name: string, color = "gray"): Promise<TagDefRow | null> => {
      if (!sb || !user) return null;
      const trimmed = name.trim();
      if (!trimmed) return null;
      try {
        const { data, error: err } = await sb
          .from("project_tags_def")
          .insert({ user_id: user.id, name: trimmed, color })
          .select()
          .single();
        if (err) throw err;
        const row = data as TagDefRow;
        setAllTags((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
        return row;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal create tag");
        return null;
      }
    },
    [sb, user],
  );

  const deleteTag = useCallback(
    async (tagId: string): Promise<boolean> => {
      if (!sb || !user) return false;
      try {
        const { error: err } = await sb
          .from("project_tags_def")
          .delete()
          .eq("id", tagId)
          .eq("user_id", user.id);
        if (err) throw err;
        setAllTags((prev) => prev.filter((t) => t.id !== tagId));
        setProjectTags((prev) => {
          const next: ProjectTagsByProject = {};
          for (const [pid, tags] of Object.entries(prev)) {
            next[pid] = tags.filter((t) => t.id !== tagId);
          }
          return next;
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal delete tag");
        return false;
      }
    },
    [sb, user],
  );

  const attachTag = useCallback(
    async (projectId: string, tagId: string): Promise<boolean> => {
      if (!sb) return false;
      try {
        const { error: err } = await sb
          .from("project_tags")
          .insert({ project_id: projectId, tag_id: tagId });
        if (err) throw err;
        const tag = allTags.find((t) => t.id === tagId);
        if (tag) {
          setProjectTags((prev) => ({
            ...prev,
            [projectId]: [...(prev[projectId] ?? []), tag],
          }));
        }
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal attach tag");
        return false;
      }
    },
    [sb, allTags],
  );

  const detachTag = useCallback(
    async (projectId: string, tagId: string): Promise<boolean> => {
      if (!sb) return false;
      try {
        const { error: err } = await sb
          .from("project_tags")
          .delete()
          .eq("project_id", projectId)
          .eq("tag_id", tagId);
        if (err) throw err;
        setProjectTags((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] ?? []).filter((t) => t.id !== tagId),
        }));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal detach tag");
        return false;
      }
    },
    [sb],
  );

  const tagsForProject = useCallback(
    (projectId: string) => projectTags[projectId] ?? [],
    [projectTags],
  );

  return useMemo(
    () => ({
      allTags,
      projectTags,
      loading,
      error,
      refresh,
      createTag,
      deleteTag,
      attachTag,
      detachTag,
      tagsForProject,
    }),
    [allTags, projectTags, loading, error, refresh, createTag, deleteTag, attachTag, detachTag, tagsForProject],
  );
}
