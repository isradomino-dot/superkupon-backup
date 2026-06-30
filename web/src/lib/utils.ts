import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — merge Tailwind class names safely.
 *
 * Combines `clsx` (conditional class composition) with `tailwind-merge`
 * (de-duplicates conflicting Tailwind utilities, last-one-wins).
 * Standard shadcn/ui helper used by every `components/ui/*` primitive.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
