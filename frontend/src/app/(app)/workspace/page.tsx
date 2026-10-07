import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ApiError,
  DEMO_STUDENT_ID,
  getNextQuestion,
  getRecommendations,
  getStudent,
  listSessions,
} from "@/lib/api";
import { EmptyRecommendations } from "@/components/empty-recommendations";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Counsellor Workspace"
        subtitle="Make faster, more consistent course recommendations."
        actions={
          <Link
            href="/workspace/resume"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          >
            Import resume
          </Link>
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
          <RecommendationList recommendations={data.recommendations} />
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
        />
      </section>

      <WhatIfPanel
        studentId={student.id}
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
