"use client";

export type ViewMode = "list" | "calendar";

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ mode, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Tampilan kupon"
      className="inline-flex items-center gap-0.5 rounded-md border border-gray-300 bg-white p-0.5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <ToggleBtn active={mode === "list"} onClick={() => onChange("list")} emoji="📋" label="List" />
      <ToggleBtn
        active={mode === "calendar"}
        onClick={() => onChange("calendar")}
        emoji="📅"
        label="Calendar"
      />
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition",
        active
          ? "bg-brand-500 text-white shadow"
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
      ].join(" ")}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}
