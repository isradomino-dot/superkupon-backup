export type PreviewKind = "image" | "video" | "audio" | "pdf" | "text" | "code" | "other";

const TEXT_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/tab-separated-values",
  "text/x-log",
]);

const CODE_MIMES = new Set([
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
  "application/sql",
  "application/x-yaml",
  "application/x-sh",
  "text/x-python",
  "text/x-c",
  "text/html",
  "text/css",
  "text/javascript",
]);

const CODE_EXT = new Set([
  "ts", "tsx", "js", "jsx", "py", "rb", "go", "rs", "java", "c", "h", "cpp", "hpp",
  "cs", "kt", "swift", "sh", "bash", "zsh", "yml", "yaml", "toml", "ini", "conf",
  "json", "xml", "html", "htm", "css", "scss", "sass", "less", "sql", "graphql", "md",
]);

/**
 * Classify file for preview rendering. Returns 'other' if unsupported.
 */
export function previewKind(mime: string | null, name: string): PreviewKind {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (m === "application/pdf") return "pdf";
  if (TEXT_MIMES.has(m)) return "text";
  if (CODE_MIMES.has(m)) return "code";

  // Fallback by file extension
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx > 0) {
    const ext = name.slice(dotIdx + 1).toLowerCase();
    if (CODE_EXT.has(ext)) return "code";
    if (["txt", "log", "csv", "tsv", "md"].includes(ext)) return "text";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp"].includes(ext)) return "image";
    if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) return "audio";
    if (ext === "pdf") return "pdf";
  }

  return "other";
}

export function fileEmoji(mime: string | null, name: string): string {
  const kind = previewKind(mime, name);
  return {
    image: "🖼",
    video: "🎬",
    audio: "🎵",
    pdf: "📕",
    text: "📄",
    code: "📋",
    other: "📦",
  }[kind];
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export const MAX_TEXT_PREVIEW_BYTES = 500 * 1024; // 500KB safety
