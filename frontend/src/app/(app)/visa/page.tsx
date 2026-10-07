import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { VisaChecklistBoard } from "@/components/visa-checklist-board";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError, getVisaChecklist, getStudent, listStudents } from "@/lib/api";

/**
 * Visa readiness per student. Without a selected student, pick one —
 * every row opens its workspace too.
 */
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function VisaPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { cookies } = await import("next/headers");
  const cookie = (await cookies()).toString();
  const { student: requested } = await searchParams;

  if (requested == null || !UUID_RE.test(requested)) {
    const { students } = await listStudents({ cookie });
    return (
      <div className="space-y-6">
        <PageHeader
          title="Visa checklist"
          subtitle="Pick a student to track their visa readiness."
        />
        <Card>
          <CardContent className="pt-6">
            {students.length === 0 ? (
              <p className="text-sm text-slate-500">
                No student profiles yet.{" "}
                <Link href="/students" className="font-medium text-slate-900 underline underline-offset-4">
                  Add one first
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {students.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {s.name}
                      {s.field !== "" && (
                        <span className="ml-2 font-normal text-slate-500">{s.field}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/workspace?student=${s.id}`}>Open workspace</Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/visa?student=${s.id}`}>Checklist</Link>
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student } = await getStudent(requested).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) redirect("/students");
    throw error;
  });
  const { countries } = await getVisaChecklist(requested, { cookie }).catch(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 404) redirect("/students");
      throw error;
    }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Visa checklist — ${student.name}`}
        subtitle="General guidance for counselling conversations."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/workspace?student=${student.id}`}>Open workspace</Link>
          </Button>
        }
      />
      <VisaChecklistBoard studentId={student.id} initial={countries} />
    </div>
  );
}
