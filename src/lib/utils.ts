import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely formats a date value into a localized string.
 * Returns "—" for null, undefined, empty, or invalid dates.
 * Uses Intl.DateTimeFormat with "en-US" locale for consistent output.
 *
 * @example
 * formatDate("2026-07-20T10:00:00Z") // "20 Jul 2026"
 * formatDate(null) // "—"
 * formatDate(undefined) // "—"
 * formatDate("invalid") // "—"
 */
export function formatDate(date?: string | Date | null): string {
  if (!date) return "—";

  const d = new Date(date);

  if (isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}
