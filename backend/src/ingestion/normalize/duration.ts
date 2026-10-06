/**
 * Deterministic duration parsing (no LLM).
 *
 * "2 years" → 24 · "18 months" → 18 · "4 semesters" → 16 by default
 * (4 months per US semester). German semesters are 6 months — pass
 * monthsPerSemester: 6 for German pages. Credit counts ("30 credit
 * hours", "120 ECTS") are NOT time and yield null.
 */
const PATTERNS: { pattern: RegExp; toMonths: (n: number, monthsPerSemester: number) => number }[] = [
  { pattern: /(\d+(?:\.\d+)?)\s*-?\s*(?:-|–|to)?\s*(?:\d+(?:\.\d+)?\s*)?years?/, toMonths: (n) => Math.round(n * 12) },
  { pattern: /(\d+(?:\.\d+)?)\s*-?\s*months?/, toMonths: (n) => Math.round(n) },
  { pattern: /(\d+(?:\.\d+)?)\s*semesters?/, toMonths: (n, monthsPerSemester) => Math.round(n * monthsPerSemester) },
];

export function parseDurationMonths(text: string, monthsPerSemester = 4): number | null {
  const lowered = text.toLowerCase();
  const candidates: { months: number; standard: boolean; index: number }[] = [];
  for (const { pattern, toMonths } of PATTERNS) {
    const re = new RegExp(pattern.source, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(lowered)) !== null) {
      // "30 credit hours" is not a duration — skip credit-adjacent matches
      // without discarding the whole text. Likewise "3 years of relevant
      // employment" describes work history, not the program length.
      const nearby = lowered.slice(
        Math.max(0, match.index - 30),
        match.index + match[0].length + 30
      );
      if (/credit\s*hours?/.test(nearby)) continue;
      // Employment history is not program length: "employment for 3 years"
      // and "3 years of relevant employment" must not become durations.
      // Anchored both sides so an adjacent legitimate duration ("The
      // program is 2 years long") still parses.
      const before40 = lowered.slice(Math.max(0, match.index - 40), match.index);
      const after30 = lowered.slice(match.index + match[0].length, match.index + match[0].length + 30);
      if (
        /(employment|work\s+experience|professional\s+experience)\s+(for|of|is|:)?\s*$/.test(before40) ||
        /^\s*(of\s+)?(relevant\s+|professional\s+|work\s+)?(experience|employment)\b/.test(after30)
      ) {
        continue;
      }
      // A prerequisite undergraduate degree is not the master's length:
      // "completed a 4-year bachelor's degree" must not become 48 months.
      // Only year-figures carry this reading, and "master's program" is
      // deliberately not excluded (it usually IS the program length).
      if (/years?/.test(match[0])) {
        const pre20 = lowered.slice(Math.max(0, match.index - 20), match.index);
        if (
          /(bachelor|undergraduate|honou?rs?)\s*'?s?\s*$/.test(pre20) ||
          /^\s*(bachelor'?s?|undergraduate|honou?rs?)\b/.test(after30)
        ) {
          continue;
        }
      }
      if (match[1] == null) continue;
      const months = toMonths(Number(match[1]), monthsPerSemester);
      if (!Number.isFinite(months) || months <= 0 || months > 120) continue;
      const context = lowered.slice(
        Math.max(0, match.index - 60),
        match.index + match[0].length + 20
      );
      // Prefer the stated standard duration over thesis completion
      // periods and other incidental durations; otherwise the earliest
      // mention wins (pattern order must not outrank text order — e.g. a
      // "GRE valid for 5 years" note must not beat the "16-month program"
      // stated earlier on the page).
      candidates.push({
        months,
        standard:
          /standard|normal|duration|program length|period of stud|course length/i.test(
            context
          ),
        index: match.index,
      });
    }
  }
  candidates.sort(
    (a, b) => Number(b.standard) - Number(a.standard) || a.index - b.index
  );
  return candidates[0]?.months ?? null;
}
