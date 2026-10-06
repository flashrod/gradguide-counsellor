import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CompareTable } from "@/components/compare-table";
import { EmptyRecommendations } from "@/components/empty-recommendations";
import { PageHeader } from "@/components/page-header";
import { SaveComparisonButton } from "@/components/save-comparison-button";
import { Button } from "@/components/ui/button";
import { DEMO_STUDENT_ID, getCourseDetails, getRecommendations, listSessions } from "@/lib/api";

/**
 * Side-by-side comparison (Milestone 9). Server-rendered from existing
 * recommendation output plus display-only course details. No scoring,
 * no persistence — selection travels in the `ids` search param.
 */
export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const requestedIds = [...new Set((ids ?? "").split(",").filter(Boolean))].slice(0, 3);

  const data = await getRecommendations(DEMO_STUDENT_ID);
  const byId = new Map(data.recommendations.map((rec) => [rec.courseId, rec]));
  const matched = requestedIds
    .map((id) => byId.get(id))
    .filter((rec) => rec != null);

  const entries = await Promise.all(
    matched.map(async (recommendation) => ({
      recommendation,
      details: (await getCourseDetails(recommendation.courseId)).course,
    }))
  );

  const { cookies } = await import("next/headers");
  const { sessions } = await listSessions(DEMO_STUDENT_ID, {
    cookie: (await cookies()).toString(),
  });
  const activeSessionId =
    sessions.find((session) => session.status === "ACTIVE")?.id ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare courses"
        subtitle="Side-by-side evidence from the current recommendations."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/workspace">
                <ArrowLeft aria-hidden />
                Back to recommendations
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/workspace">Clear comparison</Link>
            </Button>
            <SaveComparisonButton
              activeSessionId={activeSessionId}
              courseIds={entries.map((entry) => entry.recommendation.courseId)}
            />
          </div>
        }
      />

      {entries.length < 2 ? (
        <EmptyRecommendations
          title="Select at least 2 courses to compare"
          description="Go back to the workspace, select up to 3 recommended courses, then choose Compare selected."
        />
      ) : (
        <CompareTable entries={entries} />
      )}
    </div>
  );
}
