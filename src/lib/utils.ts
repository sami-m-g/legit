import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns the number of whole days from `from` (default: today) until `date`. Negative = past. Partial days round up. */
export function daysUntil(date: Date, from: Date = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((date.getTime() - from.getTime()) / msPerDay);
}

/** Returns an ISO date string `days` days from today. */
export function futureDateString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
