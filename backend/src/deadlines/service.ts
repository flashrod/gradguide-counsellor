import { and, eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { deadlines, students } from "../db/schema.js";
import { StudentNotFoundError } from "../recommendations/service.js";

/**
 * Deadline reminders (counsellor-owned). Thin DB helpers behind the
 * authenticated /api/deadlines routes — no scoring or ranking here.
 * Foreign rows 404 so one counsellor's reminders never leak to another.
 */

export class DeadlineNotFoundError extends Error {
  constructor(id = "unknown") {
    super(`Deadline not found: ${id}`);
    this.name = "DeadlineNotFoundError";
  }
}

export interface DeadlineRecord {
  id: string;
  studentId: string | null;
  studentName: string | null;
  title: string;
  dueDate: string;
  note: string | null;
  done: boolean;
}

export interface CreateDeadlineInput {
  title: string;
  dueDate: string;
  studentId?: string | null;
  note?: string | null;
}

async function studentNameFor(studentId: string | null): Promise<string | null> {
  if (studentId == null) return null;
  const [row] = await db
    .select({ name: students.name })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  return row?.name ?? null;
}

async function toRecord(
  row: typeof deadlines.$inferSelect
): Promise<DeadlineRecord> {
  const due = row.dueDate;
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: await studentNameFor(row.studentId),
    title: row.title,
    // Drizzle `date` mode returns a Date; the API speaks YYYY-MM-DD.
    dueDate: due instanceof Date ? due.toISOString().slice(0, 10) : due,
    note: row.note,
    done: row.done,
  };
}

export async function listDeadlines(counsellorId: string): Promise<DeadlineRecord[]> {
  const rows = await db
    .select()
    .from(deadlines)
    .where(eq(deadlines.counsellorId, counsellorId))
    .orderBy(deadlines.dueDate);
  return Promise.all(rows.map((row) => toRecord(row)));
}

export async function createDeadline(
  counsellorId: string,
  input: CreateDeadlineInput
): Promise<DeadlineRecord> {
  if (input.studentId != null && (await studentNameFor(input.studentId)) == null) {
    throw new StudentNotFoundError(input.studentId);
  }  const [row] = await db
    .insert(deadlines)
    .values({
      counsellorId,
      studentId: input.studentId ?? null,
      title: input.title,
      // Validated YYYY-MM-DD upstream; midnight UTC keeps the calendar date.
      dueDate: new Date(`${input.dueDate}T00:00:00Z`),
      note: input.note ?? null,
    })
    .returning();
  if (row == null) throw new Error("Could not create the deadline.");
  return toRecord(row);
}

export async function setDeadlineDone(
  counsellorId: string,
  deadlineId: string,
  done: boolean
): Promise<DeadlineRecord> {
  const [row] = await db
    .update(deadlines)
    .set({ done })
    .where(and(eq(deadlines.id, deadlineId), eq(deadlines.counsellorId, counsellorId)))
    .returning();
  if (row == null) throw new DeadlineNotFoundError(deadlineId);
  return toRecord(row);
}

export async function deleteDeadline(
  counsellorId: string,
  deadlineId: string
): Promise<void> {
  const [row] = await db
    .delete(deadlines)
    .where(and(eq(deadlines.id, deadlineId), eq(deadlines.counsellorId, counsellorId)))
    .returning({ id: deadlines.id });
  if (row == null) throw new DeadlineNotFoundError(deadlineId);
}
