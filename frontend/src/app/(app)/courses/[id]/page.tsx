import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCourseDetails } from "@/lib/api";
import { formatGpa } from "@/lib/format";

/**
 * Course detail (Milestone 12). Stored source-backed data only —
 * nothing generated, nothing inferred.
 */
export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { course } = await getCourseDetails(id);

  const rows: { label: string; value: string }[] = [
    { label: "University", value: course.universityName },
    { label: "Country", value: course.universityCountry },
    { label: "Degree", value: course.degreeType },
    { label: "Field", value: course.field },
    {
      label: "Duration",
      value:
        course.durationMonths != null ? `${course.durationMonths} months` : "Unknown",
    },
    {
      label: "Tuition",
      value:
        course.tuitionAmount != null && course.tuitionCurrency != null
          ? `${course.tuitionCurrency} ${course.tuitionAmount.toLocaleString("en-US")} (${course.tuitionPeriod ?? "period unknown"})`
          : "Unknown",
    },
    {
      label: "Living cost",
      value:
        course.livingCostAmount != null && course.livingCostCurrency != null
          ? `${course.livingCostCurrency} ${course.livingCostAmount.toLocaleString("en-US")} (${course.livingCostPeriod ?? "period unknown"})`
          : "Unknown",
    },
    {
      label: "GPA requirement",
      value:
        course.minGpa.value != null && course.minGpa.scale != null
          ? formatGpa(course.minGpa)
          : "Unknown",
    },
    {
      label: "IELTS",
      value: course.minIeltsOverall != null ? String(course.minIeltsOverall) : "Unknown",
    },
    {
      label: "TOEFL",
      value:
        course.minToeflOverall != null ? String(course.minToeflOverall) : "Not provided",
    },
    {
      label: "Work experience",
      value: course.workExperienceRequired
        ? course.workExperienceMonthsRequired != null
          ? `${course.workExperienceMonthsRequired} months required`
          : "Required (details unknown)"
        : "Not required",
    },
    {
      label: "Intakes",
      value: course.intakes.length > 0 ? course.intakes.join(", ") : "Unknown",
    },
    {
      label: "Backgrounds",
      value:
        course.academicBackgrounds.length > 0
          ? course.academicBackgrounds.join(", ")
          : "Unknown",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={course.courseName}
        subtitle={`${course.universityName} · ${course.universityCountry}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/courses">
              <ArrowLeft aria-hidden />
              All courses
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-4">
          <Badge variant="info">
            <MapPin className="mr-1 h-3 w-3" aria-hidden />
            {course.universityCountry}
          </Badge>
          <span className="text-xs text-slate-400">
            {course.universityCity} · {course.field}
          </span>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 border-b border-slate-100 pb-2 text-sm">
                <dt className="text-slate-500">{row.label}</dt>
                <dd className="text-right font-medium text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>
          <Separator className="my-4" />
          <p className="text-xs text-slate-500">
            Source: {course.sourceName} · verified{" "}
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(course.lastVerifiedAt))}
          </p>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <a href={course.sourceUrl} target="_blank" rel="noopener noreferrer">
              View official source
              <ExternalLink aria-hidden />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
