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
  { type: "other", pattern: /duolingo|pte|gre|gmat|\bdet\b|\boeai\b|languagecert|cambridge|michigan/i },
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
  windowSize = 80,
  ownTypes: string[] = []
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
  // "KEYWORD: number" binds structurally (e.g. "IELTS: 6.5") — it beats
  // proximity attribution, which a trailing exam name would otherwise
  // steal. Exam-attribution guards do not apply here (the keyword
  // immediately precedes the number), but fragment, code, and "%"
  // guards do — admin pages list per-test codes in the same format.
  const colonRe = new RegExp(
    `(?:${keyword.source})\\s*:\\s*(${numberPattern.source})(?!(?:\\.?\\d|%))`,
    "gi"
  );
  let colonMatch: RegExpExecArray | null;
  while ((colonMatch = colonRe.exec(searchable)) !== null) {
    const raw = colonMatch[1] ?? "";
    const value = cleanNumber(raw);
    if (value == null) continue;
    const numberAbsIdx =
      colonMatch.index + colonMatch[0].lastIndexOf(raw);
    if (isNumberFragment(searchable, numberAbsIdx, raw.length)) {
      continue;
    }
    const codeContext = searchable
      .slice(Math.max(0, numberAbsIdx - 14), numberAbsIdx + raw.length + 14)
      .toLowerCase();
    if (/\bcodes?\b/.test(codeContext)) {
      continue;
    }
    out.push({ value, afterKeyword: true, distance: -1, minimumNearby: false });
  }
  const keywordRe = new RegExp(keyword.source, "gi");
  let keywordMatch: RegExpExecArray | null;
  while ((keywordMatch = keywordRe.exec(searchable)) !== null) {    const start = Math.max(0, keywordMatch.index - windowSize);
    const end = keywordMatch.index + keywordMatch[0].length + windowSize;
    const windowText = searchable.slice(start, end);
    const numberRe = new RegExp(`${numberPattern.source}(?!(?:\\.?\\d|%))`, "g");
    let numberMatch: RegExpExecArray | null;
    while ((numberMatch = numberRe.exec(windowText)) !== null) {
      const raw = numberMatch[1] ?? "";
      if (isNumberFragment(windowText, numberMatch.index, numberMatch[0].length)) {
        continue;
      }
      const absoluteIndex = start + numberMatch.index;
      const numberEnd = absoluteIndex + numberMatch[0].length;
      // Administrative codes ("TOEFL Department Code: 78", "Institution
      // Code 0982") are not scores — never attribute a code-adjacent
      // number to an exam.
      const codeContext = searchable
        .slice(Math.max(0, absoluteIndex - 14), numberEnd + 14)
        .toLowerCase();
      if (/\bcodes?\b/.test(codeContext)) {
        continue;
      }
      // A number led in by another exam ("PTE Academic 60", "Duolingo
      // 100") belongs to that exam, not this one. The nearest preceding
      // exam keyword decides; an own-keyword nearer than any other keeps
      // the candidate ("TOEFL and IELTS 6.5" still reads as IELTS).
      // Lookbehind runs on the full text: near the window edge the
      // window-relative slice would truncate the exam name ("PTE" in
      // "...component. PTE Academic. 60" sits outside a short window).
      const beforeSlice = searchable.slice(
        Math.max(0, absoluteIndex - 25),
        absoluteIndex
      );
      let nearest: { type: string; index: number } | null = null;
      for (const { type, pattern } of TEST_KEYWORDS) {
        const typeRe = new RegExp(pattern.source, "gi");
        let typeMatch: RegExpExecArray | null;
        while ((typeMatch = typeRe.exec(beforeSlice)) !== null) {
          if (nearest == null || typeMatch.index >= nearest.index) {
            nearest = { type, index: typeMatch.index };
          }
        }
      }
      if (nearest != null && !ownTypes.includes(nearest.type)) {
        // ...unless the number's own exam follows immediately ("6.5
        // IELTS" after an earlier "79 TOEFL" still belongs to IELTS).
        const afterSlice = searchable.slice(numberEnd, numberEnd + 15);
        const ownFollows = TEST_KEYWORDS.some(
          ({ type, pattern }) =>
            ownTypes.includes(type) &&
            new RegExp(pattern.source, "i").test(afterSlice)
        );
        if (!ownFollows) {
          continue;
        }
      }
      // A score pinned to another test after the number ("5 on the OEAI
      // Test", "6.5 on the PTE") is not this exam's score — even when an
      // own-keyword precedes the number.
      const afterExam = searchable.slice(numberEnd, numberEnd + 25);
      const onThe = /\bon\s+the\s+([A-Za-z]+)/i.exec(afterExam);
      if (onThe?.[1] != null) {
        const word = onThe[1];
        const otherTest = TEST_KEYWORDS.some(
          ({ type, pattern }) =>
            !ownTypes.includes(type) &&
            new RegExp(`^(?:${pattern.source})$`, "i").test(word)
        );
        if (otherTest) {
          continue;
        }
      }
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
        // Subsection scores read the same with or without "the" ("59 in
        // Writing", "24 on the speaking subsection") — never overalls.
        /^\s*(on|in)\s+(the\s+)?(speaking|reading|writing|listening)\b/.test(
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
    /(\d+(?:\.\d{1,2})?)/,
    80,
    ["gpa"]
  );
  return pick(candidates, 0, 4);
}

export function parseIelts(text: string): number | null {
  const candidates = findNearKeyword(text, /ielts/i, /(\d+(?:\.\d)?)/, 80, [
    "ielts",
  ]);
  return pick(candidates, 0, 9);
}

export function parseToefl(text: string): number | null {
  const candidates = findNearKeyword(
    text,
    /toefl/i,
    /(\d{2,3}(?:\.\d)?)/,
    80,
    ["toefl"]
  );
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
