import { PageHeader } from "@/components/page-header";
import { SessionHistoryList } from "@/components/session-history-list";
import { ApiError, DEMO_STUDENT_ID, listSessions } from "@/lib/api";

/**
 * Session history (Milestone 10). Live list for the workspace student.
 * Each row summarizes the immutable snapshot taken at session time.
 * A missing student (e.g. the dev-seeded demo id on a fresh production
 * database) means no history — not a render failure.
 */
export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const { cookies } = await import("next/headers");
  const { sessions } = await listSessions(DEMO_STUDENT_ID, {
    cookie: (await cookies()).toString(),
  }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return { sessions: [] };
    throw error;
  });

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
