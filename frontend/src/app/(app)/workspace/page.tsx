import {
  DEMO_STUDENT_ID,
  getNextQuestion,
  getRecommendations,
  getStudent,
} from "@/lib/api";
import { EmptyRecommendations } from "@/components/empty-recommendations";
import { NextQuestionCard } from "@/components/next-question-card";
import { PageHeader } from "@/components/page-header";
import { RecommendationCard } from "@/components/recommendation-card";
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
  const [{ student }, data, nextQuestion] = await Promise.all([
    getStudent(DEMO_STUDENT_ID),
    getRecommendations(DEMO_STUDENT_ID),
    getNextQuestion(DEMO_STUDENT_ID),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Counsellor Workspace"
        subtitle="Make faster, more consistent course recommendations."
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.courseId}
                recommendation={recommendation}
              />
            ))}
          </div>
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
