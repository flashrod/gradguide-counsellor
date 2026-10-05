import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  courses,
  students,
  universities,
  type Course as DbCourse,
  type Student as DbStudent,
  type University as DbUniversity,
} from "../db/schema.js";
import { rankRecommendations } from "./ranking.js";
import { getTopQuestion, type NextQuestionResult } from "./next-question.js";
import {
  compareRecommendations,
  type SimulationComparison,
  type SimulationOverrides,
} from "./simulation.js";
import type {
  CostPeriod,
  Course,
  RecommendationResult,
  StudentProfile,
} from "./types.js";

export class StudentNotFoundError extends Error {
  constructor(studentId: string) {
    super(`Student not found: ${studentId}`);
    this.name = "StudentNotFoundError";
  }
}

/**
 * Convert a Drizzle student row into the engine's domain shape.
 * Exported for testing the boundary mapping without a database.
 */
export function toDomainStudent(row: DbStudent): StudentProfile {
  return {
    id: row.id,
    name: row.name,
    degree: row.degree,
    field: row.field,
    gpa: { value: row.gpa, scale: row.gpaScale },
    ielts: {
      overall: row.ieltsOverall,
      writing: row.ieltsWriting,
      reading: row.ieltsReading,
      listening: row.ieltsListening,
      speaking: row.ieltsSpeaking,
    },
    toeflOverall: row.toeflOverall,
    budgetAmount: row.budgetAmount,
    budgetCurrency: row.budgetCurrency,
    careerGoal: row.careerGoal,
    preferredCountries: row.preferredCountries,
    preferredIntake: row.preferredIntake,
    workExperienceMonths: row.workExperienceMonths,
  };
}

/**
 * Convert Drizzle course + university rows into the engine's domain shape.
 * Exported for testing the boundary mapping without a database.
 */
export function toDomainCourse(
  row: DbCourse,
  university: DbUniversity
): Course {
  return {
    id: row.id,
    universityId: row.universityId,
    universityName: university.name,
    universityCountry: university.country,
    name: row.name,
    field: row.field,
    durationMonths: row.durationMonths,
    tuitionAmount: row.tuitionAmount,
    tuitionCurrency: row.tuitionCurrency,
    tuitionPeriod: row.tuitionPeriod as CostPeriod | null,
    livingCostAmount: row.livingCostAmount,
    livingCostCurrency: row.livingCostCurrency,
    livingCostPeriod: row.livingCostPeriod as CostPeriod | null,
    minGpa: { value: row.minGpa, scale: row.minGpaScale },
    minIeltsOverall: row.minIeltsOverall,
    minIeltsWriting: row.minIeltsWriting,
    minIeltsReading: row.minIeltsReading,
    minIeltsListening: row.minIeltsListening,
    minIeltsSpeaking: row.minIeltsSpeaking,
    minToeflOverall: row.minToeflOverall,
    workExperienceRequired: row.workExperienceRequired,
    workExperienceMonthsRequired: row.workExperienceMonthsRequired,
    careerTags: row.careerTags,
    academicBackgrounds: row.academicBackgrounds,
    intakes: row.intakes,
    sourceUrl: row.sourceUrl,
    sourceName: row.sourceName,
    lastVerifiedAt: row.lastVerifiedAt,
  };
}

/**
 * Load a single student for display. Returns the domain profile only —
 * no recommendations, no scoring.
 */
export async function getStudentById(studentId: string): Promise<StudentProfile> {
  const studentRows = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  const studentRow = studentRows[0];
  if (studentRow == null) throw new StudentNotFoundError(studentId);
  return toDomainStudent(studentRow);
}

/**
 * Load a student plus all candidate courses and return ranked
 * recommendations. This is the only impure layer: everything below
 * `rankRecommendations` is a pure function.
 */
export async function getRecommendationsForStudent(
  studentId: string
): Promise<{ student: StudentProfile; recommendations: RecommendationResult[] }> {
  const { student, courses } = await loadStudentAndCourses(studentId);
  return { student, recommendations: rankRecommendations(student, courses) };
}

async function loadStudentAndCourses(
  studentId: string
): Promise<{ student: StudentProfile; courses: Course[] }> {
  const studentRows = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  const studentRow = studentRows[0];
  if (studentRow == null) throw new StudentNotFoundError(studentId);

  const courseRows = await db
    .select({ course: courses, university: universities })
    .from(courses)
    .innerJoin(universities, eq(courses.universityId, universities.id));

  return {
    student: toDomainStudent(studentRow),
    courses: courseRows.map(({ course, university }) =>
      toDomainCourse(course, university)
    ),
  };
}

/**
 * Run a What-If simulation: rank the stored profile (baseline) and a
 * temporary overridden copy (simulated) with the same engine, then diff.
 * Read-only — the stored profile is never written.
 */
export async function simulateRecommendationsForStudent(
  studentId: string,
  overrides: SimulationOverrides
): Promise<
  SimulationComparison & { studentId: string; studentName: string }
> {
  const { student, courses } = await loadStudentAndCourses(studentId);
  return {
    studentId: student.id,
    studentName: student.name,
    ...compareRecommendations(student, overrides, courses),
  };
}

/**
 * The single most useful next question for a student, derived from current
 * recommendation output. Reuses the recommendation service — no duplicated
 * logic.
 */
export async function getNextBestQuestion(
  studentId: string
): Promise<NextQuestionResult> {
  const { student, recommendations } =
    await getRecommendationsForStudent(studentId);
  return getTopQuestion(student, recommendations);
}
