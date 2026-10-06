import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { NoteForm } from "@/components/note-form";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getSessionDetail } from "@/lib/api";
import { formatGpa } from "@/lib/format";

/**
 * Session detail (Milestone 10). Renders immutable snapshots only —
 * nothing here is recomputed from the live catalogue.
 */
export const dynamic = "force-dynamic";

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function snapshotText(value: unknown): string {
  if (value == null) return "Unknown";
  if (typeof value === "string") return value === "" ? "Unknown" : value;
  if (typeof value === "number") return String(value);
  return "Unknown";
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { cookies } = await import("next/headers");
  const detail = await getSessionDetail(id, { cookie: (await cookies()).toString() });
  const { session } = detail;
  const student = (session.studentSnapshot ?? {}) as Record<string, unknown>;
  const gpa = student["gpa"] as { value?: unknown; scale?: unknown } | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Session review"
        subtitle={`Snapshot from ${formatDateTime(session.startedAt)} — scores reflect the catalogue as it was.`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/sessions">
              <ArrowLeft aria-hidden />
              All sessions
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2.5 py-4">
          <Badge variant={session.status === "ACTIVE" ? "success" : "secondary"}>
            {session.status === "ACTIVE" ? "Active" : "Completed"}
          </Badge>
          <p className="text-[13px] text-slate-500">
            Student: {snapshotText(student["name"])} · Counsellor: {session.counsellorId}
            {session.endedAt != null && ` · Ended ${formatDateTime(session.endedAt)}`}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Student snapshot</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <dl className="space-y-2">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">GPA</dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  {gpa?.value != null && gpa?.scale != null
                    ? formatGpa({ value: gpa.value as number, scale: gpa.scale as number })
                    : "Unknown"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Career goal</dt>
                <dd className="font-medium text-slate-900">
                  {snapshotText(student["careerGoal"])}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Intake</dt>
                <dd className="font-medium text-slate-900">
                  {snapshotText(student["preferredIntake"])}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">
              Recommendations ({detail.recommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detail.recommendations.length === 0 ? (
              <p className="text-sm text-slate-500">No recommendations snapshotted.</p>
            ) : (
              <ul className="space-y-2.5">
                {detail.recommendations.map((rec) => {
                  const snapshot = (rec.courseSnapshot ?? {}) as Record<string, unknown>;
                  return (
                    <li key={rec.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {snapshotText(snapshot["courseName"])}
                        </p>
                        <p className="text-xs text-slate-500">
                          {snapshotText(snapshot["universityName"])} ·{" "}
                          {rec.eligibility ?? "Unknown"}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                        {rec.score}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {detail.questions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Next best question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.questions.map((question) => (
              <div key={question.id}>
                <p className="text-sm font-medium text-slate-900">
                  {question.question}{" "}
                  <Badge variant="warning" className="ml-1">
                    {question.priority}
                  </Badge>
                </p>
                <p className="mt-1 text-[13px] text-slate-500">{question.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {detail.simulations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">
              What-If scenarios ({detail.simulations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.simulations.map((simulation) => {
              const summary = (
                simulation.result as {
                  summary?: {
                    movedUp?: number;
                    movedDown?: number;
                    newlyEligible?: number;
                    noLongerEligible?: number;
                  };
                }
              ).summary;
              return (
                <div key={simulation.id} className="text-sm">
                  <p className="font-medium text-slate-900">
                    Overrides:{" "}
                    <span className="font-normal text-slate-600">
                      {JSON.stringify(simulation.overrides)}
                    </span>
                  </p>
                  {summary != null && (
                    <p className="mt-0.5 text-[13px] text-slate-500">
                      {summary.movedUp ?? 0} up · {summary.movedDown ?? 0} down ·{" "}
                      {summary.newlyEligible ?? 0} newly eligible ·{" "}
                      {summary.noLongerEligible ?? 0} no longer eligible
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {detail.comparisons.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">
              Comparisons ({detail.comparisons.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.comparisons.map((comparison) => {
              const courses = (comparison.courses ?? []) as {
                recommendation?: { courseName?: string; overallScore?: number } | null;
              }[];
              return (
                <div key={comparison.id} className="text-sm">
                  <p className="text-slate-600">
                    {courses
                      .map(
                        (entry) =>
                          `${entry.recommendation?.courseName ?? "Unknown course"} (${entry.recommendation?.overallScore ?? "?"})`
                      )
                      .join("  vs  ")}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px]">
            Notes ({detail.notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail.notes.length > 0 && (
            <ul className="space-y-2.5">
              {detail.notes.map((note) => (
                <li key={note.id} className="text-sm text-slate-700">
                  {note.content}
                </li>
              ))}
            </ul>
          )}
          {detail.notes.length > 0 && <Separator />}
          <NoteForm sessionId={session.id} />
        </CardContent>
      </Card>
    </div>
  );
}
