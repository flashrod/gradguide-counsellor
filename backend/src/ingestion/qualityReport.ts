import "dotenv/config";

import { db, closePool } from "../db/index.js";
import { courses, universities } from "../db/schema.js";

/**
 * Lightweight catalogue-quality report (Wave 2.5, Phase 9).
 *
 * Prints coverage by country plus deterministic suspicious/stale flags.
 * Run: npm run catalogue:report --workspace=gradguide-backend
 */

export interface QualityRow {
  universityName: string;
  country: string;
  courseName: string;
  tuitionAmount: number | null;
  minGpa: number | null;
  minIeltsOverall: number | null;
  minToeflOverall: number | null;
  intakes: string[];
  durationMonths: number | null;
  sourceUrl: string;
  lastVerifiedAt: Date;
}

export interface QualityFlag {
  course: string;
  reason: string;
}

export interface QualitySummary {
  total: number;
  byCountry: Record<string, number>;
  coverage: Record<string, number>;
  suspicious: QualityFlag[];
  stale: QualityFlag[];
}

const STALE_DAYS = 90;

export function summarizeQuality(rows: QualityRow[], now: Date = new Date()): QualitySummary {
  const byCountry: Record<string, number> = {};
  let tuition = 0;
  let gpa = 0;
  let ielts = 0;
  let toefl = 0;
  let intake = 0;
  let duration = 0;
  const suspicious: QualityFlag[] = [];
  const stale: QualityFlag[] = [];
  for (const row of rows) {
    const label = `${row.universityName} :: ${row.courseName}`;
    byCountry[row.country] = (byCountry[row.country] ?? 0) + 1;
    if (row.tuitionAmount != null) tuition += 1;
    if (row.minGpa != null) gpa += 1;
    if (row.minIeltsOverall != null) ielts += 1;
    if (row.minToeflOverall != null) toefl += 1;
    if (row.intakes.length > 0) intake += 1;
    if (row.durationMonths != null) duration += 1;
    // Deterministic suspicious-value flags (conservative thresholds).
    if (row.tuitionAmount != null && row.tuitionAmount <= 200) {
      suspicious.push({ course: label, reason: `tuition ${row.tuitionAmount} looks like a fee, not tuition` });
    }
    if (row.durationMonths === 0) {
      suspicious.push({ course: label, reason: "duration 0 is a legacy unpublished sentinel, should be null" });
    }
    if (row.durationMonths != null && row.durationMonths > 60) {
      suspicious.push({ course: label, reason: `duration ${row.durationMonths} months exceeds 5 years — verify` });
    }
    if (row.minToeflOverall != null && row.minToeflOverall < 60) {
      suspicious.push({ course: label, reason: `TOEFL ${row.minToeflOverall} below 60 — verify against iBT scale` });
    }
    if (row.minIeltsOverall != null && row.minIeltsOverall < 5.5) {
      suspicious.push({ course: label, reason: `IELTS ${row.minIeltsOverall} below 5.5 — verify` });
    }
    const ageDays = (now.getTime() - row.lastVerifiedAt.getTime()) / 86400000;
    if (ageDays > STALE_DAYS) {
      stale.push({ course: label, reason: `last verified ${Math.floor(ageDays)} days ago` });
    }
  }
  const total = rows.length;
  const pct = (n: number): number => (total === 0 ? 0 : Math.round((100 * n) / total));
  return {
    total,
    byCountry,
    coverage: {
      tuition: pct(tuition),
      gpa: pct(gpa),
      ielts: pct(ielts),
      toefl: pct(toefl),
      intake: pct(intake),
      duration: pct(duration),
    },
    suspicious,
    stale,
  };
}

async function main(): Promise<void> {
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select({
      universityName: universities.name,
      country: universities.country,
      courseName: courses.name,
      tuitionAmount: courses.tuitionAmount,
      minGpa: courses.minGpa,
      minIeltsOverall: courses.minIeltsOverall,
      minToeflOverall: courses.minToeflOverall,
      intakes: courses.intakes,
      durationMonths: courses.durationMonths,
      sourceUrl: courses.sourceUrl,
      lastVerifiedAt: courses.lastVerifiedAt,
    })
    .from(courses)
    .innerJoin(universities, eq(courses.universityId, universities.id));
  const real = rows.filter((r) => !r.universityName.includes("Demo"));
  const summary = summarizeQuality(
    real.map((r) => ({
      ...r,
      tuitionAmount: r.tuitionAmount != null ? Number(r.tuitionAmount) : null,
      minGpa: r.minGpa != null ? Number(r.minGpa) : null,
      minIeltsOverall: r.minIeltsOverall != null ? Number(r.minIeltsOverall) : null,
    }))
  );
  console.log("Catalogue quality (real programs only)");
  console.log("----------------------------------------");
  console.log(`Total real programs: ${summary.total}`);
  for (const [country, count] of Object.entries(summary.byCountry).sort()) {
    console.log(`  ${country}: ${count}`);
  }
  console.log("Metadata coverage:");
  for (const [field, pct] of Object.entries(summary.coverage)) {
    console.log(`  ${field}: ${pct}%`);
  }
  console.log(`Suspicious records: ${summary.suspicious.length}`);
  for (const flag of summary.suspicious) console.log(`  - ${flag.course} (${flag.reason})`);
  console.log(`Stale records (>90d): ${summary.stale.length}`);
  for (const flag of summary.stale.slice(0, 10)) console.log(`  - ${flag.course} (${flag.reason})`);
  if (summary.stale.length > 10) console.log(`  ... and ${summary.stale.length - 10} more`);
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Quality report failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
