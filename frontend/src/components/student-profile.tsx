import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { StudentProfile } from "@/lib/types";

interface StudentProfileProps {
  student: StudentProfile;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const PROFILE_FIELDS = [
  { label: "GPA", key: "gpa" },
  { label: "IELTS", key: "ielts" },
  { label: "Budget", key: "budget" },
  { label: "Career goal", key: "careerGoal" },
  { label: "Intake", key: "intake" },
] as const;

export function StudentProfileCard({ student }: StudentProfileProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Current student
        </p>
        <Badge variant="success">{student.status}</Badge>
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
            <p className="mt-0.5 text-sm text-slate-500">{student.degree}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {PROFILE_FIELDS.map((field) => (
            <div key={field.key}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {field.label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {student[field.key]}
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Countries
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {student.preferredCountries.map((country) => (
                <Badge key={country} variant="info">
                  {country}
                </Badge>
              ))}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
