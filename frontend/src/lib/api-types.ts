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

export interface ApiCatalogueEntry {
  id: string;
  courseName: string;
  universityName: string;
  country: string;
  degreeType: string;
  field: string;
  durationMonths: number | null;
  tuitionAmount: number | null;
  tuitionCurrency: string | null;
  tuitionPeriod: string | null;
  intakes: string[];
  minIeltsOverall: number | null;
  minToeflOverall: number | null;
  sourceUrl: string;
  sourceName: string;
  lastVerifiedAt: string;
}

export interface ApiCatalogueResponse {
  total: number;
  courses: ApiCatalogueEntry[];
}

export interface ApiCatalogueMeta {
  countries: string[];
  fields: string[];
  degrees: string[];
  currencies: string[];
}

export interface ApiSessionTopRecommendation {
  courseName: string;
  universityName: string;
  score: number;
}

export interface ApiSessionSummary {
  id: string;
  studentId: string;
  counsellorId: string;
  startedAt: string;
  endedAt: string | null;
  status: "ACTIVE" | "COMPLETED";
  recommendationCount: number;
  simulationCount: number;
  comparisonCount: number;
  noteCount: number;
  topRecommendation: ApiSessionTopRecommendation | null;
}

export interface ApiSessionRecommendationSnapshot {
  id: string;
  courseId: string;
  score: number;
  rank: number | null;
  eligibility: string | null;
  breakdown: ApiScoreBreakdown | null;
  evidence: { reasons: ApiEvidence[]; warnings: ApiEvidence[] } | null;
  courseSnapshot: Record<string, unknown> | null;
  estimatedCost: { amount: number; currency: string } | null;
}

export interface ApiSessionDetail {
  session: {
    id: string;
    studentId: string;
    counsellorId: string;
    startedAt: string;
    endedAt: string | null;
    status: "ACTIVE" | "COMPLETED";
    studentSnapshot: Record<string, unknown> | null;
  };
  recommendations: ApiSessionRecommendationSnapshot[];
  questions: {
    id: string;
    field: string;
    priority: string;
    impactScore: number;
    affectedCount: number;
    affectedPercentage: number;
    question: string;
    reason: string;
  }[];
  simulations: ApiSessionSimulation[];
  comparisons: ApiSessionComparison[];
  notes: { id: string; content: string }[];
}

export interface ApiSessionSimulation {
  id: string;
  overrides: Record<string, unknown>;
  baseline: unknown;
  simulated: unknown;
  result: {
    changes: {
      courseId: string;
      courseName: string;
      change: string;
      oldRank: number | null;
      newRank: number | null;
      oldScore: number | null;
      newScore: number | null;
      scoreDelta: number | null;
    }[];
    summary: {
      movedUp: number;
      movedDown: number;
      newlyEligible: number;
      noLongerEligible: number;
      unchanged: number;
    };
  };
  createdAt: string;
}

export interface ApiSessionComparison {
  id: string;
  courses: {
    recommendation: {
      courseId: string;
      courseName: string;
      overallScore: number;
      eligibilityStatus: string;
    } | null;
    details: { courseName: string; universityName: string } | null;
  }[];
  createdAt: string;
}

export interface ApiResumeFieldCandidate {
  field: string;
  value: string | number | null;
  scale: number | null;
  alternatives: { value: number; scale: number | null; snippet: string }[];
  source: "resume";
  status: "needs_review";
  evidence: string[];
}

export interface ApiResumeDetail {
  id: string;
  studentId: string | null;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  status: string;
  errorMessage: string | null;
  extraction: {
    personal: { name: string | null; email: string | null; phone: string | null; location: string | null };
    education: { institution: string | null; degree: string | null; field: string | null; startYear: number | null; endYear: number | null; gpa: { value: number; scale: number | null; kind: string; snippet: string } | null; coursework: string[]; snippet: string }[];
    experience: { company: string | null; role: string | null; startLabel: string | null; endLabel: string | null; description: string; technologies: string[] }[];
    projects: { name: string; description: string; technologies: string[] }[];
    skills: { languages: string[]; frameworks: string[]; databases: string[]; cloudTools: string[]; aiMl: string[]; other: string[] };
    certifications: { name: string; issuer: string | null }[];
    achievements: string[];
  } | null;
  candidate: { fields: ApiResumeFieldCandidate[]; notInferred: string[] } | null;
  confirmedFieldSources: Record<string, string> | null;
  confirmedAt: string | null;
}

export interface ApiStudentSummary {
  id: string;
  name: string;
  degree: string;
  field: string;
}
