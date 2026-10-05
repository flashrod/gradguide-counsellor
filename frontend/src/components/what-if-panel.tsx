"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FlaskConical, Minus, Plus, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ApiError,
  saveSessionSimulation,
  simulateRecommendations,
} from "@/lib/api";
import type {
  ApiRecommendation,
  ApiRecommendationChange,
  ApiSimulationChange,
  ApiSimulationOverrides,
  ApiSimulationResponse,
} from "@/lib/api-types";
import { cn } from "@/lib/utils";

interface WhatIfPanelProps {
  studentId: string;
  activeSessionId: string | null;
  defaults: {
    budgetAmount: string;
    budgetCurrency: string;
    country: string;
    intake: string;
    gpaValue: string;
    gpaScale: string;
  };
}

const DIMENSION_LABELS: Record<string, string> = {
  academic: "Academic fit",
  career: "Career fit",
  budget: "Budget fit",
  eligibility: "Eligibility",
  country: "Country fit",
  intake: "Intake fit",
};

const CHANGE_STYLES: Record<ApiRecommendationChange, string> = {
  NEWLY_ELIGIBLE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  NO_LONGER_ELIGIBLE: "border-red-200 bg-red-50 text-red-800",
  RANK_UP: "border-emerald-200 bg-emerald-50 text-emerald-800",
  RANK_DOWN: "border-amber-200 bg-amber-50 text-amber-800",
  UNCHANGED: "border-slate-200 bg-slate-50 text-slate-500",
};

const CHANGE_LABELS: Record<ApiRecommendationChange, string> = {
  NEWLY_ELIGIBLE: "Newly eligible",
  NO_LONGER_ELIGIBLE: "No longer eligible",
  RANK_UP: "Moved up",
  RANK_DOWN: "Moved down",
  UNCHANGED: "Unchanged",
};

function rankText(change: ApiSimulationChange): string | null {
  if (change.oldRank != null && change.newRank != null) {
    return `#${change.oldRank} → #${change.newRank}`;
  }
  if (change.newRank != null) return `New at #${change.newRank}`;
  if (change.oldRank != null) return `Was #${change.oldRank}`;
  return null;
}

function scoreText(change: ApiSimulationChange): string | null {
  if (change.oldScore != null && change.newScore != null && change.scoreDelta != null) {
    const sign = change.scoreDelta > 0 ? "+" : "";
    return `${change.oldScore} → ${change.newScore} (${sign}${change.scoreDelta})`;
  }
  if (change.newScore != null) return `Scores ${change.newScore}`;
  return null;
}

/** Name the dimension that improved most between two backend snapshots. Display only. */
function improvedDimension(
  baseline: ApiRecommendation | undefined,
  simulated: ApiRecommendation | undefined
): string | null {
  if (baseline == null || simulated == null) return null;
  let best: { key: string; delta: number } | null = null;
  for (const key of Object.keys(DIMENSION_LABELS)) {
    const delta =
      simulated.scoreBreakdown[key as keyof typeof simulated.scoreBreakdown] -
      baseline.scoreBreakdown[key as keyof typeof baseline.scoreBreakdown];
    if (best == null || delta > best.delta) best = { key, delta };
  }
  if (best == null || best.delta <= 0) return null;
  return DIMENSION_LABELS[best.key] ?? null;
}

export function WhatIfPanel({ studentId, activeSessionId, defaults }: WhatIfPanelProps) {
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("");
  const [country, setCountry] = useState("");
  const [intake, setIntake] = useState("");
  const [gpaValue, setGpaValue] = useState("");
  const [gpaScale, setGpaScale] = useState("");
  const [result, setResult] = useState<ApiSimulationResponse | null>(null);
  const [lastOverrides, setLastOverrides] = useState<ApiSimulationOverrides | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulatedById = useMemo(() => {
    const map = new Map<string, ApiRecommendation>();
    for (const rec of result?.simulated ?? []) map.set(rec.courseId, rec);
    return map;
  }, [result]);
  const baselineById = useMemo(() => {
    const map = new Map<string, ApiRecommendation>();
    for (const rec of result?.baseline ?? []) map.set(rec.courseId, rec);
    return map;
  }, [result]);

  const visibleChanges = (result?.changes ?? []).filter(
    (c) => c.change !== "UNCHANGED"
  );

  async function applySimulation(): Promise<void> {
    setError(null);
    const overrides: ApiSimulationOverrides = {};
    if (budgetAmount.trim() !== "" || budgetCurrency.trim() !== "") {
      const amount = Number(budgetAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        setError("Budget amount must be a number of 0 or more.");
        return;
      }
      overrides["budget"] = { amount, currency: budgetCurrency.trim() };
    }
    if (country.trim() !== "") overrides["preferredCountry"] = country.trim();
    if (intake.trim() !== "") overrides["preferredIntake"] = intake.trim();
    if (gpaValue.trim() !== "" || gpaScale.trim() !== "") {
      const value = Number(gpaValue);
      const scale = Number(gpaScale);
      if (!Number.isFinite(value) || !Number.isFinite(scale)) {
        setError("GPA value and scale must both be numbers.");
        return;
      }
      overrides["gpa"] = { value, scale };
    }
    if (Object.keys(overrides).length === 0) {
      setError("Enter at least one scenario value first.");
      return;
    }
    setLoading(true);
    try {
      setResult(await simulateRecommendations(studentId, overrides));
      setLastOverrides(overrides);
      setSaved(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Scenario simulation failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetScenario(): void {
    setBudgetAmount("");
    setBudgetCurrency("");
    setCountry("");
    setIntake("");
    setGpaValue("");
    setGpaScale("");
    setResult(null);
    setLastOverrides(null);
    setSaved(false);
    setError(null);
  }

  async function saveScenario(): Promise<void> {
    if (activeSessionId == null || lastOverrides == null) return;
    setSaving(true);
    setError(null);
    try {
      await saveSessionSimulation(activeSessionId, lastOverrides);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save the scenario."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <section aria-labelledby="what-if-heading" className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-slate-500" aria-hidden />
            What If?
          </CardTitle>
          <p className="text-[13px] font-normal leading-relaxed text-slate-500">
            Temporarily change profile factors to see how recommendations
            would change. Simulation only — the student profile will not be
            changed.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-medium text-slate-600">
              Budget amount
              <input
                aria-label="Scenario budget amount"
                className={cn(inputClass, "mt-1")}
                inputMode="decimal"
                placeholder={defaults.budgetAmount || "e.g. 3000000"}
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Budget currency
              <input
                aria-label="Scenario budget currency"
                className={cn(inputClass, "mt-1")}
                placeholder={defaults.budgetCurrency || "e.g. INR"}
                value={budgetCurrency}
                onChange={(e) => setBudgetCurrency(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Country
              <input
                aria-label="Scenario country"
                className={cn(inputClass, "mt-1")}
                placeholder={defaults.country || "e.g. Canada"}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Intake
              <input
                aria-label="Scenario intake"
                className={cn(inputClass, "mt-1")}
                placeholder={defaults.intake || "e.g. Fall 2027"}
                value={intake}
                onChange={(e) => setIntake(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              GPA value
              <input
                aria-label="Scenario GPA value"
                className={cn(inputClass, "mt-1")}
                inputMode="decimal"
                placeholder={defaults.gpaValue || "e.g. 8.8"}
                value={gpaValue}
                onChange={(e) => setGpaValue(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              GPA scale
              <input
                aria-label="Scenario GPA scale"
                className={cn(inputClass, "mt-1")}
                inputMode="numeric"
                placeholder={defaults.gpaScale || "e.g. 10"}
                value={gpaScale}
                onChange={(e) => setGpaScale(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void applySimulation()} disabled={loading}>
              {loading ? "Simulating…" : "Apply simulation"}
            </Button>
            {(result != null || error != null) && (
              <Button variant="outline" size="sm" onClick={resetScenario}>
                <RotateCcw aria-hidden />
                Reset scenario
              </Button>
            )}
            {result != null && lastOverrides != null && (
              activeSessionId != null ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void saveScenario()}
                  disabled={saving || saved}
                >
                  {saved ? "Saved to session" : saving ? "Saving…" : "Save scenario to session"}
                </Button>
              ) : (
                <span className="text-xs text-slate-400">
                  Start a session to save this scenario.
                </span>
              )
            )}
          </div>
          {error != null && (
            <p role="alert" className="mt-3 text-[13px] text-red-700">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {result != null && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scenario results</CardTitle>
            <p className="text-[13px] font-normal text-slate-500">
              {result.summary.movedUp} up · {result.summary.movedDown} down ·{" "}
              {result.summary.newlyEligible} newly eligible ·{" "}
              {result.summary.noLongerEligible} no longer eligible ·{" "}
              {result.summary.unchanged} unchanged
            </p>
          </CardHeader>
          <CardContent>
            {visibleChanges.length === 0 ? (
              <p className="text-sm text-slate-500">
                No meaningful recommendation changes under this scenario.
              </p>
            ) : (
              <ul className="divide-y">
                {visibleChanges.map((change) => {
                  const dimension = improvedDimension(
                    baselineById.get(change.courseId),
                    simulatedById.get(change.courseId)
                  );
                  return (
                    <li key={change.courseId} className="flex items-start justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {change.courseName}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] tabular-nums text-slate-600">
                          {rankText(change) != null && (
                            <span className="flex items-center gap-1">
                              {change.change === "RANK_UP" && (
                                <ArrowUp className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                              )}
                              {change.change === "RANK_DOWN" && (
                                <ArrowDown className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                              )}
                              {(change.change === "NEWLY_ELIGIBLE") && (
                                <Plus className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                              )}
                              {(change.change === "NO_LONGER_ELIGIBLE") && (
                                <Minus className="h-3.5 w-3.5 text-red-600" aria-hidden />
                              )}
                              {rankText(change)}
                            </span>
                          )}
                          {scoreText(change) != null && <span>{scoreText(change)}</span>}
                        </p>
                        {dimension != null && (
                          <p className="mt-1 text-xs text-slate-500">
                            Stronger because of: {dimension}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("shrink-0", CHANGE_STYLES[change.change])}
                      >
                        {CHANGE_LABELS[change.change]}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
            <Separator className="my-2" />
            <p className="text-xs text-slate-400">
              Baseline recommendations above are unchanged. Reset the scenario
              to return to this view.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
