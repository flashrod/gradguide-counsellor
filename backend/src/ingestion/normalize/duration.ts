/**
 * Deterministic duration parsing (no LLM).
 *
 * "2 years" → 24 · "18 months" → 18 · "4 semesters" → 16 (4 months each,
 * documented assumption). Credit counts ("30 credit hours") are NOT time
 * and yield null — the extractor must not fabricate months from credits.
 */

const PATTERNS: { pattern: RegExp; toMonths: (n: number) => number }[] = [
  { pattern: /(\d+(?:\.\d+)?)\s*-?\s*(?:-|–|to)?\s*(?:\d+(?:\.\d+)?\s*)?years?/, toMonths: (n) => Math.round(n * 12) },
  { pattern: /(\d+(?:\.\d+)?)\s*-?\s*months?/, toMonths: (n) => Math.round(n) },
  { pattern: /(\d+(?:\.\d+)?)\s*semesters?/, toMonths: (n) => Math.round(n * 4) },
];

export function parseDurationMonths(text: string): number | null {
  const lowered = text.toLowerCase();
  if (/credit\s*hours?/.test(lowered)) return null;
  for (const { pattern, toMonths } of PATTERNS) {
    const match = pattern.exec(lowered);
    if (match?.[1] == null) continue;
    const months = toMonths(Number(match[1]));
    if (Number.isFinite(months) && months > 0 && months <= 120) return months;
    return null;
  }
  return null;
}
