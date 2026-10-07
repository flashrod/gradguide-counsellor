"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ApiError,
  getCourseDetails,
} from "@/lib/api";
import type {
  ApiCourseDetails,
  ApiRecommendation,
} from "@/lib/api-types";
import { formatMoney, splitCosts } from "@/lib/cost-math";

interface BudgetPlannerProps {
  recommendations: ApiRecommendation[];
  budgetAmount: number | null;
  budgetCurrency: string | null;
}

interface Row {
  courseId: string;
  courseName: string;
  universityName: string;
  overallScore: number;
  details: ApiCourseDetails | null;
}

const MAX_ROWS = 8;

/**
 * True-cost planner: tuition × duration + living × duration per course,
 * stacked against the student's max budget. Unknowns stay unknown;
 * mixed currencies show both segments with no verdict.
 */
export function BudgetPlanner({
  recommendations,
  budgetAmount,
  budgetCurrency,
}: BudgetPlannerProps) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const top = recommendations.slice(0, MAX_ROWS);
        const loaded = await Promise.all(
          top.map(async (rec) => ({
            courseId: rec.courseId,
            courseName: rec.courseName,
            universityName: rec.universityName,
            overallScore: rec.overallScore,
            details: (await getCourseDetails(rec.courseId)).course,
          }))
        );
        if (!cancelled) setRows(loaded);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load course costs."
          );
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [recommendations]);

  return (
    <section aria-labelledby="budget-planner-heading">
      <h2
        id="budget-planner-heading"
        className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400"
      >
        True cost planner
      </h2>
      <Card>
        <CardContent className="space-y-4 pt-5">
          {error != null && (
            <p role="alert" className="text-[13px] text-red-700">
              {error}
            </p>
          )}
          {rows == null && error == null && (
            <p className="text-sm text-slate-500">Loading course costs…</p>
          )}
          {rows != null &&
            rows.map((row) => {
              if (row.details == null) return null;
              const split = splitCosts(row.details);
              // Each bar scales to its own row (currencies differ across
              // courses, so rows are not comparable by bar length). The
              // budget marker appears only when the total shares the
              // budget's currency.
              const comparable =
                split.total != null &&
                budgetAmount != null &&
                budgetCurrency != null &&
                split.totalCurrency === budgetCurrency;
              const rowMax = Math.max(
                split.tuition ?? 0,
                split.living ?? 0,
                split.total ?? 0,
                comparable ? (budgetAmount as number) : 0,
                1
              );
              const tuitionShare =
                split.tuition != null ? (split.tuition / rowMax) * 100 : 0;
              const livingShare =
                split.living != null ? (split.living / rowMax) * 100 : 0;
              const markerShare = comparable
                ? ((budgetAmount as number) / rowMax) * 100
                : null;
              const verdict = comparable
                ? (split.total as number) <= (budgetAmount as number)
                  ? { label: "Within budget", tone: "success" as const }
                  : {
                      label: `${formatMoney(
                        (split.total as number) - (budgetAmount as number),
                        budgetCurrency as string
                      )} over`,
                      tone: "warning" as const,
                    }
                  : null;
              return (
                <div key={row.courseId}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {row.courseName}
                      <span className="ml-2 font-normal text-slate-500">
                        {row.universityName} · {row.overallScore}
                      </span>
                    </p>
                    {verdict != null ? (
                      <Badge variant={verdict.tone}>{verdict.label}</Badge>
                    ) : (
                      <Badge variant="secondary">Unknown total</Badge>
                    )}
                  </div>
                  <div
                    className="relative mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                    role="img"
                    aria-label={`Cost breakdown for ${row.courseName}`}
                  >
                    {split.tuition != null && (
                      <div className="h-full bg-sky-500" style={{ width: `${tuitionShare}%` }} />
                    )}
                    {split.living != null && (
                      <div className="h-full bg-emerald-500" style={{ width: `${livingShare}%` }} />
                    )}
                    {markerShare != null && (
                      <div
                        className="absolute inset-y-0 w-0.5 bg-slate-900"
                        style={{ left: `${Math.min(markerShare, 100)}%` }}
                        aria-hidden
                      />
                    )}
                  </div>
                  <p className="mt-1 text-xs tabular-nums text-slate-500">
                    {split.tuition != null && split.tuitionCurrency != null
                      ? `Tuition ${formatMoney(split.tuition, split.tuitionCurrency)}`
                      : "Tuition unknown"}
                    {" · "}
                    {split.living != null && split.livingCurrency != null
                      ? `Living ${formatMoney(split.living, split.livingCurrency)}`
                      : "Living unknown"}
                    {split.total != null && split.totalCurrency != null
                      ? ` · Total ${formatMoney(split.total, split.totalCurrency)}`
                      : ""}
                  </p>
                </div>
              );
            })}
          <p className="text-xs leading-relaxed text-slate-400">
            Annual × full years, semester × half-years, monthly × months,
            totals as-is. Unknown durations show no total — never an
            estimate. Bars scale per course; amounts are compared
            as-stated across currencies.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
