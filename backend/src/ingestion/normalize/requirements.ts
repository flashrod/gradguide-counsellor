/**
 * Deterministic requirement parsing (no LLM).
 *
 * Handles both orders ("IELTS 7.0" and "6.5 IELTS"); the closest in-range
 * number to the keyword wins ("minimum" proximity breaks ties). Dates
 * (01/21/2026) and number prefixes ("10" in "10-point" matching as "1")
 * are never mistaken for scores. Out-of-range values yield null.
 */

function cleanNumber(raw: string): number | null {
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** True when the match is a fragment of a longer numeric token. */
function isNumberFragment(text: string, index: number, length: number): boolean {
  const before = text[index - 1] ?? "";
  const after = text[index + length] ?? "";
  if (/\d/.test(before) || /\d/.test(after) || before === ".") return true;
  // CEFR levels ("Profile B1") are not exam scores: a lone digit glued to
  // a letter is never a requirement.
  if (/[A-Za-z]/.test(before) && length === 1) return true;
  return false;
}

interface ScoredCandidate {
  value: number;
  afterKeyword: boolean;
  distance: number;
  minimumNearby: boolean;
}

/** Test keywords used to attribute a number to the right exam. */
const TEST_KEYWORDS: { type: string; pattern: RegExp }[] = [
  { type: "gpa", pattern: /gpa|cumulative\s+gpa|grade\s+point/i },
  { type: "ielts", pattern: /ielts/i },
  { type: "toefl", pattern: /toefl/i },
  { type: "other", pattern: /duolingo|pte|gre|gmat|\bdet\b|languagecert|cambridge|michigan/i },
];

/** True when another exam keyword sits in the gap between number and keyword. */
function segmentBlocked(segment: string): boolean {
  return TEST_KEYWORDS.some(({ pattern }) =>
    new RegExp(pattern.source, "gi").test(segment)
  );
}

/**
 * Find numbers near a keyword, either before or after it. A number is
 * attributed to the nearest exam keyword, so "Duolingo 100" never reads
 * as a TOEFL score. Among attributed numbers, post-keyword mentions win,
 * then distance, then "minimum" proximity.
 */
function findNearKeyword(
  text: string,
  keyword: RegExp,
  numberPattern: RegExp,
  windowSize = 80
): ScoredCandidate[] {
  const out: ScoredCandidate[] = [];
  // Dates (01/21/2026, January 21, 2026) are removed first so their parts
  // never read as scores.
  const searchable = text
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, " ")
    .replace(
      /\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december),?\s+\d{4}\b/gi,
      " "
    )
    .replace(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/gi,
      " "
    );
  // "KEYWORD: number" binds unambiguously (e.g. "IELTS: 6.5") — it beats
  // proximity attribution, which a trailing exam name would otherwise steal.
  const colonRe = new RegExp(
    `(?:${keyword.source})\\s*:\\s*(${numberPattern.source})(?!(?:\\.?\\d))`,
    "gi"
  );
  let colonMatch: RegExpExecArray | null;
  while ((colonMatch = colonRe.exec(searchable)) !== null) {
    const value = cleanNumber(colonMatch[1] ?? "");
    if (value == null) continue;
    out.push({ value, afterKeyword: true, distance: -1, minimumNearby: false });
  }
  const keywordRe = new RegExp(keyword.source, "gi");
  let keywordMatch: RegExpExecArray | null;
  while ((keywordMatch = keywordRe.exec(searchable)) !== null) {    const start = Math.max(0, keywordMatch.index - windowSize);
    const end = keywordMatch.index + keywordMatch[0].length + windowSize;
    const windowText = searchable.slice(start, end);
    const numberRe = new RegExp(`${numberPattern.source}(?!(?:\\.?\\d))`, "g");
    let numberMatch: RegExpExecArray | null;
    while ((numberMatch = numberRe.exec(windowText)) !== null) {
      const raw = numberMatch[1] ?? "";
      if (isNumberFragment(windowText, numberMatch.index, numberMatch[0].length)) {
        continue;
      }
      const absoluteIndex = start + numberMatch.index;
      const numberEnd = absoluteIndex + numberMatch[0].length;
      const keywordEnd = keywordMatch.index + keywordMatch[0].length;
      // Gap strictly between the two spans (excludes both endpoints).
      const gapFrom = Math.min(numberEnd, keywordEnd);
      const gapTo = Math.max(absoluteIndex, keywordMatch.index);
      if (
        gapTo > gapFrom &&
        segmentBlocked(searchable.slice(gapFrom, gapTo))
      ) {
        continue;
      }
      // Section scores ("TOEFL speaking score of 26", "24 on the speaking
      // subsection") are not overalls — in either direction.
      const beforeContext = searchable
        .slice(Math.max(0, absoluteIndex - 40), absoluteIndex)
        .toLowerCase();
      const afterContext = searchable
        .slice(numberEnd, numberEnd + 40)
        .toLowerCase();
      if (
        /(speaking|reading|writing|listening)\b[^.]{0,25}\bscore of\s*$/.test(
          beforeContext
        ) ||
        /^\s*(on|in)\s+the\s+(speaking|reading|writing|listening)\b/.test(
          afterContext
        )
      ) {
        continue;
      }
      const value = cleanNumber(raw);
      if (value == null) continue;
      const context = windowText
        .slice(Math.max(0, numberMatch.index - 20), numberMatch.index)
        .toLowerCase();
      out.push({
        value,
        afterKeyword: start + numberMatch.index >= keywordMatch.index,
        distance: Math.abs(start + numberMatch.index - keywordMatch.index),
        minimumNearby:
          context.includes("minimum") || context.includes("at least"),
      });
    }
  }
  return out;
}

function pick(
  candidates: ScoredCandidate[],
  min: number,
  max: number
): number | null {
  // Numbers stated after the keyword ("TOEFL: 88") beat incidental numbers
  // before it ("PTE 60, TOEFL: 88"); distance, then "minimum", break ties.
  const inRange = candidates
    .filter((c) => c.value >= min && c.value <= max)
    .sort(
      (a, b) =>
        Number(b.afterKeyword) - Number(a.afterKeyword) ||
        a.distance - b.distance ||
        Number(b.minimumNearby) - Number(a.minimumNearby)
    );
  return inRange[0]?.value ?? null;
}

export function parseGpa(text: string): number | null {
  const candidates = findNearKeyword(
    text,
    /gpa|cumulative\s+gpa|grade\s+point/i,
    /(\d+(?:\.\d{1,2})?)/
  );
  return pick(candidates, 0, 4);
}

export function parseIelts(text: string): number | null {
  const candidates = findNearKeyword(text, /ielts/i, /(\d+(?:\.\d)?)/);
  return pick(candidates, 0, 9);
}

export function parseToefl(text: string): number | null {
  const candidates = findNearKeyword(text, /toefl/i, /(\d{2,3}(?:\.\d)?)/);
  return pick(candidates, 0, 120);
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
