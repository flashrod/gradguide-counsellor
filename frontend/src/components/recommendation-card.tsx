"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  MapPin,
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
}

const BREAKDOWN_ROWS = [
  { key: "academic", label: "Academic" },
  { key: "career", label: "Career" },
  { key: "budget", label: "Budget" },
  { key: "eligibility", label: "Eligibility" },
  { key: "country", label: "Country" },
  { key: "intake", label: "Intake" },
] as const;

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isEligible = recommendation.eligibilityStatus === "eligible";

  return (
    <Card className="flex flex-col">
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

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          Why {recommendation.overallScore}?
          <ChevronDown
            aria-hidden
            className={cn("transition-transform", expanded && "rotate-180")}
          />
        </Button>

        {expanded && (
          <div className="mt-4 space-y-4">
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
