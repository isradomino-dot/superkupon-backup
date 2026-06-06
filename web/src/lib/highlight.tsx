import { Fragment } from "react";

/**
 * Wrap occurrences of any query token inside `text` with <mark>.
 *
 * - Tokenizes query by whitespace (multi-word search).
 * - Tokens < 2 chars di-drop (avoid noisy single-char highlights).
 * - Case-insensitive, escapes regex specials.
 */
export function Highlight({
  text,
  query,
}: {
  text: string | null | undefined;
  query: string;
}) {
  if (!text) return null;

  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) return <>{text}</>;

  const escaped = tokens
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  const tokenSet = new Set(tokens);

  return (
    <>
      {parts.map((part, i) =>
        tokenSet.has(part.toLowerCase()) ? (
          <mark
            key={i}
            className="rounded bg-yellow-200 px-0.5 text-gray-900 dark:bg-yellow-500/40 dark:text-yellow-50"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}
