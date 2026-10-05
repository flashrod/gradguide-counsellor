import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  courses,
  universities,
  type Course as DbCourse,
  type University as DbUniversity,
} from "../db/schema.js";

export class CourseNotFoundError extends Error {
  constructor(courseId: string) {
    super(`Course not found: ${courseId}`);
    this.name = "CourseNotFoundError";
  }
}

/**
 * Display-only course details for the comparison view (Milestone 9).
 * No scoring, no eligibility, no ranking — every computed value comes
 * from the existing recommendation response. Raw database IDs are
 * intentionally omitted.
 */
export interface CourseDetails {
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

/** Map stored rows to the display DTO. Exported for unit testing. */
export function toCourseDetails(
  row: DbCourse,
  university: DbUniversity
): CourseDetails {
  return {
    courseName: row.name,
    universityName: university.name,
    universityCountry: university.country,
    universityCity: university.city,
    degreeType: row.degreeType,
    field: row.field,
    durationMonths: row.durationMonths,
    tuitionAmount: row.tuitionAmount,
    tuitionCurrency: row.tuitionCurrency,
    tuitionPeriod: row.tuitionPeriod,
    livingCostAmount: row.livingCostAmount,
    livingCostCurrency: row.livingCostCurrency,
    livingCostPeriod: row.livingCostPeriod,
    minGpa: { value: row.minGpa, scale: row.minGpaScale },
    minIeltsOverall: row.minIeltsOverall,
    minIeltsWriting: row.minIeltsWriting,
    minIeltsReading: row.minIeltsReading,
    minIeltsListening: row.minIeltsListening,
    minIeltsSpeaking: row.minIeltsSpeaking,
    minToeflOverall: row.minToeflOverall,
    workExperienceRequired: row.workExperienceRequired,
    workExperienceMonthsRequired: row.workExperienceMonthsRequired,
    academicBackgrounds: [...row.academicBackgrounds],
    intakes: [...row.intakes],
    careerTags: [...row.careerTags],
    sourceUrl: row.sourceUrl,
    sourceName: row.sourceName,
    lastVerifiedAt: row.lastVerifiedAt.toISOString(),
  };
}

export async function getCourseDetails(courseId: string): Promise<CourseDetails> {
  const rows = await db
    .select({ course: courses, university: universities })
    .from(courses)
    .innerJoin(universities, eq(courses.universityId, universities.id))
    .where(eq(courses.id, courseId))
    .limit(1);
  const row = rows[0];
  if (row == null) throw new CourseNotFoundError(courseId);
  return toCourseDetails(row.course, row.university);
}
