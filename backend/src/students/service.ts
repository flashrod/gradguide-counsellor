import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { students } from "../db/schema.js";
import { getStudentById } from "../recommendations/service.js";
import type { StudentProfile } from "../recommendations/types.js";

/**
 * Student profile management (Milestone 13). Thin DB helpers behind the
 * authenticated /api/students routes — no scoring or ranking here.
 */

export interface CreateStudentInput {
  name: string;
  degree?: string;
  field?: string;
  gpaValue?: number | null;
  gpaScale?: number | null;
  budgetAmount?: number | null;
  budgetCurrency?: string | null;
}

export interface StudentSummary {
  id: string;
  name: string;
  degree: string;
  field: string;
}

export async function listStudentProfiles(): Promise<StudentSummary[]> {
  return db
    .select({ id: students.id, name: students.name, degree: students.degree, field: students.field })
    .from(students)
    .orderBy(students.name)
    .limit(100);
}

export async function createStudentProfile(input: CreateStudentInput): Promise<StudentProfile> {  const [row] = await db
    .insert(students)
    .values({
      name: input.name,
      degree: input.degree ?? "",
      field: input.field ?? "",
      gpa: input.gpaValue ?? null,
      gpaScale: input.gpaScale ?? null,
      budgetAmount: input.budgetAmount ?? null,
      budgetCurrency: input.budgetCurrency ?? null,
    })
    .returning({ id: students.id });
  if (row == null) throw new Error("Could not create the student profile.");
  return getStudentById(row.id);
}

/**
 * Partial profile update — the "answer the next-best-question" write path.
 * Only the supplied keys change; everything else stays as-is. Snapshots
 * taken by past sessions are copies, so history never rewrites.
 */
export interface UpdateStudentInput {
  gpaValue?: number | null;
  gpaScale?: number | null;
  ieltsOverall?: number | null;
  toeflOverall?: number | null;
  budgetAmount?: number | null;
  budgetCurrency?: string | null;
  careerGoal?: string | null;
  preferredCountries?: string[];
  preferredIntake?: string | null;
  workExperienceMonths?: number | null;
}

export async function updateStudentProfile(
  studentId: string,
  input: UpdateStudentInput
): Promise<StudentProfile> {
  const patch: Partial<typeof students.$inferInsert> = {};
  if (input.gpaValue !== undefined) patch.gpa = input.gpaValue;
  if (input.gpaScale !== undefined) patch.gpaScale = input.gpaScale;
  if (input.ieltsOverall !== undefined) patch.ieltsOverall = input.ieltsOverall;
  if (input.toeflOverall !== undefined) patch.toeflOverall = input.toeflOverall;
  if (input.budgetAmount !== undefined) patch.budgetAmount = input.budgetAmount;
  if (input.budgetCurrency !== undefined) patch.budgetCurrency = input.budgetCurrency;
  if (input.careerGoal !== undefined) patch.careerGoal = input.careerGoal;
  if (input.preferredCountries !== undefined) {
    patch.preferredCountries = input.preferredCountries;
  }
  if (input.preferredIntake !== undefined) patch.preferredIntake = input.preferredIntake;
  if (input.workExperienceMonths !== undefined) {
    patch.workExperienceMonths = input.workExperienceMonths;
  }
  if (Object.keys(patch).length === 0) {
    // Nothing to change — still validates the student exists.
    return getStudentById(studentId);
  }
  await db.update(students).set(patch).where(eq(students.id, studentId));
  // Throws StudentNotFoundError when the id does not exist.
  return getStudentById(studentId);
}
