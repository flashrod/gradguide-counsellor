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

export async function createStudentProfile(input: CreateStudentInput): Promise<StudentProfile> {
  const [row] = await db
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
