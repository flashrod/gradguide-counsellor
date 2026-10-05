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
    gpa: row.gpa,
    ielts: {
      overall: row.ieltsOverall,
      writing: row.ieltsWriting,
      reading: row.ieltsReading,
      listening: row.ieltsListening,
      speaking: row.ieltsSpeaking,
    },
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
    minGpa: row.minGpa,
    minIeltsOverall: row.minIeltsOverall,
    minIeltsWriting: row.minIeltsWriting,
    minIeltsReading: row.minIeltsReading,
    minIeltsListening: row.minIeltsListening,
    minIeltsSpeaking: row.minIeltsSpeaking,
    workExperienceRequired: row.workExperienceRequired,
    workExperienceMonthsRequired: row.workExperienceMonthsRequired,
    careerTags: row.careerTags,
    academicBackgrounds: row.academicBackgrounds,
    intakes: row.intakes,
  };
}

/**
 * Load a student plus all candidate courses and return ranked
 * recommendations. This is the only impure layer: everything below
 * `rankRecommendations` is a pure function.
 */
export async function getRecommendationsForStudent(
  studentId: string
): Promise<{ student: StudentProfile; recommendations: RecommendationResult[] }> {
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

  const student = toDomainStudent(studentRow);
  const domainCourses = courseRows.map(({ course, university }) =>
    toDomainCourse(course, university)
  );
  return { student, recommendations: rankRecommendations(student, domainCourses) };
}
