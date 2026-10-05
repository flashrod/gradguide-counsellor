import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ApiStudent } from "@/lib/api-types";
import { formatBudget, formatGpa, formatTestScore } from "@/lib/format";

interface StudentProfileCardProps {
  student: ApiStudent;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function StudentProfileCard({ student }: StudentProfileCardProps) {
  const englishScores = [
    `IELTS ${formatTestScore(student.ielts.overall)}`,
    `TOEFL ${formatTestScore(student.toeflOverall)}`,
  ].join(" · ");

  const fields: { label: string; value: string }[] = [
    { label: "GPA", value: formatGpa(student.gpa) },
    { label: "English", value: englishScores },
    {
      label: "Budget",
      value: formatBudget(student.budgetAmount, student.budgetCurrency),
    },
    { label: "Career goal", value: student.careerGoal ?? "Unknown" },
    { label: "Intake", value: student.preferredIntake ?? "Unknown" },
    {
      label: "Experience",
      value:
        student.workExperienceMonths != null
          ? `${student.workExperienceMonths} months`
          : "Unknown",
    },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Current student
        </p>
        <Badge variant="success">Live record</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-slate-900 text-sm font-semibold text-white">
              {initials(student.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              {student.name}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {student.degree} · {student.field}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {field.label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>

        {student.preferredCountries.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Countries
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {student.preferredCountries.map((country) => (
                <Badge key={country} variant="info">
                  {country}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
