/**
 * Deterministic intake parsing (no LLM).
 *
 * "Fall and Spring" → ["Fall", "Spring"]. Season and month names are kept
 * as written (capitalized); duplicates removed, order preserved.
 */

const TERMS = [
  "Fall",
  "Spring",
  "Summer",
  "Winter",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function parseIntakes(text: string): string[] {
  const found: string[] = [];
  for (const term of TERMS) {
    if (new RegExp(`\\b${term}\\b`, "i").test(text) && !found.includes(term)) {
      found.push(term);
    }
  }
  return found;
}
