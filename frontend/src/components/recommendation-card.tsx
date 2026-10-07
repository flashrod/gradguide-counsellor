"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ExternalLink,
  MapPin,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ApiRecommendation } from "@/lib/api-types";
import { formatCost, formatVerifiedDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RecommendationCardProps {
  recommendation: ApiRecommendation;
  selected?: boolean;
  onToggleSelect?: (courseId: string) => void;
}

const BREAKDOWN_ROWS = [
  { key: "academic", label: "Academic" },
  { key: "career", label: "Career" },
  { key: "budget", label: "Budget" },
  { key: "eligibility", label: "Eligibility" },
  { key: "country", label: "Country" },
  { key: "intake", label: "Intake" },
] as const;

export function RecommendationCard({
  recommendation,
  selected = false,
  onToggleSelect,
}: RecommendationCardProps) {
  const [open, setOpen] = useState(false);
  const isEligible = recommendation.eligibilityStatus === "eligible";

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Card className={cn("flex flex-col", selected && "ring-2 ring-slate-900")}>
      <CardContent className="flex flex-1 flex-col pt-6">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="info">
            <MapPin className="mr-1 h-3 w-3" aria-hidden />
            {recommendation.universityCountry}
          </Badge>
          <Badge variant={isEligible ? "success" : "warning"}>
            {isEligible ? "Eligible" : "Unknown eligibility"}
          </Badge>
        </div>

        <h3 className="mt-3 text-[15px] font-semibold leading-snug tracking-tight text-slate-900">
          {recommendation.courseName}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {recommendation.universityName}
        </p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
            {recommendation.overallScore}
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            match
          </span>
        </div>

        <dl className="mt-3 space-y-1.5">
          {BREAKDOWN_ROWS.map((row) => (
            <div key={row.key} className="flex items-center gap-2 text-xs">
              <dt className="w-20 shrink-0 text-slate-500">{row.label}</dt>
              <dd
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={recommendation.scoreBreakdown[row.key]}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${row.label} fit ${recommendation.scoreBreakdown[row.key]} percent`}
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    recommendation.scoreBreakdown[row.key] >= 80
                      ? "bg-emerald-500"
                      : recommendation.scoreBreakdown[row.key] >= 60
                        ? "bg-amber-400"
                        : "bg-slate-300"
                  )}
                  style={{ width: `${recommendation.scoreBreakdown[row.key]}%` }}
                />
              </dd>
              <dd className="w-8 shrink-0 text-right font-medium tabular-nums text-slate-700">
                {recommendation.scoreBreakdown[row.key]}
              </dd>
            </div>
          ))}
        </dl>

        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Est. total cost</dt>
            <dd className="font-medium tabular-nums text-slate-900">
              {formatCost(recommendation.estimatedTotalCost)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Intakes</dt>
            <dd className="font-medium text-slate-900">
              {recommendation.intakes.length > 0
                ? recommendation.intakes.join(", ")
                : "Unknown"}
            </dd>
          </div>
        </dl>

        <Separator className="my-4" />

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            Why {recommendation.overallScore}?
          </Button>
          {onToggleSelect != null && (
            <Button
              variant={selected ? "default" : "secondary"}
              size="sm"
              className="flex-1"
              aria-pressed={selected}
              onClick={() => onToggleSelect(recommendation.courseId)}
            >
              <ArrowLeftRight aria-hidden />
              {selected ? "Selected" : "Compare"}
            </Button>
          )}
        </div>

        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Why ${recommendation.courseName} scored ${recommendation.overallScore}`}
              className="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl dark:bg-slate-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Why {recommendation.overallScore}?
                  </p>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    {recommendation.courseName} · {recommendation.universityName}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                >
                  <X aria-hidden />
                </Button>
              </div>
              <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto">
                {recommendation.reasons.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Why this matches
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {recommendation.reasons.map((reason, index) => (
                        <li
                          key={`${reason.category}-${index}`}
                          className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-600"
                        >
                          <CheckCircle2
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                            aria-hidden
                          />
                          {reason.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {recommendation.warnings.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Needs verification
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {recommendation.warnings.map((warning, index) => (
                        <li
                          key={`${warning.category}-${index}`}
                          className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-600"
                        >
                          <AlertTriangle
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                            aria-hidden
                          />
                          {warning.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 border-t pt-4">
        <p className="text-xs text-slate-500">
          Source: {recommendation.sourceName} · verified{" "}
          {formatVerifiedDate(recommendation.lastVerifiedAt)}
        </p>
        <Button variant="link" size="sm" className="h-auto justify-start p-0" asChild>
          <a
            href={recommendation.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View source
            <ExternalLink aria-hidden />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
