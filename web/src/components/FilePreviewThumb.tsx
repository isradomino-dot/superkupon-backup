"use client";

import { useEffect, useRef, useState } from "react";

import { getSupabase, STORAGE_BUCKET, type ProjectFileRow } from "@/lib/supabase";
import { fileEmoji, previewKind } from "@/lib/file-preview";

interface Props {
  file: ProjectFileRow;
  size?: number;
}

/**
 * Compact preview thumbnail for file list rows.
 * - Images: lazy-load signed URL via IntersectionObserver → inline <img>
 * - Audio/video/PDF/text: emoji icon (no preview blob load on list view)
 *
 * Click handled by parent — this component is read-only thumb.
 */
export function FilePreviewThumb({ file, size = 40 }: Props) {
  const kind = previewKind(file.mime_type, file.name);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver — only load image thumb when row enters viewport
  useEffect(() => {
    if (kind !== "image") return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [kind]);

  // Fetch signed URL when visible
  useEffect(() => {
    if (!visible) return;
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await sb.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(file.storage_path, 60 * 10);
        if (!cancelled && data?.signedUrl) setThumbUrl(data.signedUrl);
      } catch {
        /* fall back to emoji */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, file.storage_path]);

  return (
    <div
      ref={containerRef}
      className="flex flex-none items-center justify-center overflow-hidden rounded-md bg-gray-700/50"
      style={{ width: size, height: size }}
    >
      {thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl}
          alt={file.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="text-2xl" aria-hidden>
          {fileEmoji(file.mime_type, file.name)}
        </span>
      )}
    </div>
  );
}
