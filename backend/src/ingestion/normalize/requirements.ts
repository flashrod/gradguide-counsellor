/**
 * Deterministic requirement parsing (no LLM).
 *
 * "IELTS 7.0" → 7.0 · "TOEFL 100" → 100 · "GPA of 3.0" → 3.0.
 * Out-of-range values yield null (validation rejects them anyway);
 * missing values stay null — never defaulted.
 */

export function parseGpa(text: string): number | null {
  const match =
    /(?:gpa|cumulative\s+gpa|grade\s+point)[^\d]{0,20}(\d(?:\.\d{1,2})?)/i.exec(text);
  if (match?.[1] == null) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0 || value > 4) return null;
  return value;
}

export function parseIelts(text: string): number | null {
  const match = /ielts[^\d]{0,15}(\d(?:\.\d)?)/i.exec(text);
  if (match?.[1] == null) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0 || value > 9) return null;
  return value;
}

export function parseToefl(text: string): number | null {
  const match = /toefl[^\d]{0,15}(\d{2,3})/i.exec(text);
  if (match?.[1] == null) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0 || value > 120) return null;
  return value;
}

export function parseWorkExperienceMonths(text: string): number | null {
  const lowered = text.toLowerCase();
  const yearMatch = /(\d+(?:\.\d+)?)\s*(?:\+?\s*(?:-|–|to)\s*\d+(?:\.\d+)?\s*)?years?\s+(?:of\s+)?(?:work\s+|professional\s+)?experience/.exec(lowered);
  if (yearMatch?.[1] != null) {
    const months = Math.round(Number(yearMatch[1]) * 12);
    if (Number.isFinite(months) && months >= 0) return months;
  }
  const monthMatch = /(\d+)\s*months?\s+(?:of\s+)?(?:work\s+|professional\s+)?experience/.exec(lowered);
  if (monthMatch?.[1] != null) {
    const months = Number(monthMatch[1]);
    if (Number.isFinite(months) && months >= 0) return months;
  }
  return null;
}
