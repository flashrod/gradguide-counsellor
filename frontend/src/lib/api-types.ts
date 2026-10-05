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

export type NextQuestionPriority = "HIGH" | "MEDIUM" | "LOW";

export interface ApiNextQuestion {
  field: string;
  priority: NextQuestionPriority;
  impactScore: number;
  affectedRecommendationCount: number;
  affectedRecommendationPercentage: number;
  consideredRecommendationCount: number;
  question: string;
  reason: string;
  affectedCourses: string[];
}

export interface ApiNextQuestionComplete {
  status: "complete";
  message: string;
}

export type ApiNextQuestionResponse = ApiNextQuestion | ApiNextQuestionComplete;

export interface ApiSimulationOverrides {
  gpa?: { value: number; scale: number };
  budget?: { amount: number; currency: string };
  preferredCountry?: string;
  preferredIntake?: string;
}

export type ApiRecommendationChange =
  | "NEWLY_ELIGIBLE"
  | "NO_LONGER_ELIGIBLE"
  | "RANK_UP"
  | "RANK_DOWN"
  | "UNCHANGED";

export interface ApiSimulationChange {
  courseId: string;
  courseName: string;
  change: ApiRecommendationChange;
  eligibilityChanged: boolean;
  oldRank: number | null;
  newRank: number | null;
  oldScore: number | null;
  newScore: number | null;
  scoreDelta: number | null;
}

export interface ApiSimulationSummary {
  movedUp: number;
  movedDown: number;
  newlyEligible: number;
  noLongerEligible: number;
  unchanged: number;
}

export interface ApiSimulationResponse {
  studentId: string;
  studentName: string;
  baseline: ApiRecommendation[];
  simulated: ApiRecommendation[];
  changes: ApiSimulationChange[];
  summary: ApiSimulationSummary;
}

export interface ApiCourseDetails {
  courseName: string;
  universityName: string;
  universityCountry: string;
  universityCity: string;
  degreeType: string;
  field: string;
  durationMonths: number | null;
  tuitionAmount: number | null;
  tuitionCurrency: string | null;
  tuitionPeriod: string | null;
  livingCostAmount: number | null;
  livingCostCurrency: string | null;
  livingCostPeriod: string | null;
  minGpa: { value: number | null; scale: number | null };
  minIeltsOverall: number | null;
  minIeltsWriting: number | null;
  minIeltsReading: number | null;
  minIeltsListening: number | null;
  minIeltsSpeaking: number | null;
  minToeflOverall: number | null;
  workExperienceRequired: boolean;
  workExperienceMonthsRequired: number | null;
  academicBackgrounds: string[];
  intakes: string[];
  careerTags: string[];
  sourceUrl: string;
  sourceName: string;
  lastVerifiedAt: string;
}

export interface ApiCourseDetailsResponse {
  course: ApiCourseDetails;
}
