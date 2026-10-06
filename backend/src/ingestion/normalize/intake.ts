/**
 * Deterministic intake parsing (no LLM).
 *
 * "Fall and Spring" → ["Fall", "Spring"]. Season and month names are kept
 * as written (capitalized); duplicates removed, order preserved.
 * Country terms ("Winter Semester", "Semester 1") are recognized; the
 * matched label is preserved so identical non-standard terms still match
 * without overclaiming a season mapping.
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
    // "May" collides with the modal verb — only accept capitalized uses.
    const pattern =
      term === "May" ? /\bMay\b/ : new RegExp(`\\b${term}\\b`, "i");
    if (pattern.test(text) && !found.includes(term)) {
      found.push(term);
    }
  }
  return found;
}

/**
 * Seasons only (no bare months): used when no intake-specific sentences
 * exist, so deadline dates ("November 1") cannot pollute the intake list.
 */
export function parseIntakeSeasons(text: string): string[] {
  const seasons = ["Fall", "Spring", "Summer", "Winter"];
  const found: string[] = [];
  for (const season of seasons) {
    if (
      new RegExp(`\\b${season}\\b`, "i").test(text) &&
      !found.includes(season)
    ) {
      found.push(season);
    }
  }
  return found;
}
