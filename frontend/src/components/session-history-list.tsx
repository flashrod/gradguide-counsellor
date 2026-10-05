import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ApiSessionSummary } from "@/lib/api-types";

export function formatSessionDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function SessionHistoryList({ sessions }: { sessions: ApiSessionSummary[] }) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="px-6 py-12 text-center">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            No sessions yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
            Start a counselling session from the workspace to snapshot
            recommendations, questions, scenarios, and notes.
          </p>
          <Button size="sm" className="mt-5" asChild>
            <Link href="/workspace">Go to workspace</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="divide-y pt-2">
        {sessions.map((session) => (
          <div key={session.id} className="flex items-start justify-between gap-4 py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {formatSessionDate(session.startedAt)}
                </p>
                <Badge variant={session.status === "ACTIVE" ? "success" : "secondary"}>
                  {session.status === "ACTIVE" ? "Active" : "Completed"}
                </Badge>
              </div>
              {session.topRecommendation != null ? (
                <p className="mt-1.5 text-sm text-slate-600">
                  Top: {session.topRecommendation.courseName} ·{" "}
                  {session.topRecommendation.universityName} ·{" "}
                  <span className="font-medium tabular-nums text-slate-900">
                    {session.topRecommendation.score}
                  </span>
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-slate-500">
                  No recommendations snapshotted.
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                {session.recommendationCount} recommendations ·{" "}
                {session.simulationCount} scenarios · {session.comparisonCount}{" "}
                comparisons · {session.noteCount} notes
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" asChild>
              <Link href={`/sessions/${session.id}`}>View session</Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
