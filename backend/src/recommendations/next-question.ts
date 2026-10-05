import { normalizeGpa } from "./gpa.js";
import type {
  RecommendationResult,
  StudentProfile,
} from "./types.js";

/**
 * Deterministic Next Best Question engine (Milestone 7).
 *
 * Consumes existing recommendation output — no scoring, no ranking, no I/O.
 * For each student-side unknown, it measures how much uncertainty that
 * unknown injects into the CURRENT ranked list, then asks about the
 * highest-impact one.
 *
 * Impact formula (documented heuristic, NOT a probability):
 *   coverage     = affected / considered            (considered = top 10 max)
 *   rankCoverage = Σ 1/(1+rank) over affected / Σ 1/(1+rank) over considered
 *   impact       = round(100 × (0.5 × coverage + 0.5 × rankCoverage))
 * Rank #1 therefore moves the needle more than rank #10.
 *
 * Priority: HIGH ≥ 70, MEDIUM 40–69, LOW < 40 (initial product heuristics).
 * Ties: impact desc → affected count desc → fixed field order → field name.
 */

export type QuestionField =
  | "budget"
  | "country"
  | "intake"
  | "academic"
  | "english"
  | "work-experience"
  | "career";

export type QuestionPriority = "HIGH" | "MEDIUM" | "LOW";

export interface NextBestQuestion {
  field: QuestionField;
  priority: QuestionPriority;
  impactScore: number;
  affectedRecommendationCount: number;
  affectedRecommendationPercentage: number;
  consideredRecommendationCount: number;
  question: string;
  reason: string;
  affectedCourses: string[];
}

export interface NoQuestion {
  status: "complete";
  message: string;
}

export type NextQuestionResult = NextBestQuestion | NoQuestion;

export const HIGH_IMPACT_THRESHOLD = 70;
export const MEDIUM_IMPACT_THRESHOLD = 40;
export const TOP_CONSIDERED = 10;

/** Fixed field order for deterministic tie-breaking (product heuristic). */
const FIELD_ORDER: QuestionField[] = [
  "english",
  "budget",
  "academic",
  "career",
  "work-experience",
  "intake",
  "country",
];

const TEMPLATES: Record<QuestionField, { question: string; reason: (count: number, total: number) => string }> = {
  budget: {
    question:
      "What is the maximum total budget you're comfortable spending on the entire program?",
    reason: (count, total) =>
      `Your budget is unknown and could affect ${count} of your top ${total} recommendations.`,
  },
  country: {
    question: "Which countries are you open to studying in?",
    reason: (count, total) =>
      `Your preferred study destination is unknown, which affects country fit across ${count} of your top ${total} recommendations.`,
  },
  intake: {
    question: "When would you ideally like to start your program?",
    reason: (count, total) =>
      `Your preferred intake is unclear for ${count} of your top ${total} recommendations.`,
  },
  academic: {
    question: "What was your undergraduate GPA and grading scale?",
    reason: (count, total) =>
      `Your GPA is unknown and affects academic fit for ${count} of your top ${total} recommendations.`,
  },
  english: {
    question:
      "Do you have an IELTS, TOEFL, or equivalent English-language score?",
    reason: (count, total) =>
      `Your English-language requirement is unresolved for ${count} of your top ${total} recommendations.`,
  },
  "work-experience": {
    question: "How many months of relevant work experience do you have?",
    reason: (count, total) =>
      `Work experience is unresolved for ${count} of your top ${total} recommendations.`,
  },
  career: {
    question: "What kind of role do you want this degree to prepare you for?",
    reason: (count, total) =>
      `Your career goal is unknown and affects career fit for ${count} of your top ${total} recommendations.`,
  },
};

function hasWarning(rec: RecommendationResult, category: string): boolean {
  const warnings = Array.isArray(rec.warnings) ? rec.warnings : [];
  return warnings.some((w) => w?.category === category);
}

function studentGpaKnown(student: StudentProfile): boolean {
  return normalizeGpa(student.gpa) != null;
}

function studentEnglishKnown(student: StudentProfile): boolean {
  return student.ielts.overall != null || student.toeflOverall != null;
}

/**
 * Indices (into the considered list) whose outcome could change once the
 * student answers the field's question. A field with no affected
 * recommendations is not a candidate at all — irrelevant unknowns are
 * never asked about.
 */
function affectedIndices(
  field: QuestionField,
  student: StudentProfile,
  considered: RecommendationResult[]
): number[] {
  const out: number[] = [];
  considered.forEach((rec, index) => {
    let affected = false;
    switch (field) {
      case "budget":
        affected =
          student.budgetAmount == null && hasWarning(rec, "budget");
        break;
      case "country":
        affected = student.preferredCountries.length === 0;
        break;
      case "intake":
        affected =
          student.preferredIntake == null
            ? true
            : hasWarning(rec, "intake");
        break;
      case "academic":
        affected = !studentGpaKnown(student) && hasWarning(rec, "gpa");
        break;
      case "english":
        affected = !studentEnglishKnown(student) && hasWarning(rec, "ielts");
        break;
      case "work-experience":
        affected =
          student.workExperienceMonths == null &&
          hasWarning(rec, "work-experience");
        break;
      case "career":
        affected =
          (student.careerGoal == null || student.careerGoal.trim() === "") &&
          hasWarning(rec, "career");
        break;
    }
    if (affected) out.push(index);
  });
  return out;
}

function priorityFor(impact: number): QuestionPriority {
  if (impact >= HIGH_IMPACT_THRESHOLD) return "HIGH";
  if (impact >= MEDIUM_IMPACT_THRESHOLD) return "MEDIUM";
  return "LOW";
}

interface Candidate extends NextBestQuestion {
  order: number;
}

function buildCandidate(
  field: QuestionField,
  indices: number[],
  considered: RecommendationResult[]
): Candidate {
  const total = considered.length;
  const coverage = indices.length / total;
  const decay = (i: number): number => 1 / (1 + i);
  const totalWeight = considered.reduce((sum, _, i) => sum + decay(i), 0);
  const affectedWeight = indices.reduce((sum, i) => sum + decay(i), 0);
  const rankCoverage = totalWeight === 0 ? 0 : affectedWeight / totalWeight;
  const impactScore = Math.round(100 * (0.5 * coverage + 0.5 * rankCoverage));
  const template = TEMPLATES[field];
  return {
    field,
    priority: priorityFor(impactScore),
    impactScore,
    affectedRecommendationCount: indices.length,
    affectedRecommendationPercentage: Math.round((indices.length / total) * 100),
    consideredRecommendationCount: total,
    question: template.question,
    reason: template.reason(indices.length, total),
    affectedCourses: indices.map((i) => considered[i]?.courseName ?? "Unknown course"),
    order: FIELD_ORDER.indexOf(field),
  };
}

/**
 * Rank all candidate questions for a student given current recommendations.
 * Pure: same inputs → same order. Empty when nothing useful can be asked.
 */
export function rankQuestions(
  student: StudentProfile,
  recommendations: RecommendationResult[]
): NextBestQuestion[] {
  const considered = recommendations.slice(0, TOP_CONSIDERED);
  if (considered.length === 0) return [];
  const fields: QuestionField[] = [
    "budget",
    "country",
    "intake",
    "academic",
    "english",
    "work-experience",
    "career",
  ];
  const candidates: Candidate[] = [];
  for (const field of fields) {
    const indices = affectedIndices(field, student, considered);
    if (indices.length === 0) continue;
    candidates.push(buildCandidate(field, indices, considered));
  }
  candidates.sort((a, b) => {
    if (b.impactScore !== a.impactScore) return b.impactScore - a.impactScore;
    if (b.affectedRecommendationCount !== a.affectedRecommendationCount) {
      return b.affectedRecommendationCount - a.affectedRecommendationCount;
    }
    if (a.order !== b.order) return a.order - b.order;
    return a.field < b.field ? -1 : a.field > b.field ? 1 : 0;
  });
  return candidates.map(({ order: _order, ...rest }) => rest);
}

/** The single most useful question, or a complete state when nothing helps. */
export function getTopQuestion(
  student: StudentProfile,
  recommendations: RecommendationResult[]
): NextQuestionResult {
  const [top] = rankQuestions(student, recommendations);
  if (top == null) {
    return {
      status: "complete",
      message: "We have enough information to make the current recommendations.",
    };
  }
  return top;
}
