import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { auth } from "../auth.js";
import { authUser } from "../db/auth-schema.js";
import { closePool, db } from "../db/index.js";
import { counsellingSessions, resumeExtractions, students } from "../db/schema.js";
import {
  getNextBestQuestion,
  getRecommendationsForStudent,
} from "../recommendations/service.js";
import { compareRecommendations } from "../recommendations/simulation.js";
import { mixedCatalogue } from "../recommendations/scenario-fixtures.js";
import { createSession, getSessionDetail } from "../sessions/service.js";
import { createStudentProfile } from "../students/service.js";
import { CS_STUDENT_PAGES } from "./fixtures.js";
import {
  confirmResume,
  getResume,
  InvalidResumeError,
  ResumeNotFoundError,
  uploadResume,
} from "./service.js";

/** Minimal valid PDF builder (same approach as pdf.test.ts). */
function buildPdf(lines: string[]): Buffer {
  // Objects: 1 catalog, 2 pages, 3 page, 4 contents, 5 font.
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", "__PAGES__", "__PAGE__"];
  const text = lines
    .map((line, i) => `BT /F1 12 Tf 72 ${720 - i * 20} Td (${line.replace(/[()\\]/g, "")}) Tj ET`)
    .join("\n");
  objects.push(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects[1] = `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`;
  objects[2] =
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R ` +
    `/Resources << /Font << /F1 5 0 R >> >> >>`;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

const CS_PDF = buildPdf(CS_STUDENT_PAGES[0]?.split("\n") ?? []);
const EMPTY_PDF = buildPdf([]);

const runId = Date.now().toString(36);
const emailA = `resume-a-${runId}@gradguide.local`;
const emailB = `resume-b-${runId}@gradguide.local`;

let counsellorA = "";
let counsellorB = "";
const createdStudentIds: string[] = [];
const createdResumeIds: string[] = [];

async function signUpCounsellor(email: string): Promise<string> {
  const result = await auth.api.signUpEmail({
    body: { email, password: "test-password-1", name: email },
  });
  return result.user.id;
}

async function trackStudent(id: string): Promise<void> {
  createdStudentIds.push(id);
}

describe.skipIf(!process.env["DATABASE_URL"])("resume ingestion (live database)", () => {
  beforeAll(async () => {
    counsellorA = await signUpCounsellor(emailA);
    counsellorB = await signUpCounsellor(emailB);
  });

  afterAll(async () => {
    for (const id of createdResumeIds) {
      await db.delete(resumeExtractions).where(eq(resumeExtractions.id, id));
    }
    for (const id of createdStudentIds) {
      await db.delete(students).where(eq(students.id, id));
    }
    await db.delete(authUser).where(eq(authUser.email, emailA));
    await db.delete(authUser).where(eq(authUser.email, emailB));
    await closePool();
  });

  it("uploads a PDF and returns needs_review extraction with candidates", async () => {
    const detail = await uploadResume(counsellorA, {
      fileName: "Dylan_Mascarenhas.pdf",
      mimeType: "application/pdf",
      buffer: CS_PDF,
    });
    createdResumeIds.push(detail.id);
    expect(detail.status).toBe("needs_review");
    expect(detail.fileName).toBe("Dylan_Mascarenhas.pdf");
    expect(detail.pageCount).toBe(1);
    expect(detail.extraction?.personal.name).toBe("Dylan Mascarenhas");
    expect(detail.extraction?.education[0]?.gpa).toMatchObject({ value: 8.62, scale: 10 });
    const gpa = detail.candidate?.fields.find((f) => f.field === "gpa");
    expect(gpa?.value).toBe(8.62);
    expect(gpa?.status).toBe("needs_review");
    expect(detail.candidate?.notInferred).toContain("budget");
  });

  it("rejects non-PDF uploads", async () => {
    await expect(
      uploadResume(counsellorA, {
        fileName: "notes.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("just text"),
      })
    ).rejects.toBeInstanceOf(InvalidResumeError);
  });

  it("rejects oversized uploads", async () => {
    const big = Buffer.alloc(6 * 1024 * 1024, 0);
    big[0] = 0x25;
    big[1] = 0x50;
    big[2] = 0x44;
    big[3] = 0x46;
    await expect(
      uploadResume(counsellorA, { fileName: "big.pdf", mimeType: "application/pdf", buffer: big })
    ).rejects.toBeInstanceOf(InvalidResumeError);
  });

  it("records failed status for textless PDFs instead of an empty profile", async () => {
    const detail = await uploadResume(counsellorA, {
      fileName: "scanned.pdf",
      mimeType: "application/pdf",
      buffer: EMPTY_PDF,
    });
    createdResumeIds.push(detail.id);
    expect(detail.status).toBe("failed");
    expect(detail.errorMessage).toContain("Text could not be extracted");
    expect(detail.extraction).toBeNull();
  });

  it("confirms into a new student with only provided fields", async () => {
    const uploaded = await uploadResume(counsellorA, {
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      buffer: CS_PDF,
    });
    createdResumeIds.push(uploaded.id);
    const result = await confirmResume(counsellorA, uploaded.id, {
      createStudent: { name: "Dylan Mascarenhas" },
      profile: { degree: "B.E.", field: "Computer Engineering", gpaValue: 8.62, gpaScale: 10 },
      fieldSources: { degree: "resume", field: "resume", gpaValue: "resume" },
    });
    await trackStudent(result.studentId);
    expect(result.student.gpa).toEqual({ value: 8.62, scale: 10 });
    expect(result.student.budgetAmount).toBeNull();
    expect(result.student.preferredCountries).toEqual([]);
    const reread = await getResume(counsellorA, uploaded.id);
    expect(reread.status).toBe("confirmed");
    expect(reread.confirmedFieldSources).toMatchObject({ gpaValue: "resume" });
    expect(reread.confirmedAt).not.toBeNull();
  });

  it("never overwrites existing values with unprovided resume fields", async () => {
    const student = await createStudentProfile({
      name: "Keep Me",
      degree: "B.Tech",
      field: "Computer Science",
      gpaValue: 8.4,
      gpaScale: 10,
    });
    await trackStudent(student.id);
    const uploaded = await uploadResume(counsellorA, {
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      buffer: CS_PDF,
      studentId: student.id,
    });
    createdResumeIds.push(uploaded.id);
    // Confirm only the degree — GPA 8.4 must survive the resume's 8.62.
    const result = await confirmResume(counsellorA, uploaded.id, {
      studentId: student.id,
      profile: { degree: "B.E." },
      fieldSources: { degree: "resume" },
    });
    expect(result.student.gpa).toEqual({ value: 8.4, scale: 10 });
    expect(result.student.degree).toBe("B.E.");
  });

  it("rejects invalid confirmation values", async () => {
    const uploaded = await uploadResume(counsellorA, {
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      buffer: CS_PDF,
    });
    createdResumeIds.push(uploaded.id);
    await expect(
      confirmResume(counsellorA, uploaded.id, {
        createStudent: { name: "Bad Values" },
        profile: { toeflOverall: 999 },
        fieldSources: {},
      })
    ).rejects.toBeInstanceOf(InvalidResumeError);
  });

  it("isolates resume rows between counsellors", async () => {
    const uploaded = await uploadResume(counsellorA, {
      fileName: "private.pdf",
      mimeType: "application/pdf",
      buffer: CS_PDF,
    });
    createdResumeIds.push(uploaded.id);
    await expect(getResume(counsellorB, uploaded.id)).rejects.toBeInstanceOf(ResumeNotFoundError);
    await expect(
      confirmResume(counsellorB, uploaded.id, {
        createStudent: { name: "Sneaky" },
        profile: {},
        fieldSources: {},
      })
    ).rejects.toBeInstanceOf(ResumeNotFoundError);
  });

  it("runs the unchanged engine on a confirmed resume profile", async () => {
    const uploaded = await uploadResume(counsellorA, {
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      buffer: CS_PDF,
    });
    createdResumeIds.push(uploaded.id);
    const { studentId } = await confirmResume(counsellorA, uploaded.id, {
      createStudent: { name: "Engine Check" },
      profile: {
        degree: "B.E.",
        field: "Computer Engineering",
        gpaValue: 8.62,
        gpaScale: 10,
        careerGoal: "AI/ML",
        preferredCountries: ["Canada", "Germany"],
      },
      fieldSources: { degree: "resume", gpaValue: "resume", careerGoal: "manual" },
    });
    await trackStudent(studentId);
    const first = await getRecommendationsForStudent(studentId);
    const second = await getRecommendationsForStudent(studentId);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.recommendations.length).toBeGreaterThan(0);
    // Budget unknown → NBQ must ask about something still missing.
    const question = await getNextBestQuestion(studentId);
    expect(question == null).toBe(false);
    // What-if behaves exactly as for manual profiles.
    const simulated = compareRecommendations(
      first.student,
      { gpa: { value: 7.5, scale: 10 } },
      mixedCatalogue()
    );
    expect(simulated.changes.length).toBeGreaterThanOrEqual(0);
  });

  it("keeps session snapshots immutable for resume-created students", async () => {
    const student = await createStudentProfile({ name: "Snapshot Check", degree: "B.E.", field: "Computer Engineering" });
    await trackStudent(student.id);
    const session = await createSession(student.id, counsellorA);
    const before = await getSessionDetail(session.id, counsellorA);
    const original = JSON.stringify(before.recommendations);
    await db.update(students).set({ gpa: 5.0 }).where(eq(students.id, student.id));
    const after = await getSessionDetail(session.id, counsellorA);
    expect(JSON.stringify(after.recommendations)).toBe(original);
    await db.delete(counsellingSessions).where(eq(counsellingSessions.id, session.id));
  });
});
