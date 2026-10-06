import { extractCourseCandidate } from "../extractors/courseExtractor.js";
import type { CuratedUniversitySource } from "../sources/universityWebsite.js";
import type { CourseCandidate, ValidationTier } from "../types.js";
import { persistCandidate } from "./persist.js";
import { validateCourseCandidate } from "../validation/courseSchema.js";

/**
 * Country-level ingestion run (Milestone 12). Iterates curated program
 * pages, never aborts on a single failure, and aggregates an honest
 * report. Dry-run skips persistence entirely.
 */

export interface CourseOutcome {
  url: string;
  courseName: string | null;
  tier: ValidationTier | "FETCH_FAILED" | "INVALID";
  errors: string[];
  missing: string[];
  inserted: boolean;
  updated: boolean;
}

export interface CountryReport {
  country: string;
  universitiesDiscovered: number;
  universitiesProcessed: number;
  coursesDiscovered: number;
  coursesAccepted: number;
  coursesRejected: number;
  inserted: number;
  updated: number;
  warnings: Record<string, number>;
  failures: { url: string; reason: string }[];
  durationMs: number;
  outcomes: CourseOutcome[];
}

function bump(warnings: Record<string, number>, key: string): void {
  warnings[key] = (warnings[key] ?? 0) + 1;
}

export interface SourceResult {
  coursesDiscovered: number;
  coursesAccepted: number;
  coursesRejected: number;
  inserted: number;
  updated: number;
  warnings: Record<string, number>;
  failures: { url: string; reason: string }[];
  outcomes: CourseOutcome[];
}

export async function ingestSource(
  source: CuratedUniversitySource,
  options: { limit?: number; dryRun?: boolean } = {}
): Promise<SourceResult> {
  const pages = await source.discoverCourses();
  const selected = options.limit != null ? pages.slice(0, options.limit) : pages;

  const warnings: Record<string, number> = {};
  const failures: { url: string; reason: string }[] = [];
  const outcomes: CourseOutcome[] = [];
  let inserted = 0;
  let updated = 0;
  let accepted = 0;
  let rejected = 0;

  for (const page of selected) {
    let html: string;
    try {
      html = await source.fetchCoursePage(page.url);
    } catch (error) {
      failures.push({
        url: page.url,
        reason: error instanceof Error ? error.message : String(error),
      });
      outcomes.push({
        url: page.url,
        courseName: page.title,
        tier: "FETCH_FAILED",
        errors: [error instanceof Error ? error.message : String(error)],
        missing: [],
        inserted: false,
        updated: false,
      });
      continue;
    }

    let candidate: CourseCandidate;
    try {
      const pageMeta = selected.find((p) => p.url === page.url);
      candidate = extractCourseCandidate({
        html,
        universityName: source.universityName,
        universityCountry: source.universityCountry,
        universityCity: source.universityCity,
        universityWebsite: source.universityWebsite,
        sourceUrl: page.url,
        sourceName: source.sourceName,
        programName: pageMeta?.programName ?? null,
        degreeType: pageMeta?.degreeType ?? null,
        field: pageMeta?.field ?? null,
        suppressFields: pageMeta?.suppressFields ?? [],
      });
    } catch (error) {
      failures.push({
        url: page.url,
        reason: `extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    const validation = validateCourseCandidate(candidate);
    for (const missing of validation.missing) bump(warnings, `missing ${missing}`);

    if (validation.tier === "INVALID") {
      rejected += 1;
      outcomes.push({
        url: page.url,
        courseName: candidate.courseName,
        tier: "INVALID",
        errors: validation.errors,
        missing: validation.missing,
        inserted: false,
        updated: false,
      });
      continue;
    }

    accepted += 1;
    if (options.dryRun === true) {
      outcomes.push({
        url: page.url,
        courseName: candidate.courseName,
        tier: validation.tier,
        errors: [],
        missing: validation.missing,
        inserted: false,
        updated: false,
      });
      continue;
    }

    const outcome = await persistCandidate(candidate);
    inserted += outcome.coursesInserted;
    updated += outcome.coursesUpdated;
    outcomes.push({
      url: page.url,
      courseName: candidate.courseName,
      tier: validation.tier,
      errors: [],
      missing: validation.missing,
      inserted: outcome.coursesInserted > 0,
      updated: outcome.coursesUpdated > 0,
    });
  }

  return {
    coursesDiscovered: selected.length,
    coursesAccepted: accepted,
    coursesRejected: rejected,
    inserted,
    updated,
    warnings,
    failures,
    outcomes,
  };
}
