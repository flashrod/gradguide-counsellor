import { FileText, Plus } from "lucide-react";

import { NextQuestionCard } from "@/components/next-question-card";
import { PageHeader } from "@/components/page-header";
import { RecommendationCard } from "@/components/recommendation-card";
import { StudentProfileCard } from "@/components/student-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  mockNextQuestion,
  mockRecommendations,
  mockStudent,
} from "@/lib/mock-data";

export default function WorkspacePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Counsellor Workspace"
        subtitle="Make faster, more consistent course recommendations."
        actions={
          <>
            <Button variant="outline" size="sm">
              <FileText aria-hidden />
              Session notes
            </Button>
            <Button size="sm">
              <Plus aria-hidden />
              New session
            </Button>
          </>
        }
      />

      <StudentProfileCard student={mockStudent} />

      <section aria-labelledby="recommended-courses-heading">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2
              id="recommended-courses-heading"
              className="text-base font-semibold tracking-tight text-slate-900"
            >
              Recommended courses
            </h2>
            <Badge variant="secondary">{mockRecommendations.length} shortlisted</Badge>
          </div>
          <p className="hidden text-xs text-slate-400 sm:block">
            Mock data · engine arrives in a later milestone
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mockRecommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="next-question-heading"
        className="grid gap-4 lg:grid-cols-5"
      >
        <div className="lg:col-span-3">
          <h2 id="next-question-heading" className="sr-only">
            Next best question
          </h2>
          <NextQuestionCard question={mockNextQuestion} />
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Session context
            </p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Session</dt>
                <dd className="font-medium text-slate-900">#GG-1042 · Live</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Started</dt>
                <dd className="font-medium text-slate-900">12 min ago</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Profile completeness</dt>
                <dd className="font-medium tabular-nums text-slate-900">78%</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Missing</dt>
                <dd className="font-medium text-slate-900">
                  Work experience
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
