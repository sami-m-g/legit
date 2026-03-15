import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { LOW_CONFIDENCE_THRESHOLD } from "./briefing-rules";
import type { ConfidenceStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns the number of whole days from `from` (default: today) until `date`. Negative = past. Partial days round up. */
export function daysUntil(date: Date, from: Date = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((date.getTime() - from.getTime()) / msPerDay);
}

/** Returns binary confidence status from a float score. */
export function getConfidenceStatus(
  confidence: number | null,
): ConfidenceStatus {
  if (confidence === null) return "needs-review";
  return confidence >= LOW_CONFIDENCE_THRESHOLD ? "verified" : "needs-review";
}

/** Formats a dollar amount with K/M suffixes for compact display. */
export function formatDollarShort(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

/** Returns an ISO date string `days` days from today. */
export function futureDateString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
