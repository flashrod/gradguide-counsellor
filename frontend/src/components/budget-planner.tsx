"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ApiError,
  getCourseDetails,
  updateStudent,
} from "@/lib/api";
import type {
  ApiCourseDetails,
  ApiRecommendation,
} from "@/lib/api-types";
import { formatMoney, normalizeTotal, splitCosts } from "@/lib/cost-math";

interface BudgetPlannerProps {
  studentId: string;
  recommendations: ApiRecommendation[];
  budgetAmount: number | null;
  budgetCurrency: string | null;
  livingAmount: number | null;
  livingCurrency: string | null;
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
  studentId,
  recommendations,
  budgetAmount,
  budgetCurrency,
  livingAmount,
  livingCurrency,
}: BudgetPlannerProps) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingRent, setEditingRent] = useState(false);
  const [rentAmount, setRentAmount] = useState("");
  const [rentCurrency, setRentCurrency] = useState("");
  const [savingRent, setSavingRent] = useState(false);
  const router = useRouter();

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

  async function saveRent(): Promise<void> {
    const amount = Number(rentAmount);
    const currency = rentCurrency.trim().toUpperCase();
    if (rentAmount.trim() === "" || !Number.isFinite(amount) || amount < 0) {
      setError("Enter a monthly rent of 0 or more.");
      return;
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      setError("Enter a 3-letter currency (e.g. INR, USD, GBP).");
      return;
    }
    setSavingRent(true);
    setError(null);
    try {
      await updateStudent(studentId, {
        livingCostAmount: amount,
        livingCostCurrency: currency,
      });
      setEditingRent(false);
      setRentAmount("");
      setRentCurrency("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the rent.");
    } finally {
      setSavingRent(false);
    }
  }

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-slate-500">
              {livingAmount != null && livingCurrency != null ? (
                <>
                  Monthly living (entered):{" "}
                  <span className="font-medium tabular-nums text-slate-700">
                    {formatMoney(livingAmount, livingCurrency)}
                  </span>{" "}
                  <button
                    type="button"
                    onClick={() => setEditingRent((v) => !v)}
                    className="font-medium underline underline-offset-4"
                  >
                    Change
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingRent((v) => !v)}
                  className="font-medium underline underline-offset-4"
                >
                  Add monthly rent / living costs
                </button>
              )}
            </p>
          </div>
          {editingRent && (
            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 p-3">
              <label className="block text-xs font-medium text-slate-600">
                Monthly amount
                <input
                  aria-label="Monthly living amount"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="1200"
                  className="mt-1 block w-36 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value)}
                  disabled={savingRent}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Currency
                <input
                  aria-label="Living currency"
                  type="text"
                  maxLength={3}
                  placeholder="GBP"
                  className="mt-1 block w-24 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={rentCurrency}
                  onChange={(e) => setRentCurrency(e.target.value)}
                  disabled={savingRent}
                />
              </label>
              <Button size="sm" disabled={savingRent} onClick={() => void saveRent()}>
                {savingRent ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
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
              // Counsellor-entered monthly living fills catalogue gaps.
              // Manual input outranks unknown — but it is labelled entered.
              const enteredLiving =
                split.living == null &&
                livingAmount != null &&
                livingCurrency != null
                  ? normalizeTotal(
                      livingAmount,
                      "monthly",
                      row.details.durationMonths
                    )
                  : null;
              const living = split.living ?? enteredLiving;
              const livingCurrencyShown =
                split.living != null ? split.livingCurrency : livingCurrency;
              const livingEntered = split.living == null && enteredLiving != null;
              const total =
                split.tuition != null &&
                living != null &&
                split.tuitionCurrency != null &&
                livingCurrencyShown != null &&
                split.tuitionCurrency === livingCurrencyShown
                  ? split.tuition + living
                  : split.total;
              // Each bar scales to its own row (currencies differ across
              // courses, so rows are not comparable by bar length). The
              // budget marker appears only when the total shares the
              // budget's currency.
              const totalCurrencyShown =
                total != null
                  ? (split.totalCurrency ?? livingCurrencyShown)
                  : null;
              const comparable =
                total != null &&
                budgetAmount != null &&
                budgetCurrency != null &&
                totalCurrencyShown === budgetCurrency;
              // Honest partial: one side known still informs (e.g. tuition
              // annualizes but living was never published). Never summed
              // with an unknown side, never estimated.
              const partial =
                total == null &&
                (split.tuition != null || living != null)
                  ? {
                      label:
                        split.tuition != null && split.tuitionCurrency != null
                          ? `Tuition ${formatMoney(split.tuition, split.tuitionCurrency)} + living unknown`
                          : `Living ${formatMoney(
                              living as number,
                              livingCurrencyShown as string
                            )}${livingEntered ? " (entered)" : ""} + tuition unknown`,
                    }
                  : null;
              const rowMax = Math.max(
                split.tuition ?? 0,
                living ?? 0,
                total ?? 0,
                comparable ? (budgetAmount as number) : 0,
                1
              );
              const tuitionShare =
                split.tuition != null ? (split.tuition / rowMax) * 100 : 0;
              const livingShare =
                living != null ? (living / rowMax) * 100 : 0;
              const markerShare = comparable
                ? ((budgetAmount as number) / rowMax) * 100
                : null;
              const verdict = comparable
                ? (total as number) <= (budgetAmount as number)
                  ? { label: "Within budget", tone: "success" as const }
                  : {
                      label: `${formatMoney(
                        (total as number) - (budgetAmount as number),
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
                    ) : partial != null ? (
                      <Badge variant="secondary">Partial</Badge>
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
                    {living != null && (
                      <div
                        className={`h-full ${livingEntered ? "bg-emerald-300" : "bg-emerald-500"}`}
                        style={{ width: `${livingShare}%` }}
                      />
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
                    {living != null && livingCurrencyShown != null
                      ? `Living ${formatMoney(living, livingCurrencyShown)}${livingEntered ? " (entered)" : ""}`
                      : "Living unknown"}
                    {total != null && totalCurrencyShown != null
                      ? ` · Total ${formatMoney(total, totalCurrencyShown)}`
                      : partial != null
                        ? ` · ${partial.label}`
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
