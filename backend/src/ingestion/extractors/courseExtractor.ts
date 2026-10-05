import * as cheerio from "cheerio";

import {
  parseDurationMonths,
  parseGpa,
  parseIelts,
  parseIntakes,
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

/** Tuition is only accepted from sentences that discuss cost (avoids picking up scholarship/aside figures). */
export function extractTuitionSentence(text: string): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const candidate = sentences.find(
    (s) =>
      /\$[\d,]+/.test(s) &&
      /tuition|cost of attendance|per year|per credit|per semester|annual/i.test(s)
  );
  return candidate ?? null;
}

function mainText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, noscript").remove();
  const main = $("main").text() || $("article").text() || $("body").text();
  return main.replace(/\s+/g, " ").trim();
}

function splitDegreeTitle(title: string): { name: string; degreeType: string | null; field: string | null } {
  const cleaned = title.replace(/\s+/g, " ").trim();
  for (const { pattern, degreeType } of DEGREE_TOKENS) {
    if (pattern.test(cleaned)) {
      const field = cleaned
        .replace(pattern, "")
        .replace(/\bDegree\b/i, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      return {
        name: field !== "" ? `${field} ${degreeType}` : cleaned,
        degreeType,
        field: field !== "" ? field : null,
      };
    }
  }
  return { name: cleaned, degreeType: null, field: null };
}

export function extractCourseCandidate(input: ExtractionInput): CourseCandidate {
  const evidence: string[] = [];
  const $ = cheerio.load(input.html);
  const rawTitle =
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    $("title").first().text().replace(/\s+/g, " ").trim();
  const { name, degreeType, field } = splitDegreeTitle(rawTitle);
  evidence.push(`title: "${rawTitle}"`);

  const text = mainText(input.html);

  const gpa = parseGpa(text);
  evidence.push(gpa != null ? `gpa: ${gpa}` : "gpa: not stated");
  const ielts = parseIelts(text);
  evidence.push(ielts != null ? `ielts: ${ielts}` : "ielts: not stated");
  const toefl = parseToefl(text);
  evidence.push(toefl != null ? `toefl: ${toefl}` : "toefl: not stated");

  const duration = parseDurationMonths(text);
  evidence.push(duration != null ? `duration: ${duration} months` : "duration: not stated");

  const tuitionSentence = extractTuitionSentence(text);
  const tuition =
    tuitionSentence != null ? parseTuition(tuitionSentence) : null;
  let tuitionAmount: number | null = null;
  let tuitionCurrency: string | null = null;
  let tuitionPeriod: CourseCandidate["tuitionPeriod"] = null;
  if (tuition != null) {
    if (tuition.period === "per-credit") {
      evidence.push("tuition: per-credit pricing without usable basis — left unknown");
    } else {
      tuitionAmount = tuition.amount;
      tuitionCurrency = tuition.currency;
      tuitionPeriod = tuition.period;
      evidence.push(`tuition: ${tuition.amount} ${tuition.currency} ${tuition.period}`);
    }
  } else {
    evidence.push("tuition: not stated");
  }

  const intakeScope = (() => {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const scoped = sentences.filter((s) => /admit term|intake/i.test(s));
    return scoped.length > 0 ? scoped.join(" ") : text;
  })();
  const intakes = parseIntakes(intakeScope);
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
    evidence,
  };
}
