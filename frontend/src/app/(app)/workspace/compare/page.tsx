import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CompareTable } from "@/components/compare-table";
import { EmptyRecommendations } from "@/components/empty-recommendations";
import { PageHeader } from "@/components/page-header";
import { SaveComparisonButton } from "@/components/save-comparison-button";
import { Button } from "@/components/ui/button";
import { ApiError, getCourseDetails, getRecommendations, listSessions } from "@/lib/api";

/**
 * Side-by-side comparison (Milestone 9). Server-rendered from existing
 * recommendation output plus display-only course details. No scoring,
 * no persistence — selection travels in the `ids` search param.
 */
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; student?: string }>;
}) {
  const { ids, student } = await searchParams;
  // Selection belongs to a student: without a valid one there is nothing
  // meaningful to compare (and the dev-seed id does not exist on fresh
  // databases, which used to crash this page).
  if (student == null || !UUID_RE.test(student)) redirect("/students");
  const studentId = student;
  const requestedIds = [...new Set((ids ?? "").split(",").filter(Boolean))].slice(0, 3);

  const data = await getRecommendations(studentId).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) redirect("/students");
    throw error;
  });
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
  const { sessions } = await listSessions(studentId, {
    cookie: (await cookies()).toString(),
  }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) redirect("/students");
    throw error;
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
              <Link href={`/workspace?student=${studentId}`}>
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
