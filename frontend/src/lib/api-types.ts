/**
 * Typed mirrors of the backend API responses (Milestone 6).
 * Hand-maintained to match `backend/src/recommendations/`. Renders only —
 * no scoring, ranking, or eligibility logic lives here by design.
 */

export type EligibilityStatus = "eligible" | "ineligible" | "unknown";

export interface ApiEvidence {
  type: "positive" | "warning";
  category: string;
  message: string;
}

export interface ApiScoreBreakdown {
  academic: number;
  career: number;
  budget: number;
  eligibility: number;
  country: number;
  intake: number;
}

export interface ApiEstimatedCost {
  amount: number;
  currency: string;
}

export interface ApiRecommendation {
  courseId: string;
  universityId: string;
  courseName: string;
  universityName: string;
  universityCountry: string;
  sourceUrl: string;
  sourceName: string;
  lastVerifiedAt: string;
  intakes: string[];
  eligibilityStatus: EligibilityStatus;
  overallScore: number;
  scoreBreakdown: ApiScoreBreakdown;
  reasons: ApiEvidence[];
  warnings: ApiEvidence[];
  estimatedTotalCost: ApiEstimatedCost | null;
}

export interface ApiRecommendationsResponse {
  studentId: string;
  studentName: string;
  count: number;
  recommendations: ApiRecommendation[];
}

export interface ApiGpa {
  value: number | null;
  scale: number | null;
}

export interface ApiIelts {
  overall: number | null;
  writing: number | null;
  reading: number | null;
  listening: number | null;
  speaking: number | null;
}

export interface ApiStudent {
  id: string;
  name: string;
  degree: string;
  field: string;
  gpa: ApiGpa;
  ielts: ApiIelts;
  toeflOverall: number | null;
  budgetAmount: number | null;
  budgetCurrency: string | null;
  careerGoal: string | null;
  preferredCountries: string[];
  preferredIntake: string | null;
  workExperienceMonths: number | null;
}

export interface ApiStudentResponse {
  student: ApiStudent;
}
