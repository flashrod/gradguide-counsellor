import "dotenv/config";

import { closePool } from "../db/index.js";
import { getRecommendationsForStudent } from "../recommendations/service.js";
import { ingestSingleCourse } from "./pipeline/ingestCourse.js";
import { CollegeScorecardSource, loadScorecardConfig } from "./sources/collegeScorecard.js";
import { ritSource } from "./sources/universities/rit.js";
import type { CourseCandidate } from "./types.js";

/**
 * Demo ingestion command: `npm run ingest:demo`.
 *
 * ONE university (RIT) → ONE program (Computer Science MS) → extract →
 * validate → persist → prove the recommendation engine can use it.
 * Real HTTP for the program page; Scorecard enrichment is best-effort
 * (skipped without COLLEGESCOREDATA_API_KEY).
 */

const DEMO_STUDENT_ID = "66666666-6666-4366-8366-666666666666";

function check(label: string, value: unknown): string {
  const present =
    value != null && value !== "" && (!Array.isArray(value) || value.length > 0);
  return `${present ? "✓" : "·"} ${label}`;
}

function printCandidate(candidate: CourseCandidate): void {
  console.log(`University: ${candidate.universityName}`);
  console.log(`Program: ${candidate.courseName}`);
  console.log(`\nSource:\n${candidate.sourceUrl}`);
  console.log("\nExtraction:");
  console.log(check("university", candidate.universityName));
  console.log(check("course", candidate.courseName));
  console.log(check("degree", candidate.degreeType));
  console.log(check("duration", candidate.durationMonths));
  console.log(check("tuition", candidate.tuitionAmount));
  console.log(check("source", candidate.sourceUrl));
  const missing: string[] = [];
  if (candidate.durationMonths == null) missing.push("duration");
  if (candidate.tuitionAmount == null) missing.push("tuition");
  if (candidate.minimumGpa == null) missing.push("GPA");
  if (candidate.minimumIelts == null) missing.push("IELTS");
  if (candidate.minimumToefl == null) missing.push("TOEFL");
  if (candidate.intakes.length === 0) missing.push("intake");
  console.log("\nUnknown:");
  for (const field of missing) console.log(`- ${field}`);
  if (missing.length === 0) console.log("- none");
}

async function main(): Promise<void> {
  console.log("GradGuide Course Ingestion");
  console.log("--------------------------\n");

  const scorecard = new CollegeScorecardSource(loadScorecardConfig());
  if (scorecard.isConfigured) {
    try {
      const matches = await scorecard.getUniversities({
        name: "Rochester Institute of Technology",
        limit: 3,
      });
      console.log(
        `Scorecard: found ${matches.length} institution record(s) for enrichment.`
      );
    } catch (error) {
      console.log(
        `Scorecard: unavailable (${error instanceof Error ? error.message : error}), continuing without enrichment.`
      );
    }
  } else {
    console.log("Scorecard: no API key (COLLEGESCOREDATA_API_KEY), skipping enrichment.");
  }
  console.log("");

  const pages = await ritSource.discoverCourses();
  if (pages[0] == null) throw new Error("No program pages curated for the demo source.");
  const result = await ingestSingleCourse(ritSource, pages[0].url);

  printCandidate(result.candidate);
  console.log(`\nValidation:\n${result.tier}`);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.log(`! ${error}`);
  }
  const outcome = result.outcome;
  console.log("\nDatabase:");
  if (outcome == null) {
    console.log("✗ not inserted (INVALID)");
  } else if (outcome.coursesInserted > 0) {
    console.log("✓ inserted");
  } else if (outcome.coursesUpdated > 0) {
    console.log("✓ updated (already existed)");
  }

  console.log("\nReport:");
  console.log(`University discovered: 1`);
  console.log(`University processed: 1`);
  console.log(`\nCourses discovered: ${result.report.coursesDiscovered}`);
  console.log(`Courses valid: ${result.report.coursesValid}`);
  console.log(`Courses partial: ${result.report.coursesPartial}`);
  console.log(`Courses invalid: ${result.report.coursesInvalid}`);
  console.log(`\nInserted: ${outcome?.coursesInserted ?? 0}`);
  console.log(`Updated: ${outcome?.coursesUpdated ?? 0}`);
  console.log(`Duplicates skipped: ${outcome?.duplicatesSkipped ?? 0}`);

  // Prove the existing engine can use the ingested course.
  console.log("\nRecommendation check (demo student):");
  try {
    const { recommendations } = await getRecommendationsForStudent(DEMO_STUDENT_ID);
    const hit = recommendations.find(
      (r) => r.courseName === result.candidate.courseName
    );
    if (hit != null) {
      console.log(
        `✓ engine recommends "${hit.courseName}" — ${hit.eligibilityStatus}, score ${hit.overallScore}`
      );
    } else {
      console.log("· ingested course not in demo-student ranking (see warnings above)");
    }
  } catch (error) {
    console.log(
      `· recommendation check skipped (${error instanceof Error ? error.message : error})`
    );
  }
}

await main()
  .catch((error: unknown) => {
    console.error("Ingestion failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
