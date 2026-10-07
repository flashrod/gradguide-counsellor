import { and, eq, ilike, or, sql, type SQL } from "drizzle-orm";

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

export interface CatalogueFilters {
  country?: string;
  field?: string;
  degree?: string;
  intake?: string;
  search?: string;
  currency?: string;
  limit?: number;
  offset?: number;
}

export interface CatalogueEntry {
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

/**
 * Distinct facet values for catalogue filters. Small catalogue — three
 * cheap distinct queries instead of a metadata table.
 */
export async function catalogueFacets(): Promise<{
  countries: string[];
  fields: string[];
  degrees: string[];
  currencies: string[];
  /** Total catalogue rows, matching listCatalogue (includes labelled demo rows). */
  total: number;
}> {
  const [countries, fields, degrees, currencies, total] = await Promise.all([
    db
      .selectDistinct({ value: universities.country })
      .from(universities)
      .orderBy(universities.country),
    db.selectDistinct({ value: courses.field }).from(courses).orderBy(courses.field),
    db
      .selectDistinct({ value: courses.degreeType })
      .from(courses)
      .orderBy(courses.degreeType),
    db
      .selectDistinct({ value: courses.tuitionCurrency })
      .from(courses)
      .orderBy(courses.tuitionCurrency),
    db.$count(courses),
  ]);
  return {
    countries: countries.map((r) => r.value),
    fields: fields.map((r) => r.value),
    degrees: degrees.map((r) => r.value),
    currencies: currencies
      .map((r) => r.value)
      .filter((v): v is string => v != null),
    total,
  };
}

/**
 * Server-side filtered catalogue listing for the Courses explorer UI.
 * Display data only — no scoring.
 */
export async function listCatalogue(
  filters: CatalogueFilters
): Promise<{ total: number; courses: CatalogueEntry[] }> {
  const conditions: (SQL | undefined)[] = [];
  if (filters.country != null && filters.country !== "") {
    conditions.push(eq(universities.country, filters.country));
  }
  if (filters.field != null && filters.field !== "") {
    conditions.push(eq(courses.field, filters.field));
  }
  if (filters.degree != null && filters.degree !== "") {
    conditions.push(eq(courses.degreeType, filters.degree));
  }
  if (filters.currency != null && filters.currency !== "") {
    conditions.push(eq(courses.tuitionCurrency, filters.currency));
  }
  if (filters.intake != null && filters.intake !== "") {
    conditions.push(
      sql`${courses.intakes} && ARRAY[${filters.intake}]::text[]`
    );
  }
  if (filters.search != null && filters.search !== "") {
    const term = `%${filters.search}%`;
    conditions.push(
      or(ilike(courses.name, term), ilike(universities.name, term))
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const countBase = db
    .select({ count: sql<number>`count(*)` })
    .from(courses)
    .innerJoin(universities, eq(courses.universityId, universities.id));
  const countRows = await (where != null ? countBase.where(where) : countBase);
  const total = Number(countRows[0]?.count ?? 0);

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);
  const listBase = db
    .select({ course: courses, university: universities })
    .from(courses)
    .innerJoin(universities, eq(courses.universityId, universities.id));
  const rows = await (where != null ? listBase.where(where) : listBase)
    .orderBy(universities.name, courses.name)
    .limit(limit)
    .offset(offset);

  return {
    total,
    courses: rows.map(({ course, university }) => ({
      id: course.id,
      courseName: course.name,
      universityName: university.name,
      country: university.country,
      degreeType: course.degreeType,
      field: course.field,
      durationMonths: course.durationMonths,
      tuitionAmount: course.tuitionAmount,
      tuitionCurrency: course.tuitionCurrency,
      tuitionPeriod: course.tuitionPeriod,
      intakes: [...course.intakes],
      minIeltsOverall: course.minIeltsOverall,
      minToeflOverall: course.minToeflOverall,
      sourceUrl: course.sourceUrl,
      sourceName: course.sourceName,
      lastVerifiedAt: course.lastVerifiedAt.toISOString(),
    })),
  };
}
