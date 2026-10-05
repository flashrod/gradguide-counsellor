import { and, desc, eq } from "drizzle-orm";

import { toCourseDetails } from "../courses/details.js";
import { db } from "../db/index.js";
import {
  counsellingSessions,
  courses,
  sessionComparisons,
  sessionNotes,
  sessionQuestions,
  sessionRecommendations,
  sessionSimulations,
  universities,
  type NewSessionComparison,
  type NewSessionQuestion,
  type NewSessionRecommendation,
  type NewSessionSimulation,
} from "../db/schema.js";
import {
  getNextBestQuestion,
  getRecommendationsForStudent,
  getStudentById,
  StudentNotFoundError,
} from "../recommendations/service.js";
import type { SimulationOverrides } from "../recommendations/simulation.js";
import { simulateRecommendationsForStudent } from "../recommendations/service.js";

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = "SessionNotFoundError";
  }
}

/**
 * Counselling session persistence (Milestone 10). Snapshots are immutable:
 * creation copies current engine output into relational + jsonb columns,
 * and reads never recompute. All multi-row creation runs in a transaction
 * so a failure cannot leave a half-created session behind.
 */

export interface SessionSummary {
  id: string;
  studentId: string;
  counsellorId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: "ACTIVE" | "COMPLETED";
  recommendationCount: number;
  simulationCount: number;
  comparisonCount: number;
  noteCount: number;
  topRecommendation: {
    courseName: string;
    universityName: string;
    score: number;
  } | null;
}

function toStatus(endedAt: Date | null): "ACTIVE" | "COMPLETED" {
  return endedAt == null ? "ACTIVE" : "COMPLETED";
}

async function summarizeSession(sessionId: string): Promise<SessionSummary> {
  const [session] = await db
    .select()
    .from(counsellingSessions)
    .where(eq(counsellingSessions.id, sessionId))
    .limit(1);
  if (session == null) throw new SessionNotFoundError(sessionId);
  const [recs, sims, comps, notes] = await Promise.all([
    db
      .select()
      .from(sessionRecommendations)
      .where(eq(sessionRecommendations.sessionId, sessionId)),
    db
      .select({ id: sessionSimulations.id })
      .from(sessionSimulations)
      .where(eq(sessionSimulations.sessionId, sessionId)),
    db
      .select({ id: sessionComparisons.id })
      .from(sessionComparisons)
      .where(eq(sessionComparisons.sessionId, sessionId)),
    db
      .select({ id: sessionNotes.id })
      .from(sessionNotes)
      .where(eq(sessionNotes.sessionId, sessionId)),
  ]);
  const top = [...recs].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))[0];
  const snapshot = top?.courseSnapshot as
    | { courseName?: string; universityName?: string }
    | null;
  return {
    id: session.id,
    studentId: session.studentId,
    counsellorId: session.counsellorId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    status: toStatus(session.endedAt),
    recommendationCount: recs.length,
    simulationCount: sims.length,
    comparisonCount: comps.length,
    noteCount: notes.length,
    topRecommendation:
      top != null
        ? {
            courseName: snapshot?.courseName ?? "Unknown course",
            universityName: snapshot?.universityName ?? "Unknown university",
            score: top.score,
          }
        : null,
  };
}

export async function createSession(
  studentId: string,
  counsellorId: string
): Promise<SessionSummary> {
  const { student, recommendations } =
    await getRecommendationsForStudent(studentId);

  const courseRows = await db
    .select({ course: courses, university: universities })
    .from(courses)
    .innerJoin(universities, eq(courses.universityId, universities.id));
  const detailsById = new Map(
    courseRows.map(({ course, university }) => [
      course.id,
      toCourseDetails(course, university),
    ])
  );

  const question = await getNextBestQuestion(studentId);

  const sessionId = await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(counsellingSessions)
      .values({
        studentId: student.id,
        counsellorId,
        studentSnapshot: JSON.parse(JSON.stringify(student)) as unknown,
      })
      .returning({ id: counsellingSessions.id });
    if (session == null) throw new Error("Session insert failed");
    const recRows: NewSessionRecommendation[] = recommendations.map((rec, index) => ({
      sessionId: session.id,
      courseId: rec.courseId,
      score: rec.overallScore,
      rank: index + 1,
      eligibility: rec.eligibilityStatus,
      breakdown: rec.scoreBreakdown,
      evidence: { reasons: rec.reasons, warnings: rec.warnings },
      courseSnapshot: detailsById.get(rec.courseId) ?? {
        courseName: rec.courseName,
        universityName: rec.universityName,
      },
      estimatedCost: rec.estimatedTotalCost,
    }));
    if (recRows.length > 0) await tx.insert(sessionRecommendations).values(recRows);
    if (!("status" in question)) {
      const questionRow: NewSessionQuestion = {
        sessionId: session.id,
        field: question.field,
        priority: question.priority,
        impactScore: question.impactScore,
        affectedCount: question.affectedRecommendationCount,
        affectedPercentage: question.affectedRecommendationPercentage,
        question: question.question,
        reason: question.reason,
      };
      await tx.insert(sessionQuestions).values(questionRow);
    }
    return session.id;
  });

  return summarizeSession(sessionId);
}

export async function listSessions(
  studentId: string,
  counsellorId: string
): Promise<SessionSummary[]> {
  await getStudentById(studentId);
  const sessions = await db
    .select()
    .from(counsellingSessions)
    .where(
      and(
        eq(counsellingSessions.studentId, studentId),
        eq(counsellingSessions.counsellorId, counsellorId)
      )
    )
    .orderBy(desc(counsellingSessions.startedAt));
  return Promise.all(sessions.map((session) => summarizeSession(session.id)));
}

/** Load a session only if it belongs to the counsellor (404 otherwise). */
async function requireOwnedSession(sessionId: string, counsellorId: string) {
  const [session] = await db
    .select()
    .from(counsellingSessions)
    .where(
      and(
        eq(counsellingSessions.id, sessionId),
        eq(counsellingSessions.counsellorId, counsellorId)
      )
    )
    .limit(1);
  if (session == null) throw new SessionNotFoundError(sessionId);
  return session;
}

export async function getSessionDetail(sessionId: string, counsellorId: string): Promise<{
  session: {
    id: string;
    studentId: string;
    counsellorId: string;
    startedAt: Date;
    endedAt: Date | null;
    status: "ACTIVE" | "COMPLETED";
    studentSnapshot: unknown;
  };
  recommendations: typeof sessionRecommendations.$inferSelect[];
  questions: typeof sessionQuestions.$inferSelect[];
  simulations: typeof sessionSimulations.$inferSelect[];
  comparisons: typeof sessionComparisons.$inferSelect[];
  notes: typeof sessionNotes.$inferSelect[];
}> {
  const session = await requireOwnedSession(sessionId, counsellorId);
  const [recommendations, questions, simulations, comparisons, notes] =
    await Promise.all([
      db
        .select()
        .from(sessionRecommendations)
        .where(eq(sessionRecommendations.sessionId, sessionId)),
      db
        .select()
        .from(sessionQuestions)
        .where(eq(sessionQuestions.sessionId, sessionId)),
      db
        .select()
        .from(sessionSimulations)
        .where(eq(sessionSimulations.sessionId, sessionId)),
      db
        .select()
        .from(sessionComparisons)
        .where(eq(sessionComparisons.sessionId, sessionId)),
      db
        .select()
        .from(sessionNotes)
        .where(eq(sessionNotes.sessionId, sessionId)),
    ]);
  recommendations.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  return {
    session: {
      id: session.id,
      studentId: session.studentId,
      counsellorId: session.counsellorId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      status: toStatus(session.endedAt),
      studentSnapshot: session.studentSnapshot,
    },
    recommendations,
    questions,
    simulations,
    comparisons,
    notes,
  };
}

export async function endSession(
  sessionId: string,
  counsellorId: string
): Promise<SessionSummary> {
  const session = await requireOwnedSession(sessionId, counsellorId);
  if (session.endedAt == null) {
    await db
      .update(counsellingSessions)
      .set({ endedAt: new Date() })
      .where(eq(counsellingSessions.id, sessionId));
  }
  return summarizeSession(sessionId);
}

export async function addSessionNote(
  sessionId: string,
  counsellorId: string,
  content: string
) {
  await requireOwnedSession(sessionId, counsellorId);
  const [note] = await db
    .insert(sessionNotes)
    .values({ sessionId, content })
    .returning();
  return note;
}

export async function updateSessionNote(
  noteId: string,
  counsellorId: string,
  content: string
) {
  const [row] = await db
    .select({ note: sessionNotes, sessionId: counsellingSessions.id })
    .from(sessionNotes)
    .innerJoin(
      counsellingSessions,
      eq(sessionNotes.sessionId, counsellingSessions.id)
    )
    .where(
      and(
        eq(sessionNotes.id, noteId),
        eq(counsellingSessions.counsellorId, counsellorId)
      )
    )
    .limit(1);
  if (row == null) throw new Error(`Note not found: ${noteId}`);
  const [note] = await db
    .update(sessionNotes)
    .set({ content, updatedAt: new Date() })
    .where(eq(sessionNotes.id, noteId))
    .returning();
  if (note == null) throw new Error(`Note not found: ${noteId}`);
  return note;
}

export async function saveSessionSimulation(
  sessionId: string,
  counsellorId: string,
  overrides: SimulationOverrides
) {
  const session = await requireOwnedSession(sessionId, counsellorId);
  const result = await simulateRecommendationsForStudent(
    session.studentId,
    overrides
  );
  const row: NewSessionSimulation = {
    sessionId,
    overrides,
    baseline: result.baseline,
    simulated: result.simulated,
    result: { changes: result.changes, summary: result.summary },
  };
  const [saved] = await db.insert(sessionSimulations).values(row).returning();
  return saved;
}

export async function saveSessionComparison(
  sessionId: string,
  counsellorId: string,
  courseIds: string[]
) {
  const session = await requireOwnedSession(sessionId, counsellorId);
  const { recommendations } = await getRecommendationsForStudent(session.studentId);
  const byId = new Map(recommendations.map((rec) => [rec.courseId, rec]));
  const missing = courseIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Courses are not in the current recommendations: ${missing.join(", ")}`
    );
  }
  const courseRows = await db
    .select({ course: courses, university: universities })
    .from(courses)
    .innerJoin(universities, eq(courses.universityId, universities.id));
  const detailsById = new Map(
    courseRows.map(({ course, university }) => [
      course.id,
      toCourseDetails(course, university),
    ])
  );
  const snapshots = courseIds.map((courseId) => {
    const rec = byId.get(courseId);
    return {
      recommendation: rec,
      details: detailsById.get(courseId) ?? null,
    };
  });
  const row: NewSessionComparison = {
    sessionId,
    courses: snapshots,
  };
  const [saved] = await db.insert(sessionComparisons).values(row).returning();
  return saved;
}
