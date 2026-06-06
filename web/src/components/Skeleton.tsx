"use client";

import { type HTMLAttributes } from "react";

const BASE = "bg-gray-200 dark:bg-gray-700 animate-pulse";

type DivProps = HTMLAttributes<HTMLDivElement>;

interface SizedProps extends DivProps {
  className?: string;
}

/**
 * Rectangular skeleton block. Pass width/height via Tailwind classes (h-10 w-20 etc).
 */
export function SkeletonBox({ className = "", ...rest }: SizedProps) {
  return <div className={[BASE, "rounded-md", className].join(" ")} {...rest} />;
}

/**
 * Thin line for text placeholders. Default 1rem tall.
 */
export function SkeletonBar({ className = "", ...rest }: SizedProps) {
  return <div className={[BASE, "h-4 rounded", className].join(" ")} {...rest} />;
}

/**
 * Circle skeleton for avatars/icons.
 */
export function SkeletonCircle({ className = "", ...rest }: SizedProps) {
  return <div className={[BASE, "rounded-full", className].join(" ")} {...rest} />;
}

/**
 * Pill-shaped skeleton (full rounded) for badge/chip placeholders.
 */
export function SkeletonPill({ className = "", ...rest }: SizedProps) {
  return <div className={[BASE, "h-6 w-20 rounded-full", className].join(" ")} {...rest} />;
}

/**
 * Multi-line text skeleton. Auto-shorter on last line for natural look.
 */
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={["space-y-2", className].join(" ")}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBar
          key={i}
          className={i === lines - 1 ? "w-3/4" : "w-full"}
        />
      ))}
    </div>
  );
}
