import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { resumeExtractions, students } from "../db/schema.js";
import { getStudentById, StudentNotFoundError } from "../recommendations/service.js";
import type { StudentProfile } from "../recommendations/types.js";
import { DeterministicResumeExtractor, type ResumeExtractor } from "./extractor.js";
import { mapToProfileCandidate, type ProfileCandidate } from "./mapping.js";
import { extractPdfText, hasExtractableText } from "./pdf.js";
import type { ResumeExtraction } from "./schema.js";

/**
 * Resume ingestion service (Milestone 13).
 *
 * Upload (in-memory) → PDF text → deterministic extraction → validated
 * row (status needs_review) → counsellor review → explicit confirm.
 * Raw PDFs are never persisted. Every method takes the counsellor id
 * from `requireAuth` — rows are isolated per counsellor.
 */

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export class ResumeNotFoundError extends Error {
  constructor(id: string) {
    super(`Resume extraction not found: ${id}`);
    this.name = "ResumeNotFoundError";
  }
}

export class InvalidResumeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidResumeError";
  }
}

const PROFILE_FIELD_SOURCES = ["resume", "manual"] as const;

const confirmProfileSchema = z.object({
  degree: z.string().max(200).optional(),
  field: z.string().max(200).optional(),
  gpaValue: z.number().finite().min(0).optional(),
  gpaScale: z.number().int().positive().optional(),
  ieltsOverall: z.number().min(0).max(9).optional(),
  toeflOverall: z.number().int().min(0).max(120).optional(),
  workExperienceMonths: z.number().int().min(0).optional(),
  careerGoal: z.string().max(500).nullable().optional(),
  budgetAmount: z.number().finite().min(0).nullable().optional(),
  budgetCurrency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  preferredCountries: z.array(z.string().max(100)).max(20).optional(),
  preferredIntake: z.string().max(200).nullable().optional(),
});

const confirmBodySchema = z.object({
  studentId: z.string().uuid().optional(),
  createStudent: z.object({ name: z.string().min(1).max(200) }).optional(),
  profile: confirmProfileSchema,
  fieldSources: z.record(z.string(), z.enum(PROFILE_FIELD_SOURCES)),
});

export interface UploadInput {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  studentId?: string;
}

export interface ResumeDetail {
  id: string;
  studentId: string | null;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  status: string;
  errorMessage: string | null;
  extraction: ResumeExtraction | null;
  candidate: ProfileCandidate | null;
  confirmedFieldSources: Record<string, string> | null;
  confirmedAt: Date | null;
}

export function isPdfBytes(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
}

function sanitizeFileName(raw: string): string {
  // Never trust client filenames: strip paths, control chars, keep a tail.
  const base = raw.split(/[\\/]/).pop() ?? "resume.pdf";
  const clean = base.replace(/[^\w.\-() ]/g, "").trim().slice(-120);
  return clean.length > 0 ? clean : "resume.pdf";
}

async function buildExtraction(
  buffer: Buffer,
  extractor: ResumeExtractor
): Promise<{ pages: number; rawText: string; extraction: ResumeExtraction }> {
  const pdf = await extractPdfText(new Uint8Array(buffer));
  if (!hasExtractableText(pdf)) {
    throw new InvalidResumeError(
      "Text could not be extracted from this resume. Please upload a text-based PDF or use manual profile entry."
    );
  }
  const extraction = extractor.extract(pdf.pages);
  return { pages: pdf.pageCount, rawText: pdf.pages.join("\n\n"), extraction };
}

function toDetail(row: typeof resumeExtractions.$inferSelect): ResumeDetail {
  const extraction = (row.extraction ?? null) as ResumeExtraction | null;
  return {
    id: row.id,
    studentId: row.studentId,
    fileName: row.fileName,
    fileSizeBytes: row.fileSizeBytes,
    pageCount: row.pageCount,
    status: row.status,
    errorMessage: row.errorMessage,
    extraction,
    candidate: extraction != null ? mapToProfileCandidate(extraction) : null,
    confirmedFieldSources: (row.confirmedFieldSources ?? null) as Record<string, string> | null,
    confirmedAt: row.confirmedAt,
  };
}

export async function uploadResume(
  counsellorId: string,
  input: UploadInput,
  extractor: ResumeExtractor = new DeterministicResumeExtractor()
): Promise<ResumeDetail> {
  if (input.buffer.length === 0 || input.buffer.length > MAX_RESUME_BYTES) {
    throw new InvalidResumeError(`Resume must be a non-empty PDF under ${MAX_RESUME_BYTES / 1024 / 1024} MB.`);
  }
  if (!isPdfBytes(input.buffer)) {
    throw new InvalidResumeError("Only PDF resumes are accepted.");
  }
  let studentId: string | null = null;
  if (input.studentId != null) {
    await getStudentById(input.studentId);
    studentId = input.studentId;
  }
  try {
    const built = await buildExtraction(input.buffer, extractor);
    const [row] = await db
      .insert(resumeExtractions)
      .values({
        counsellorId,
        studentId,
        fileName: sanitizeFileName(input.fileName),
        fileSizeBytes: input.buffer.length,
        pageCount: built.pages,
        status: "needs_review",
        rawText: built.rawText,
        extraction: built.extraction,
      })
      .returning();
    if (row == null) throw new InvalidResumeError("Could not store the resume extraction.");
    return toDetail(row);
  } catch (error) {
    // Textless or unparsable PDFs become `failed` rows (with the reason)
    // rather than thrown errors, so the counsellor sees what happened.
    // Unknown students stay a hard 404.
    if (error instanceof StudentNotFoundError) throw error;
    const message = error instanceof Error ? error.message : "Extraction failed.";
    const [row] = await db
      .insert(resumeExtractions)
      .values({
        counsellorId,
        studentId,
        fileName: sanitizeFileName(input.fileName),
        fileSizeBytes: input.buffer.length,
        pageCount: 0,
        status: "failed",
        errorMessage: message.slice(0, 500),
      })
      .returning();
    if (row == null) throw new InvalidResumeError(message);
    return toDetail(row);
  }
}

export async function getResume(counsellorId: string, id: string): Promise<ResumeDetail> {
  const [row] = await db
    .select()
    .from(resumeExtractions)
    .where(eq(resumeExtractions.id, id))
    .limit(1);
  if (row == null || row.counsellorId !== counsellorId) throw new ResumeNotFoundError(id);
  return toDetail(row);
}

export interface ConfirmResult {
  studentId: string;
  student: StudentProfile;
}

export async function confirmResume(
  counsellorId: string,
  id: string,
  body: unknown
): Promise<ConfirmResult> {
  const parsed = confirmBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new InvalidResumeError(parsed.error.issues[0]?.message ?? "Invalid confirmation payload.");
  }
  const { studentId, createStudent, profile, fieldSources } = parsed.data;
  const [row] = await db
    .select()
    .from(resumeExtractions)
    .where(eq(resumeExtractions.id, id))
    .limit(1);
  if (row == null || row.counsellorId !== counsellorId) throw new ResumeNotFoundError(id);
  if (studentId != null && createStudent != null) {
    throw new InvalidResumeError("Provide either studentId or createStudent, not both.");
  }

  // Only explicitly provided fields are written — the resume never
  // auto-applies, and absent manual values stay untouched (unknown).
  const updates: Partial<{
    degree: string;
    field: string;
    gpa: number | null;
    gpaScale: number | null;
    ieltsOverall: number | null;
    toeflOverall: number | null;
    workExperienceMonths: number | null;
    careerGoal: string | null;
    budgetAmount: number | null;
    budgetCurrency: string | null;
    preferredCountries: string[];
    preferredIntake: string | null;
  }> = {};
  if (profile.degree !== undefined) updates.degree = profile.degree;
  if (profile.field !== undefined) updates.field = profile.field;
  if (profile.gpaValue !== undefined) {
    updates.gpa = profile.gpaValue;
    updates.gpaScale = profile.gpaScale ?? null;
  } else if (profile.gpaScale !== undefined) {
    updates.gpaScale = profile.gpaScale;
  }
  if (profile.ieltsOverall !== undefined) updates.ieltsOverall = profile.ieltsOverall;
  if (profile.toeflOverall !== undefined) updates.toeflOverall = profile.toeflOverall;
  if (profile.workExperienceMonths !== undefined) updates.workExperienceMonths = profile.workExperienceMonths;
  if (profile.careerGoal !== undefined) updates.careerGoal = profile.careerGoal;
  if (profile.budgetAmount !== undefined) updates.budgetAmount = profile.budgetAmount;
  if (profile.budgetCurrency !== undefined) updates.budgetCurrency = profile.budgetCurrency;
  if (profile.preferredCountries !== undefined) updates.preferredCountries = profile.preferredCountries;
  if (profile.preferredIntake !== undefined) updates.preferredIntake = profile.preferredIntake;

  const targetId = await db.transaction(async (tx) => {
    let target: string;
    if (createStudent != null) {
      const [created] = await tx
        .insert(students)
        .values({
          name: createStudent.name,
          degree: updates.degree ?? "",
          field: updates.field ?? "",
          gpa: updates.gpa ?? null,
          gpaScale: updates.gpaScale ?? null,
          ieltsOverall: updates.ieltsOverall ?? null,
          toeflOverall: updates.toeflOverall ?? null,
          workExperienceMonths: updates.workExperienceMonths ?? null,
          careerGoal: updates.careerGoal ?? null,
          budgetAmount: updates.budgetAmount ?? null,
          budgetCurrency: updates.budgetCurrency ?? null,
          preferredCountries: updates.preferredCountries ?? [],
          preferredIntake: updates.preferredIntake ?? null,
        })
        .returning({ id: students.id });
      if (created == null) throw new InvalidResumeError("Could not create the student profile.");
      target = created.id;
    } else if (studentId != null) {
      await getStudentById(studentId);
      if (Object.keys(updates).length > 0) {
        await tx.update(students).set(updates).where(eq(students.id, studentId));
      }
      target = studentId;
    } else {
      throw new InvalidResumeError("Provide either studentId or createStudent.");
    }
    await tx
      .update(resumeExtractions)
      .set({
        studentId: target,
        status: "confirmed",
        confirmedFieldSources: fieldSources,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(resumeExtractions.id, id));
    return target;
  });

  return { studentId: targetId, student: await getStudentById(targetId) };
}
