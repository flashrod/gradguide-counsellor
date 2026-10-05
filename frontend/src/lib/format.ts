import type { ApiEstimatedCost, ApiGpa } from "./api-types";

/**
 * Display formatters (Milestone 6). Presentation only — unknown values
 * render as "Unknown", never as zero or a fabricated equivalent.
 */

export function formatGpa(gpa: ApiGpa): string {
  if (gpa.value == null || gpa.scale == null) return "Unknown";
  return `${gpa.value} / ${gpa.scale}`;
}

export function formatCost(cost: ApiEstimatedCost | null): string {
  if (cost == null) return "Unknown";
  return `${cost.currency} ${cost.amount.toLocaleString("en-US")} (est. total)`;
}

export function formatBudget(
  amount: number | null,
  currency: string | null
): string {
  if (amount == null || currency == null) return "Unknown";
  return `${currency} ${amount.toLocaleString("en-US")} (max total)`;
}

export function formatTestScore(value: number | null): string {
  return value == null ? "Unknown" : String(value);
}

export function formatVerifiedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
