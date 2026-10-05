import "dotenv/config";

import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { closePool, db } from "../db/index.js";
import {
  counsellingSessions,
  courses,
  sessionNotes,
  students,
} from "../db/schema.js";
import {
  addSessionNote,
  createSession,
  endSession,
  getSessionDetail,
  listSessions,
  saveSessionComparison,
  saveSessionSimulation,
  SessionNotFoundError,
  updateSessionNote,
} from "./service.js";
import { StudentNotFoundError } from "../recommendations/service.js";

const DEMO_STUDENT_ID = "66666666-6666-4366-8366-666666666666";
const AI_COURSE_ID = "33333333-3333-4333-8333-333333333333";

const createdSessionIds: string[] = [];

async function trackSession(studentId: string): Promise<string> {
  const summary = await createSession(studentId, "test-counsellor");
  createdSessionIds.push(summary.id);
  return summary.id;
}

describe.skipIf(!process.env["DATABASE_URL"])("counselling sessions (live database)", () => {
  afterAll(async () => {
    if (createdSessionIds.length > 0) {
      for (const id of createdSessionIds) {
        await db.delete(counsellingSessions).where(eq(counsellingSessions.id, id));
      }
    }
    await closePool();
  });

  it("creates a session snapshotting current recommendations", async () => {
    const summary = await createSession(DEMO_STUDENT_ID, "test-counsellor");
    createdSessionIds.push(summary.id);
    expect(summary.studentId).toBe(DEMO_STUDENT_ID);
    expect(summary.status).toBe("ACTIVE");
    expect(summary.recommendationCount).toBeGreaterThan(0);
    expect(summary.topRecommendation?.score).toBeGreaterThan(0);
  });

  it("rejects unknown students without leaving rows behind", async () => {
    const before = await db.select({ id: counsellingSessions.id }).from(counsellingSessions);
    await expect(
      createSession("00000000-0000-4000-8000-000000000000", "test-counsellor")
    ).rejects.toBeInstanceOf(StudentNotFoundError);
    const after = await db.select({ id: counsellingSessions.id }).from(counsellingSessions);
    expect(after.length).toBe(before.length);
  });

  it("persists evidence and provenance in snapshots", async () => {
    const sessionId = await trackSession(DEMO_STUDENT_ID);
    const detail = await getSessionDetail(sessionId);
    expect(detail.recommendations.length).toBeGreaterThan(0);
    const [first] = detail.recommendations;
    const evidence = first?.evidence as { reasons: unknown[]; warnings: unknown[] } | null;
    expect(Array.isArray(evidence?.reasons)).toBe(true);
    const snapshot = first?.courseSnapshot as { sourceUrl?: string } | null;
    expect(snapshot?.sourceUrl).toMatch(/^https?:\/\//);
    expect(detail.questions.length).toBeGreaterThan(0);
    expect(detail.session.studentSnapshot).toMatchObject({ id: DEMO_STUDENT_ID });
  });

  it("keeps history stable when course data changes", async () => {
    const sessionId = await trackSession(DEMO_STUDENT_ID);
    const before = await getSessionDetail(sessionId);
    const target = before.recommendations.find((r) => r.courseId === AI_COURSE_ID);
    expect(target).toBeDefined();
    const originalScore = target?.score;
    const originalSnapshot = JSON.stringify(target?.courseSnapshot);

    await db
      .update(courses)
      .set({ tuitionAmount: 99999 })
      .where(eq(courses.id, AI_COURSE_ID));

    const after = await getSessionDetail(sessionId);
    const reread = after.recommendations.find((r) => r.courseId === AI_COURSE_ID);
    expect(reread?.score).toBe(originalScore);
    expect(JSON.stringify(reread?.courseSnapshot)).toBe(originalSnapshot);

    // Restore the seed value for other tests.
    await db
      .update(courses)
      .set({ tuitionAmount: 28500 })
      .where(eq(courses.id, AI_COURSE_ID));
  });

  it("lists sessions newest-first", async () => {
    await trackSession(DEMO_STUDENT_ID);
    const sessions = await listSessions(DEMO_STUDENT_ID);
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    expect(sessions[0]?.studentId).toBe(DEMO_STUDENT_ID);
  });

  it("ends a session idempotently", async () => {
    const sessionId = await trackSession(DEMO_STUDENT_ID);
    const ended = await endSession(sessionId);
    expect(ended.status).toBe("COMPLETED");
    expect(ended.endedAt).toBeInstanceOf(Date);
    const again = await endSession(sessionId);
    expect(again.status).toBe("COMPLETED");
  });

  it("saves simulations, comparisons, and notes", async () => {
    const sessionId = await trackSession(DEMO_STUDENT_ID);
    const simulation = await saveSessionSimulation(sessionId, {
      preferredCountry: "Canada",
    });
    expect(simulation.sessionId).toBe(sessionId);
    const comparison = await saveSessionComparison(sessionId, [
      "33333333-3333-4333-8333-333333333333",
      "44444444-4444-4344-8344-444444444444",
    ]);
    expect(comparison.sessionId).toBe(sessionId);
    const note = await addSessionNote(sessionId, "Prefers North America.");
    expect(note.content).toBe("Prefers North America.");
    const updated = await updateSessionNote(note.id, "Prefers North America, Fall intake.");
    expect(updated.content).toContain("Fall intake");
    const detail = await getSessionDetail(sessionId);
    expect(detail.simulations).toHaveLength(1);
    expect(detail.comparisons).toHaveLength(1);
    expect(detail.notes).toHaveLength(1);
  });

  it("rejects comparisons outside current recommendations", async () => {
    const sessionId = await trackSession(DEMO_STUDENT_ID);
    await expect(
      saveSessionComparison(sessionId, [
        "33333333-3333-4333-8333-333333333333",
        "00000000-0000-4000-8000-000000000000",
      ])
    ).rejects.toThrow();
  });

  it("throws SessionNotFoundError for unknown sessions", async () => {
    await expect(
      getSessionDetail("00000000-0000-4000-8000-000000000000")
    ).rejects.toBeInstanceOf(SessionNotFoundError);
  });

  it("cascades all artifacts when a student is deleted", async () => {
    const [temp] = await db
      .insert(students)
      .values({
        name: "Temp Cascade Student",
        degree: "BSc",
        field: "Physics",
        gpa: 7.0,
        gpaScale: 10,
        budgetAmount: 100000,
        budgetCurrency: "USD",
        preferredCountries: [],
      })
      .returning({ id: students.id });
    if (temp == null) throw new Error("temp student insert failed");
    const summary = await createSession(temp.id, "test-counsellor");
    await addSessionNote(summary.id, "temp note");
    await db.delete(students).where(eq(students.id, temp.id));
    const leftoverSessions = await db
      .select({ id: counsellingSessions.id })
      .from(counsellingSessions)
      .where(eq(counsellingSessions.id, summary.id));
    const leftoverNotes = await db
      .select({ id: sessionNotes.id })
      .from(sessionNotes)
      .where(eq(sessionNotes.sessionId, summary.id));
    expect(leftoverSessions).toHaveLength(0);
    expect(leftoverNotes).toHaveLength(0);
  });
});
