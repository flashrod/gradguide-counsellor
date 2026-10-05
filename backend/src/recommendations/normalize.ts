/**
 * Shared string helpers for the recommendation engine.
 * Matching is deliberately simple (case/format-insensitive comparison and
 * token overlap) — no embeddings, no fuzzy logic. Deterministic by design.
 */

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a normalized string into distinct tokens. */
export function tokenize(value: string): string[] {
  const tokens = normalize(value).split(" ").filter(Boolean);
  return [...new Set(tokens)];
}

/**
 * Transparent background matching: two values match when their normalized
 * forms are equal or one contains the other (e.g. "computer science"
 * matches "B.Tech Computer Science"). Documented limitation: this is
 * intentionally naive — no academic equivalence mapping yet.
 */
export function backgroundMatches(a: string, b: string): boolean {
  const left = normalize(a);
  const right = normalize(b);
  if (left.length === 0 || right.length === 0) return false;
  return left === right || left.includes(right) || right.includes(left);
}

/** Clamp a number into [min, max]; non-finite values become `fallback`. */
export function clampScore(value: number, fallback = 70): number {
  if (!Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}
