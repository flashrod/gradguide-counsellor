import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import {
  courses,
  universities,
  type NewCourse,
  type NewUniversity,
} from "../../db/schema.js";
import type { CourseCandidate, PersistOutcome } from "../types.js";
import { courseIdentityKey } from "../utils/dedupe.js";

/**
 * Persistence boundary (Milestone 4). The ONLY place that converts
 * CourseCandidates into Drizzle insert objects. Scraping/extraction code
 * never imports the schema.
 */

export function toNewUniversity(candidate: CourseCandidate): NewUniversity {
  return {
    name: candidate.universityName,
    country: candidate.universityCountry,
    city: candidate.universityCity ?? "Unknown",
    websiteUrl: candidate.universityWebsite ?? candidate.sourceUrl,
    logoUrl: null,
  };
}

export function toNewCourse(
  candidate: CourseCandidate,
  universityId: string
): NewCourse {
  return {
    universityId,
    name: candidate.courseName,
    degreeType: candidate.degreeType ?? "Unknown",
    field: candidate.field ?? "Unknown",
    durationMonths: candidate.durationMonths ?? 0,
    tuitionAmount: candidate.tuitionAmount,
    tuitionCurrency: candidate.tuitionCurrency,
    tuitionPeriod: candidate.tuitionPeriod,
    livingCostAmount: candidate.livingCostAmount,
    livingCostCurrency: candidate.livingCostCurrency,
    livingCostPeriod: candidate.livingCostPeriod,
    intakes: candidate.intakes,
    minGpa: candidate.minimumGpa,
    minGpaScale: candidate.minimumGpaScale,
    minIeltsOverall: candidate.minimumIelts,
    minIeltsWriting: null,
    minIeltsReading: null,
    minIeltsListening: null,
    minIeltsSpeaking: null,
    minToeflOverall: candidate.minimumToefl,
    workExperienceRequired: candidate.workExperienceRequired,
    workExperienceMonthsRequired: candidate.workExperienceMonthsRequired,
    careerTags: candidate.careerTags,
    academicBackgrounds: candidate.academicBackgrounds,
    eligibilityNotes:
      candidate.durationMonths == null
        ? "Duration not published on the source page; stored as 0 pending verification."
        : "",
    sourceUrl: candidate.sourceUrl,
    sourceName: candidate.sourceName,
    lastVerifiedAt: candidate.lastVerifiedAt,
  };
}

async function findExistingCourseId(
  candidate: CourseCandidate
): Promise<{ courseId: string; universityId: string } | null> {
  const wanted = courseIdentityKey(
    candidate.universityName,
    candidate.courseName,
    candidate.universityCountry
  );
  const rows = await db
    .select({ course: courses, university: universities })
    .from(courses)
    .innerJoin(universities, eq(courses.universityId, universities.id));
  for (const { course, university } of rows) {
    if (
      courseIdentityKey(university.name, course.name, university.country) === wanted
    ) {
      return { courseId: course.id, universityId: university.id };
    }
  }
  return null;
}

/**
 * Insert a validated candidate, or refresh the existing record when the
 * normalized identity already exists. INVALID-tier candidates must never
 * reach this function (the pipeline enforces that).
 */
export async function persistCandidate(
  candidate: CourseCandidate
): Promise<PersistOutcome> {
  const existing = await findExistingCourseId(candidate);
  if (existing != null) {
    const mapped = toNewCourse(candidate, existing.universityId);
    await db
      .update(courses)
      .set({ ...mapped, updatedAt: new Date() })
      .where(eq(courses.id, existing.courseId));
    return {
      universitiesInserted: 0,
      universitiesUpdated: 0,
      coursesInserted: 0,
      coursesUpdated: 1,
      duplicatesSkipped: 0,
    };
  }

  const [university] = await db
    .insert(universities)
    .values(toNewUniversity(candidate))
    .onConflictDoNothing({ target: universities.name })
    .returning({ id: universities.id });
  let universityId = university?.id;
  let universitiesInserted = 1;
  if (universityId == null) {
    const [row] = await db
      .select({ id: universities.id })
      .from(universities)
      .where(eq(universities.name, candidate.universityName))
      .limit(1);
    if (row == null) throw new Error("University upsert failed");
    universityId = row.id;
    universitiesInserted = 0;
  }
  await db.insert(courses).values(toNewCourse(candidate, universityId));
  return {
    universitiesInserted,
    universitiesUpdated: 0,
    coursesInserted: 1,
    coursesUpdated: 0,
    duplicatesSkipped: 0,
  };
}
