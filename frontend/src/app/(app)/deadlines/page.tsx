import { PageHeader } from "@/components/page-header";
import { DeadlineBoard } from "@/components/deadline-board";
import { listDeadlines, listStudents } from "@/lib/api";

/**
 * Deadline reminders (counsellor-owned). Application due dates, document
 * cutoffs, and follow-ups — all dates entered by the counsellor, never
 * derived from intake season names (which carry no year and no deadline).
 */
export const dynamic = "force-dynamic";

export default async function DeadlinesPage() {
  const { cookies } = await import("next/headers");
  const cookie = (await cookies()).toString();
  const [{ deadlines }, { students }] = await Promise.all([
    listDeadlines({ cookie }),
    listStudents({ cookie }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deadlines"
        subtitle="Application due dates and follow-ups. Your reminders only."
      />
      <DeadlineBoard initial={deadlines} students={students} />
    </div>
  );
}
