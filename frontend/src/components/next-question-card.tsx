import { Crosshair } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ApiNextQuestionResponse } from "@/lib/api-types";

interface NextQuestionCardProps {
  data: ApiNextQuestionResponse;
}

function priorityLabel(priority: string): string {
  return `${priority} IMPACT`;
}

export function NextQuestionCard({ data }: NextQuestionCardProps) {
  if ("status" in data) {
    return (
      <Card className="border-emerald-200/70 bg-emerald-50/50">
        <CardContent className="flex items-start gap-4 pt-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <Crosshair className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
              Next best question
            </p>
            <p className="mt-1.5 text-[15px] font-semibold text-slate-900">
              Profile is sufficiently complete
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              {data.message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200/70 bg-amber-50/50">
      <CardContent className="flex items-start gap-4 pt-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
          <Crosshair className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">
              Next best question
            </p>
            <Badge variant="warning">{priorityLabel(data.priority)}</Badge>
          </div>
          <p className="mt-1.5 text-[15px] font-semibold text-slate-900">
            “{data.question}”
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
            Potential impact: {data.affectedRecommendationCount} of your top{" "}
            {data.consideredRecommendationCount} recommendations
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            <span className="font-medium text-slate-700">Why: </span>
            {data.reason}
          </p>
          <Button variant="outline" size="sm" className="mt-3 bg-white">
            Add to session notes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
