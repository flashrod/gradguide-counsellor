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

export interface StudentProfile {
  id: string;
  name: string;
  degree: string;
  field: string;
  /** Null = unknown, never treated as zero. */
  gpa: number | null;
  ielts: {
    overall: number | null;
    writing: number | null;
    reading: number | null;
    listening: number | null;
    speaking: number | null;
  };
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
}

export interface Course {
  id: string;
  universityId: string;
  universityName: string;
  universityCountry: string;
  name: string;
  field: string;
  durationMonths: number;
  tuitionAmount: number | null;
  tuitionCurrency: string | null;
  tuitionPeriod: CostPeriod | null;
  livingCostAmount: number | null;
  livingCostCurrency: string | null;
  livingCostPeriod: CostPeriod | null;
  minGpa: number | null;
  minIeltsOverall: number | null;
  minIeltsWriting: number | null;
  minIeltsReading: number | null;
  minIeltsListening: number | null;
  minIeltsSpeaking: number | null;
  workExperienceRequired: boolean;
  workExperienceMonthsRequired: number | null;
  careerTags: string[];
  academicBackgrounds: string[];
  intakes: string[];
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
  eligibilityStatus: EligibilityStatus;
  overallScore: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: Evidence[];
  warnings: Evidence[];
  estimatedTotalCost: EstimatedTotalCost | null;
}
