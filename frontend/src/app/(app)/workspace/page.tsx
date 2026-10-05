import {
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

export default async function WorkspacePage() {
  const [{ student }, data, nextQuestion, { sessions }] = await Promise.all([
    getStudent(DEMO_STUDENT_ID),
    getRecommendations(DEMO_STUDENT_ID),
    getNextQuestion(DEMO_STUDENT_ID),
    listSessions(DEMO_STUDENT_ID),
  ]);
  const activeSession =
    sessions.find((session) => session.status === "ACTIVE") ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Counsellor Workspace"
        subtitle="Make faster, more consistent course recommendations."
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
        <NextQuestionCard data={nextQuestion} />
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
