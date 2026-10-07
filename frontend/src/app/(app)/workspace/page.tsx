import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ApiError,
  DEMO_STUDENT_ID,
  getNextQuestion,
  getRecommendations,
  getSessionDetail,
  getStudent,
  listSessions,
} from "@/lib/api";
import { parseAnsweredNotes } from "@/lib/qa-notes";
import { EmptyRecommendations } from "@/components/empty-recommendations";
import { BudgetPlanner } from "@/components/budget-planner";
import { NextQuestionCard } from "@/components/next-question-card";
import { PageHeader } from "@/components/page-header";
import { RecommendationList } from "@/components/recommendation-list";
import { SessionBar } from "@/components/session-bar";
import { StudentProfileCard } from "@/components/student-profile";
import { Badge } from "@/components/ui/badge";
import { WhatIfPanel } from "@/components/what-if-panel";

/**
 * Counsellor workspace (Milestone 6: live data).
 * Server Component — fetches the real student + engine recommendations.
 * Renders only; scoring/eligibility live in the backend.
 * Always rendered per request: recommendations must never be stale.
 */
export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: requested } = await searchParams;
  const studentId =
    requested != null &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested)
      ? requested
      : DEMO_STUDENT_ID;
  // Server Components have no browser cookies: forward them so the
  // counsellor-scoped session banner can load. Public calls stay as-is.
  const { cookies } = await import("next/headers");
  const cookie = (await cookies()).toString();
  // A missing student (e.g. the dev-seeded demo id on a fresh production
  // database) is a routing condition, not a render failure: send the
  // counsellor to the roster, which already handles the empty state.
  const [{ student }, data, nextQuestion, { sessions }] = await Promise.all([
    getStudent(studentId),
    getRecommendations(studentId),
    getNextQuestion(studentId),
    listSessions(studentId, { cookie }),
  ]).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) redirect("/students");
    throw error;
  });
  const activeSession =
    sessions.find((session) => session.status === "ACTIVE") ?? null;
  // Answers saved during the live session persist as structured notes —
  // surface them under the question card.
  const answered =
    activeSession != null
      ? parseAnsweredNotes(
          (await getSessionDetail(activeSession.id, { cookie })).notes
        )
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Counsellor Workspace"
        subtitle="Make faster, more consistent course recommendations."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/live?student=${student.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            >
              Live mode
            </Link>
            <Link
              href="/workspace/resume"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
            >
              Import resume
            </Link>
          </div>
        }
      />

      <SessionBar
        studentId={student.id}
        activeSession={
          activeSession != null
            ? { id: activeSession.id, startedAt: activeSession.startedAt }
            : null
        }
      />

      <StudentProfileCard student={student} />

      <section aria-labelledby="recommended-courses-heading">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2
              id="recommended-courses-heading"
              className="text-base font-semibold tracking-tight text-slate-900"
            >
              Recommended courses
            </h2>
            <Badge variant="secondary">
              {data.recommendations.length} shortlisted
            </Badge>
          </div>
          <p className="hidden text-xs text-slate-400 sm:block">
            Live engine results
          </p>
        </div>

        {data.recommendations.length === 0 ? (
          <EmptyRecommendations />
        ) : (
          <RecommendationList recommendations={data.recommendations} studentId={student.id} />
        )}
      </section>

      <section aria-labelledby="next-question-heading">
        <h2 id="next-question-heading" className="sr-only">
          Next best question
        </h2>
        <NextQuestionCard
          data={nextQuestion}
          studentId={student.id}
          activeSessionId={activeSession?.id ?? null}
          answered={answered}
        />
      </section>

      <BudgetPlanner
        recommendations={data.recommendations}
        budgetAmount={student.budgetAmount}
        budgetCurrency={student.budgetCurrency}
      />

      <WhatIfPanel        studentId={student.id}
        activeSessionId={activeSession?.id ?? null}
        defaults={{
          budgetAmount: student.budgetAmount?.toString() ?? "",
          budgetCurrency: student.budgetCurrency ?? "",
          country: student.preferredCountries[0] ?? "",
          intake: student.preferredIntake ?? "",
          gpaValue: student.gpa.value?.toString() ?? "",
          gpaScale: student.gpa.scale?.toString() ?? "",
        }}
      />
    </div>
  );
}
