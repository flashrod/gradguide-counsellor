/**
 * Domain types for the deterministic recommendation engine (Milestone 3).
 *
 * These are plain data interfaces, deliberately decoupled from Drizzle row
 * types so the engine is testable without a database. The DB service layer
 * (`service.ts`) converts rows into these shapes at the boundary.
 */

export type EligibilityStatus = "eligible" | "ineligible" | "unknown";

export type CostPeriod = "annual" | "total" | "semester" | "monthly";

export type EvidenceCategory =
  | "academic"
  | "career"
  | "budget"
  | "country"
  | "intake"
  | "eligibility"
  | "background"
  | "work-experience"
  | "gpa"
  | "ielts";

export interface Evidence {
  type: "positive" | "warning";
  category: EvidenceCategory;
  message: string;
}

/**
 * GPA values travel with their scale as two separate nullable fields
 * (mirroring the database columns). This preserves three distinct states:
 * no requirement/value (null value), unknown scale (value without scale),
 * and known (both present). Only the last is comparable.
 *
 * Normalized comparison (value/scale) is a prototype heuristic for ranking,
 * not an official admissions equivalency.
 */
export interface GpaValue {
  value: number | null;
  scale: number | null;
}

export interface StudentProfile {
  id: string;
  name: string;
  degree: string;
  field: string;
  /** GPA value + scale. Null value = unknown; value without scale = unknown scale. */
  gpa: GpaValue;
  ielts: {
    overall: number | null;
    writing: number | null;
    reading: number | null;
    listening: number | null;
    speaking: number | null;
  };
  /** TOEFL iBT overall (0–120). Null = unknown / not taken. */
  toeflOverall: number | null;
  /**
   * Maximum TOTAL programme budget (tuition + living combined).
   * Null = unknown. No currency conversion is performed.
   */
  budgetAmount: number | null;
  budgetCurrency: string | null;
  careerGoal: string | null;
  preferredCountries: string[];
  preferredIntake: string | null;
  /** Total months of work experience. Null = unknown. */
  workExperienceMonths: number | null;
  /**
   * Counsellor-entered MONTHLY living cost (rent etc.). Display-only:
   * the engine never scores it. Null = unknown.
   */
  livingCostAmount: number | null;
  livingCostCurrency: string | null;
}

export interface Course {
  id: string;
  universityId: string;
  universityName: string;
  universityCountry: string;
  name: string;
  field: string;
  durationMonths: number | null;
  tuitionAmount: number | null;
  tuitionCurrency: string | null;
  tuitionPeriod: CostPeriod | null;
  livingCostAmount: number | null;
  livingCostCurrency: string | null;
  livingCostPeriod: CostPeriod | null;
  /** Course minimum GPA value + scale (same tristate semantics as student GPA). */
  minGpa: GpaValue;
  minIeltsOverall: number | null;
  minIeltsWriting: number | null;
  minIeltsReading: number | null;
  minIeltsListening: number | null;
  minIeltsSpeaking: number | null;
  /** TOEFL iBT overall minimum (0–120). Alternative to IELTS, never additional. */
  minToeflOverall: number | null;
  workExperienceRequired: boolean;
  workExperienceMonthsRequired: number | null;
  careerTags: string[];
  academicBackgrounds: string[];
  intakes: string[];
  sourceUrl: string;
  sourceName: string;
  lastVerifiedAt: Date;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: Evidence[];
  warnings: Evidence[];
}

export interface ScoreBreakdown {
  academic: number;
  career: number;
  budget: number;
  eligibility: number;
  country: number;
  intake: number;
}

export interface EstimatedTotalCost {
  amount: number;
  currency: string;
}

export interface RecommendationResult {
  courseId: string;
  universityId: string;
  courseName: string;
  universityName: string;
  /** Display/provenance fields mapped from the stored rows (no logic). */
  universityCountry: string;
  sourceUrl: string;
  sourceName: string;
  /** ISO timestamp of last verification. */
  lastVerifiedAt: string;
  intakes: string[];
  eligibilityStatus: EligibilityStatus;
  overallScore: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: Evidence[];
  warnings: Evidence[];
  estimatedTotalCost: EstimatedTotalCost | null;
}
