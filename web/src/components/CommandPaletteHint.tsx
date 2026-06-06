"use client";

import { useEffect, useState } from "react";

/**
 * Small "⌘K" hint button in header. Clicking dispatches synthetic Cmd+K event
 * so the global CommandPalette opens. Auto-detects macOS to show correct symbol.
 */
export function CommandPaletteHint() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
  }, []);

  const handleClick = () => {
    if (typeof window === "undefined") return;
    // Dispatch synthetic Cmd+K so the listener in CommandPalette catches it
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }),
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Buka command palette (Cmd+K / Ctrl+K)"
      aria-label="Buka command palette"
      className="hidden items-center gap-1 rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:inline-flex"
    >
      <span aria-hidden>🔍</span>
      <kbd className="rounded bg-gray-200 px-1 font-mono text-[10px] text-gray-700 dark:bg-gray-700 dark:text-gray-200">
        {isMac ? "⌘" : "Ctrl"}
      </kbd>
      <kbd className="rounded bg-gray-200 px-1 font-mono text-[10px] text-gray-700 dark:bg-gray-700 dark:text-gray-200">
        K
      </kbd>
    </button>
  );
}
