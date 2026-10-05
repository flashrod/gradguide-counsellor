import { Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STATS = [
  { label: "Active students", value: "24" },
  { label: "New this week", value: "3" },
  { label: "Avg. GPA", value: "8.1" },
] as const;

const MOCK_ROWS = [
  { name: "Aarav Sharma", degree: "B.Tech CS", intake: "Sep 2027", status: "Active" },
  { name: "Diya Patel", degree: "B.Com Finance", intake: "Jan 2028", status: "Active" },
  { name: "Rohan Iyer", degree: "B.E. Mechanical", intake: "Sep 2027", status: "Prospective" },
  { name: "Sneha Reddy", degree: "B.Sc Data Science", intake: "Jan 2028", status: "On Hold" },
] as const;

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle="Manage student profiles and track counselling readiness."
        actions={
          <Button size="sm">
            <Plus aria-hidden />
            Add student
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map((stat) => (
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-400">
              <Search className="h-4 w-4" aria-hidden />
              Search students…
            </div>
            <Badge variant="info">Mock data</Badge>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Degree</th>
                  <th className="px-4 py-2.5 font-medium">Intake</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {MOCK_ROWS.map((row) => (
                  <tr key={row.name} className="bg-white">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.degree}</td>
                    <td className="px-4 py-3 text-slate-600">{row.intake}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          row.status === "Active" ? "success" : "secondary"
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[13px] text-slate-500">
            Full profile management, resume parsing, and search arrive in a
            later milestone. Student records will be stored in PostgreSQL.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
