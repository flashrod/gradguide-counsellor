import { extractCourseCandidate } from "../extractors/courseExtractor.js";
import type { CuratedUniversitySource } from "../sources/universityWebsite.js";
import type {
  CourseCandidate,
  IngestionReport,
  PersistOutcome,
  ValidationTier,
} from "../types.js";
import { persistCandidate } from "./persist.js";
import { validateCourseCandidate } from "../validation/courseSchema.js";

/**
 * Single-course ingestion pipeline (Milestone 4):
 * fetch → extract → validate → deduplicate → persist.
 * INVALID-tier candidates are never persisted.
 */

export interface PipelineResult {
  candidate: CourseCandidate;
  tier: ValidationTier;
  missing: string[];
  errors: string[];
  outcome: PersistOutcome | null;
  report: IngestionReport;
}

const emptyOutcome: PersistOutcome = {
  universitiesInserted: 0,
  universitiesUpdated: 0,
  coursesInserted: 0,
  coursesUpdated: 0,
  duplicatesSkipped: 0,
};

export async function ingestSingleCourse(
  source: CuratedUniversitySource,
  programUrl: string
): Promise<PipelineResult> {
  const discovered = await source.discoverCourses();
  const known = discovered.some((page) => page.url === programUrl);
  if (!known) {
    throw new Error(`Program URL is not curated for source ${source.id}: ${programUrl}`);
  }

  const html = await source.fetchCoursePage(programUrl);
  const candidate = extractCourseCandidate({
    html,
    universityName: source.universityName,
    universityCountry: source.universityCountry,
    universityCity: source.universityCity,
    universityWebsite: source.universityWebsite,
    sourceUrl: programUrl,
    sourceName: source.sourceName,
  });

  const validation = validateCourseCandidate(candidate);

  let outcome: PersistOutcome | null = null;
  if (validation.tier !== "INVALID") {
    outcome = await persistCandidate(candidate);
  }

  const report: IngestionReport = {
    universityName: candidate.universityName,
    coursesDiscovered: discovered.length,
    coursesValid: validation.tier === "VALID" ? 1 : 0,
    coursesPartial: validation.tier === "PARTIAL" ? 1 : 0,
    coursesInvalid: validation.tier === "INVALID" ? 1 : 0,
    ...(outcome ?? emptyOutcome),
  };

  return { candidate, tier: validation.tier, missing: validation.missing, errors: validation.errors, outcome, report };
}
