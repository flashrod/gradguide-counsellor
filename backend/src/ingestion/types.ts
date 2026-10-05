/**
 * Ingestion domain types (Milestone 4).
 *
 * The pipeline flows: fetch → extract → CourseCandidate → normalize →
 * validate → deduplicate → persist. Scraping code never touches Drizzle;
 * the persist layer maps candidates to insert objects at the boundary.
 */

export type CostPeriod = "annual" | "total" | "semester" | "monthly";

export interface CourseCandidate {
  universityName: string;
  universityCountry: string;
  universityCity: string | null;
  universityWebsite: string | null;
  courseName: string;
  degreeType: string | null;
  field: string | null;
  durationMonths: number | null;
  tuitionAmount: number | null;
  tuitionCurrency: string | null;
  tuitionPeriod: CostPeriod | null;
  livingCostAmount: number | null;
  livingCostCurrency: string | null;
  livingCostPeriod: CostPeriod | null;
  minimumGpa: number | null;
  /** Scale the GPA minimum is expressed on (e.g. 4 for 3.0/4.0). Null = unknown. */
  minimumGpaScale: number | null;
  minimumIelts: number | null;
  minimumToefl: number | null;
  workExperienceRequired: boolean;
  workExperienceMonthsRequired: number | null;
  academicBackgrounds: string[];
  intakes: string[];
  careerTags: string[];
  sourceUrl: string;
  sourceName: string;
  lastVerifiedAt: Date;
  /** Deterministic notes about what was found vs. missing. */
  evidence: string[];
}

export type ValidationTier = "VALID" | "PARTIAL" | "INVALID";

export interface ValidationResult {
  tier: ValidationTier;
  /** Optional fields that are missing (drives PARTIAL + the report). */
  missing: string[];
  /** Hard failures (range violations, missing identity/provenance). */
  errors: string[];
}

export interface UniversityCandidate {
  name: string;
  country: string;
  city: string | null;
  website: string | null;
  source: string;
}

export interface CoursePageCandidate {
  url: string;
  title: string | null;
}

export interface UniversityCourseSource {
  readonly id: string;
  discoverCourses(): Promise<CoursePageCandidate[]>;
  fetchCoursePage(url: string): Promise<string>;
}

export interface PersistOutcome {
  universitiesInserted: number;
  universitiesUpdated: number;
  coursesInserted: number;
  coursesUpdated: number;
  duplicatesSkipped: number;
}

export interface IngestionReport extends PersistOutcome {
  universityName: string;
  coursesDiscovered: number;
  coursesValid: number;
  coursesPartial: number;
  coursesInvalid: number;
}
