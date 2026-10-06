import * as cheerio from "cheerio";

import {
  parseDurationMonths,
  parseGpa,
  parseIelts,
  parseIntakes,
  parseIntakeSeasons,
  parseToefl,
  parseTuition,
  parseWorkExperienceMonths,
} from "../normalize/index.js";
import type { CourseCandidate } from "../types.js";

/**
 * Deterministic course-page extractor (no LLM).
 *
 * Operates on main-content text (nav/header/footer/script stripped) with
 * regex + normalizer passes. Anything not found stays null — the extractor
 * never fabricates values. Per-university adapters supply identity metadata
 * and the page HTML; all interpretation lives here.
 */

export interface ExtractionInput {
  html: string;
  universityName: string;
  universityCountry: string;
  universityCity: string | null;
  universityWebsite: string | null;
  sourceUrl: string;
  sourceName: string;
  /** Curated identity override for pages without a program title (e.g. department admissions pages). */
  programName?: string | null;
  degreeType?: string | null;
  field?: string | null;
  suppressFields?: ("gpa" | "ielts" | "toefl" | "duration" | "tuition")[];
}

const DEGREE_TOKENS: { pattern: RegExp; degreeType: string }[] = [
  { pattern: /\bMaster of Science\b/i, degreeType: "MS" },
  { pattern: /\bM\.?S\.?\b/, degreeType: "MS" },
  { pattern: /\bMSc\b/, degreeType: "MSc" },
  { pattern: /\bMaster of Arts\b/i, degreeType: "MA" },
  { pattern: /\bMBA\b/i, degreeType: "MBA" },
  { pattern: /\bMEng\b/i, degreeType: "MEng" },
  { pattern: /\bPh\.?D\.?\b/i, degreeType: "PhD" },
];

const PARENTHETICAL_DEGREE: { pattern: RegExp; degreeType: string }[] = [
  { pattern: /\(\s*M\.?\s*S\.?\s*c\.?\s*\)/i, degreeType: "MSc" },
  { pattern: /\(\s*M\.?\s*S\.?\s*\)/, degreeType: "MS" },
  { pattern: /\(\s*MA\s*\)/, degreeType: "MA" },
  { pattern: /\(\s*MBA\s*\)/i, degreeType: "MBA" },
  // MEng is deliberately non-parenthetical here: unlike the others it is
  // almost never written "(MEng)" in titles, so any mention claims the type.
  { pattern: /\bMEng\b/i, degreeType: "MEng" },
  { pattern: /\(\s*Ph\.?D\.?\s*\)/i, degreeType: "PhD" },
];

const DISCIPLINE_VOCABULARY = [
  "Computer Science",
  "Engineering",
  "Mathematics",
  "Statistics",
  "Science",
  "Business",
];

/** Disciplines explicitly named in background/degree sentences (prerequisite and bridge-course sentences excluded — they describe catch-up subjects, not accepted backgrounds). */
export function extractBackgrounds(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const relevant = sentences.filter(
    (s) =>
      /background|undergraduate|bachelor|degree or minor/i.test(s) &&
      !/prerequisite|bridge/i.test(s)
  );
  const found: string[] = [];
  for (const discipline of DISCIPLINE_VOCABULARY) {
    const pattern = new RegExp(`\\b${discipline}\\b`, "i");
    if (relevant.some((s) => pattern.test(s)) && !found.includes(discipline)) {
      found.push(discipline);
    }
  }
  return found;
}

/** Verbatim requirement sentences the structured model cannot represent. */
export function extractNotes(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const relevant = sentences.filter(
    (s) =>
      /\bECTS\b|\b[CL]P\b/i.test(s) ||
      // \bgrades?\b (not bare "grade") so "postgraduate"/"undergraduate"
      // background sentences do not become requirement notes.
      /\bgrades?\b|grading|CGPA|classification|2:[12]|upper second|first class/i.test(s) ||
      /TestDaF|DSH\b|telc|Goethe|CEFR|C1\b|B2\b/i.test(s)
  );
  const notes: string[] = [];
  for (const sentence of relevant) {
    const trimmed = sentence.trim();
    if (trimmed.length < 20 || trimmed.length > 400) continue;
    if (!notes.includes(trimmed)) notes.push(trimmed);
    if (notes.length >= 5) break;
  }
  return notes;
}
export function extractTuitionSentence(text: string): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const candidates = sentences.filter(
    (s) =>
      /[$£€₹]\s*[\d,]+/.test(s) &&
      (/tuition|fee|cost|pay|per year|per annum|annual|per credit|per semester/i.test(s) ||
        /international|overseas/i.test(s)) &&
      !/deposit|scholarship|discount|bursary|loan|instalment|installment|application fee|non-refundable|required to apply|photocop|stationery|textbook|accommodation|living cost|salary|salaries|wage|earn|award/i.test(s)
  );
  if (candidates.length === 0) return null;
  const international = candidates.find((s) =>
    /international|overseas|non-uk|outside the uk/i.test(s)
  );
  if (international != null) return international;
  // A figure can sit in its own table cell while the "international"
  // context lives in the preceding block ("International fees" heading).
  for (const candidate of candidates) {
    const previous =
      sentences[Math.max(0, sentences.indexOf(candidate) - 1)] ?? "";
    if (/international|overseas/i.test(previous)) return candidate;
  }
  return candidates[0] ?? null;
}

function mainText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, noscript").remove();
  const root = $("main").length > 0 ? $("main") : $("body");
  // Block-segmented text: list/table cells become their own sentences so
  // fee figures and deadline terms keep their local context.
  const blocks: string[] = [];
  root.find("h1, h2, h3, h4, p, li, td, th, dt, dd").each((_, element) => {
    const $element = $(element);
    if ($element.children("p, li, td, th").length > 0) return;
    const block = $element.text().replace(/\s+/g, " ").trim();
    if (block !== "") blocks.push(block);
  });
  if (blocks.length === 0) {
    return root.text().replace(/\s+/g, " ").trim();
  }
  // A fee heading ("Home / international fees 2026/27") and its figures
  // ("£11,800 / £19,450") often sit in adjacent blocks — merge them so
  // cost context survives sentence splitting. Bare money blocks also
  // inherit context from a preceding fee/international heading.
  const merged: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i] ?? "";
    const next = blocks[i + 1] ?? "";
    const hasMoney = (s: string): boolean => /[$£€₹]\s*[\d,]+/.test(s);
    const hasCostContext = (s: string): boolean =>
      /tuition|fees?|cost|international|overseas|home/i.test(s);
    if (
      /tuition|fees?|cost/i.test(block) &&
      !hasMoney(block) &&
      hasMoney(next)
    ) {
      merged.push(`${block} ${next}`);
      i++;
    } else if (
      hasMoney(block) &&
      !/tuition|fee|cost|pay|per year|per annum|annual|per credit|per semester/i.test(block) &&
      hasCostContext(blocks[i - 1] ?? "")
    ) {
      merged.push(`${blocks[i - 1] ?? ""} ${block}`);
    } else {
      merged.push(block);
    }
  }
  return merged.join(". ");
}

function cleanField(field: string): string | null {
  const cleaned = field
    .replace(/\bMaster of (Science|Arts)\b/i, " ")
    .replace(/\bDegree\b/i, "")
    .replace(/^[\s,–-]+|[\s,–-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^(in|of)\s+/i, "")
    .replace(/\s+(in|of)$/i, "")
    .trim();
  return cleaned !== "" ? cleaned : null;
}

function splitDegreeTitle(title: string): { name: string; degreeType: string | null; field: string | null } {
  const cleaned = title
    .replace(/\s+/g, " ")
    .replace(/\bM\.Sc\.?\b/gi, "MSc")
    .replace(/\bM\.S\.?\b/g, "MS")
    .replace(/\bPh\.D\.?\b/gi, "PhD")
    .trim();
  let degreeType: string | null = null;
  let remainder = cleaned;
  for (const { pattern, degreeType: found } of PARENTHETICAL_DEGREE) {
    if (pattern.test(remainder)) {
      degreeType = found;
      remainder = remainder.replace(pattern, " ");
      break;
    }
  }
  if (degreeType == null) {
    for (const { pattern, degreeType: found } of DEGREE_TOKENS) {
      if (pattern.test(remainder)) {
        degreeType = found;
        remainder = remainder.replace(pattern, " ");
        break;
      }
    }
  }
  if (degreeType == null) {
    return { name: cleaned, degreeType: null, field: null };
  }
  const field = cleanField(remainder);
  return {
    name: field != null ? `${field} ${degreeType}` : cleaned,
    degreeType,
    field,
  };
}

export function extractCourseCandidate(input: ExtractionInput): CourseCandidate {
  const evidence: string[] = [];
  const $ = cheerio.load(input.html);
  const rawTitle =
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    $("title").first().text().replace(/\s+/g, " ").trim();
  let parsed = splitDegreeTitle(rawTitle);
  if (parsed.degreeType == null) {
    // Fall back to the document title's first segment ("Site Name" suffixes
    // stripped): programme pages often carry the degree there.
    const titleSegment =
      $("title").first().text().split(/[|–—:-]/)[0]?.trim() ?? "";
    if (titleSegment !== "" && titleSegment !== rawTitle) {
      parsed = splitDegreeTitle(titleSegment);
    }
  }
  const name = input.programName ?? parsed.name;
  const degreeType = input.degreeType ?? parsed.degreeType;
  const field = input.field ?? parsed.field;
  evidence.push(`title: "${rawTitle}"`);

  const text = mainText(input.html);

  const suppressed = new Set(input.suppressFields ?? []);
  const gpa = suppressed.has("gpa") ? null : parseGpa(text);
  // Scale, in order of reliability: an explicitly stated scale ("3.2 out
  // of 4", "4.0 scale", "10-point scale") beats the US-only 4.0 heuristic;
  // anything else leaves the scale unknown rather than guessed.
  const explicitScale = (() => {
    if (gpa == null) return null;
    // Escape the float: an unescaped "." would match any character.
    const gpaStr = String(gpa).replace(".", "\\.");
    if (
      new RegExp(`${gpaStr}\\s+out of 4(\\.0)?\\b`, "i").test(text)
    ) {
      return 4;
    }
    if (/\b4\.0\s+scale\b/i.test(text) && gpa <= 4) return 4;
    if (/\b10(?:\.0)?[-\s]?point\s+scale\b/i.test(text) && gpa <= 10) {
      return 10;
    }
    // Explicit non-standard scales ("3.0/4.33") are honored as stated.
    const slashScale = new RegExp(
      `${gpaStr}\\s*/\\s*(\\d+(?:\\.\\d+)?)\\b`
    ).exec(text);
    if (slashScale?.[1] != null) {
      const scale = Number(slashScale[1]);
      if (Number.isFinite(scale) && scale > 0 && gpa <= scale) {
        // Scales must be positive integers for storage; anything else
        // (e.g. 4.33) stays unknown with a note rather than failing.
        if (!Number.isInteger(scale)) {
          evidence.push(
            `gpa scale ${scale} is not representable — left unknown`
          );
          return null;
        }
        return scale;
      }
    }
    return null;
  })();
  // Scale heuristic (documented): a GPA minimum at or below 4.0 on a US
  // university page is read as a 4.0-scale value. Anything else leaves the
  // scale unknown rather than guessed.
  if (suppressed.size > 0) {
    evidence.push(
      `suppressed fields (source disclaims hard cutoffs): ${[...suppressed].join(", ")}`
    );
  }
  const gpaScale =
    explicitScale ??
    (gpa != null &&
    gpa <= 4 &&
    input.universityCountry.toLowerCase() === "usa"
      ? 4
      : null);
  evidence.push(
    gpa != null ? `gpa: ${gpa}${gpaScale != null ? `/${gpaScale}` : " (scale unknown)"}` : "gpa: not stated"
  );
  const ielts = suppressed.has("ielts") ? null : parseIelts(text);
  evidence.push(ielts != null ? `ielts: ${ielts}` : "ielts: not stated");
  const toefl = suppressed.has("toefl") ? null : parseToefl(text);
  evidence.push(toefl != null ? `toefl: ${toefl}` : "toefl: not stated");

  const duration = suppressed.has("duration")
    ? null
    : parseDurationMonths(
        text,
        input.universityCountry.toLowerCase() === "germany" ? 6 : 4
      );
  evidence.push(duration != null ? `duration: ${duration} months` : "duration: not stated");

  const tuitionSentence =
    suppressed.has("tuition") ? null : extractTuitionSentence(text);
  const tuition =
    tuitionSentence != null ? parseTuition(tuitionSentence) : null;
  let tuitionAmount: number | null = null;
  let tuitionCurrency: string | null = null;
  let tuitionPeriod: CourseCandidate["tuitionPeriod"] = null;
  if (tuition != null) {
    if (tuition.period === "per-credit") {
      evidence.push("tuition: per-credit pricing without usable basis — left unknown");
    } else {
      // A bare "$" means the local dollar: resolve via the university's
      // country rather than defaulting everything to USD.
      const localCurrency: Record<string, string> = {
        canada: "CAD",
        australia: "AUD",
        ireland: "EUR",
        uk: "GBP",
        germany: "EUR",
        usa: "USD",
      };
      tuitionAmount = tuition.amount;
      tuitionCurrency =
        tuition.inferredCurrency === true
          ? (localCurrency[input.universityCountry.toLowerCase()] ?? tuition.currency)
          : tuition.currency;
      tuitionPeriod = tuition.period;
      evidence.push(`tuition: ${tuition.amount} ${tuitionCurrency} ${tuition.period}`);
    }
  } else {
    evidence.push("tuition: not stated");
  }

  const intakeScope = (() => {
    // Terms only count near scope words ("starts September 2027"): pages
    // often run navigation and prose together without sentence breaks, so
    // whole-sentence scoping would sweep up dissertation summers.
    const MONTHS = [
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
    ];
    // Single source of truth for intake scope words: the window opener
    // and the bare-month gate must agree, or months in windows opened
    // by "program start"/"start of" are silently dropped.
    const SCOPE_WORDS =
      "admit term|intake|start date|starts|next start|program start|start of|accepts applications|entry term|entry date|entry year";
    const scopeRe = new RegExp(SCOPE_WORDS, "gi");
    const windows: string[] = [];
    let scopeMatch: RegExpExecArray | null;
    while ((scopeMatch = scopeRe.exec(text)) !== null) {
      const start = Math.max(0, scopeMatch.index - 10);
      const end = scopeMatch.index + scopeMatch[0].length + 120;
      windows.push(text.slice(start, end));
      if (scopeMatch[0].length === 0) scopeRe.lastIndex += 1;
    }
    if (windows.length > 0) {
      // Deadline/decision sentences ("Overseas applicants: 12 August")
      // name months that are not intakes — drop them before parsing terms.
      // Likewise drop terms in negated context ("Summer starts are not
      // offered"). Bare months additionally need a scope word within 40
      // chars in the same window; seasons pass through (deadline tables
      // legitimately list terms).
      const scopeWordRe = new RegExp(SCOPE_WORDS, "i");
      const collected = new Set<string>();
      for (const window of windows) {
        const sentences = window.split(/(?<=[.!?])\s+/).filter(
          (sentence) =>
            !/deadline|decision|apply by|closing date|round \d|applicants?/i.test(
              sentence
            )
        );
        const usable = sentences.join(" ");
        for (const term of parseIntakes(usable)) {
          if (!MONTHS.includes(term)) {
            const occurrence = usable.search(new RegExp(`\\b${term}\\b`, "i"));
            if (occurrence === -1) continue;
            const context = usable.slice(
              Math.max(0, occurrence - 40),
              occurrence + term.length + 40
            );
            if (
              /not offered|not available|not accept[^.]{0,60}?\bstarts?\b|no .*?\b(starts?|intake|admission)\b/i.test(
                context
              )
            ) {
              continue;
            }
            collected.add(term);
            continue;
          }
          // Bare month: keep only near a scope word in the same window.
          const termIndex = usable.search(new RegExp(`\\b${term}\\b`));
          const scopeIndex = usable.search(scopeWordRe);
          if (
            termIndex !== -1 &&
            scopeIndex !== -1 &&
            Math.abs(termIndex - scopeIndex) <= 40 + term.length
          ) {
            collected.add(term);
          }
        }
      }
      return { terms: [...collected], scoped: true };
    }
    const sentences = text.split(/(?<=[.!?])\s+/);
    // Fallback: deadline/entry sentences only (never bare months), keeping a
    // season only when "not available"-style language is not adjacent to it.
    const deadlineScoped = sentences.filter((s) =>
      /admit term|intake|entry|deadline/i.test(s)
    );
    const seasons = ["Fall", "Spring", "Summer", "Winter"].filter((season) =>
      deadlineScoped.some((sentence) => {
        const index = sentence.search(new RegExp(`\\b${season}\\b`, "i"));
        if (index === -1) return false;
        const nearby = sentence.slice(Math.max(0, index - 10), index + 60);
        return !/not available|not offered|closed/i.test(nearby);
      })
    );
    return { terms: seasons, scoped: deadlineScoped.length > 0 };
  })();
  const intakes = intakeScope.terms;
  evidence.push(intakes.length > 0 ? `intakes: ${intakes.join(", ")}` : "intakes: not stated");

  const backgrounds = extractBackgrounds(text);
  evidence.push(
    backgrounds.length > 0
      ? `backgrounds: ${backgrounds.join(", ")}`
      : "backgrounds: not stated"
  );

  const workMonths = parseWorkExperienceMonths(text);
  const workRequired = /work experience[^.]{0,60}required|required[^.]{0,60}work experience/i.test(text);

  return {
    universityName: input.universityName,
    universityCountry: input.universityCountry,
    universityCity: input.universityCity,
    universityWebsite: input.universityWebsite,
    courseName: name,
    degreeType,
    field,
    durationMonths: duration,
    tuitionAmount,
    tuitionCurrency,
    tuitionPeriod,
    livingCostAmount: null,
    livingCostCurrency: null,
    livingCostPeriod: null,
    minimumGpa: gpa,
    minimumGpaScale: gpaScale,
    minimumIelts: ielts,
    minimumToefl: toefl,
    workExperienceRequired: workRequired,
    workExperienceMonthsRequired: workRequired ? workMonths : null,
    academicBackgrounds: backgrounds,
    intakes,
    careerTags: [],
    sourceUrl: input.sourceUrl,
    sourceName: input.sourceName,
    lastVerifiedAt: new Date(),
    notes: extractNotes(text),
    evidence,
  };
}
