import { PageHeader } from "@/components/page-header";
import { ResumeReview } from "@/components/resume-review";

/**
 * Resume → profile import (Milestone 13). Protected by middleware like the
 * rest of /workspace. Upload, counsellor review, then explicit confirm —
 * extraction never writes to a profile on its own.
 */
export const dynamic = "force-dynamic";

export default async function ResumeImportPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student } = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import resume"
        subtitle="Turn a student resume into a reviewable profile for the existing recommendation engine."
      />
      <ResumeReview preselectedStudentId={student ?? null} />
    </div>
  );
}
