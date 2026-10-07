import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCatalogueMeta, getStudent } from "@/lib/api";
import { listStudents } from "@/lib/api";

/**
 * Students roster (live data). Each row links into the workspace so the
 * counsellor can counsel, import a resume, or start a session.
 * "Add student" routes into the resume import flow, which creates the
 * profile after counsellor review.
 */
export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const { cookies } = await import("next/headers");
  const cookie = (await cookies()).toString();
  const [{ students }, meta] = await Promise.all([
    listStudents({ cookie }),
    getCatalogueMeta(),
  ]);
  const withGpa = (
    await Promise.all(
      students.map(async (s) => {
        try {
          const { student } = await getStudent(s.id);
          return student.gpa.value != null;
        } catch {
          return false;
        }
      })
    )
  ).filter(Boolean).length;

  const stats = [
    { label: "Student profiles", value: String(students.length) },
    { label: "With confirmed GPA", value: String(withGpa) },
    { label: "Catalogue programmes", value: String(meta.total) },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle="Manage student profiles and track counselling readiness."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/students/new">Add manually</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/workspace/resume">
                <Plus aria-hidden />
                Add student
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mt-4 overflow-hidden rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Degree</th>
                  <th className="px-4 py-2.5 font-medium">Field</th>
                  <th className="px-4 py-2.5 font-medium">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((row) => (
                  <tr key={row.id} className="bg-white">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.degree === "" ? "—" : row.degree}</td>
                    <td className="px-4 py-3 text-slate-600">{row.field === "" ? "—" : row.field}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/workspace?student=${row.id}`}
                        className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-600"
                      >
                        Workspace
                      </Link>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No student profiles yet.{" "}
                      <Link href="/workspace/resume" className="font-medium text-slate-900 underline underline-offset-4">
                        Import a resume
                      </Link>{" "}
                      to create the first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[13px] text-slate-500">
            <Badge variant="info">Live data</Badge>
            <span>Profiles are created through resume import; GPA and readiness fill in after counsellor review.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
