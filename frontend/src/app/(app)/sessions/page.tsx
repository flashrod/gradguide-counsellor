import { PageHeader } from "@/components/page-header";
import { SessionHistoryList } from "@/components/session-history-list";
import { DEMO_STUDENT_ID, listSessions } from "@/lib/api";

/**
 * Session history (Milestone 10). Live list for the workspace student.
 * Each row summarizes the immutable snapshot taken at session time.
 */
export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const { sessions } = await listSessions(DEMO_STUDENT_ID);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        subtitle="Review what happened in past counselling sessions."
      />
      <SessionHistoryList sessions={sessions} />
      <p className="text-xs text-slate-400">
        History shows snapshots from session time — scores reflect the
        catalogue as it was, not as it is today.
      </p>
    </div>
  );
}
