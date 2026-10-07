import { and, eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { students, visaChecklist } from "../db/schema.js";
import { StudentNotFoundError } from "../recommendations/service.js";
import { countriesFor, VISA_GUIDE } from "./content.js";

/**
 * Visa readiness progress (counsellor-owned). Steps are curated static
 * content; this service stores per-student completion only. Foreign rows
 * 404 so one counsellor's checklists never leak to another.
 */

export interface VisaStepState {
  key: string;
  title: string;
  detail: string;
  done: boolean;
}

export interface VisaCountryState {
  country: string;
  note: string;
  doneCount: number;
  totalCount: number;
  steps: VisaStepState[];
}

export class VisaCountryNotFoundError extends Error {
  constructor(country = "unknown") {
    super(`Visa guide not found: ${country}`);
    this.name = "VisaCountryNotFoundError";
  }
}

async function assertStudent(studentId: string): Promise<void> {
  const [row] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  if (row == null) throw new StudentNotFoundError(studentId);
}

export async function getVisaChecklist(
  counsellorId: string,
  studentId: string,
  preferredCountries: string[]
): Promise<VisaCountryState[]> {
  await assertStudent(studentId);
  const rows = await db
    .select()
    .from(visaChecklist)
    .where(
      and(
        eq(visaChecklist.counsellorId, counsellorId),
        eq(visaChecklist.studentId, studentId)
      )
    );
  const doneByKey = new Map(
    rows.map((row) => [`${row.country}:${row.itemKey}`, row.done])
  );
  return countriesFor(preferredCountries).map((country) => {
    const guide = VISA_GUIDE.find((g) => g.country === country);
    if (guide == null) throw new VisaCountryNotFoundError(country);
    const steps = guide.steps.map((step) => ({
      ...step,
      done: doneByKey.get(`${country}:${step.key}`) ?? false,
    }));
    return {
      country,
      note: guide.note,
      doneCount: steps.filter((s) => s.done).length,
      totalCount: steps.length,
      steps,
    };
  });
}

export async function setVisaStep(
  counsellorId: string,
  studentId: string,
  country: string,
  itemKey: string,
  done: boolean
): Promise<VisaCountryState[]> {
  await assertStudent(studentId);
  const guide = VISA_GUIDE.find((g) => g.country === country);
  if (guide == null) throw new VisaCountryNotFoundError(country);
  if (!guide.steps.some((step) => step.key === itemKey)) {
    throw new VisaCountryNotFoundError(`${country}:${itemKey}`);
  }
  await db
    .insert(visaChecklist)
    .values({ counsellorId, studentId, country, itemKey, done })
    .onConflictDoUpdate({
      target: [
        visaChecklist.counsellorId,
        visaChecklist.studentId,
        visaChecklist.country,
        visaChecklist.itemKey,
      ],
      set: { done },
    });
  const [student] = await db
    .select({ preferredCountries: students.preferredCountries })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  return getVisaChecklist(
    counsellorId,
    studentId,
    student?.preferredCountries ?? []
  );
}
