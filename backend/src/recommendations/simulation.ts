import { z } from "zod";

import { normalizeIntake } from "./intake.js";
import { rankRecommendations } from "./ranking.js";
import type {
  Course,
  RecommendationResult,
  StudentProfile,
} from "./types.js";

/**
 * What-If simulation core (Milestone 8). All pure functions.
 *
 * A simulation copies the real profile in memory, applies temporary
 * overrides, and runs the ONE existing recommendation engine on both the
 * baseline and the simulated profile. Nothing here scores, ranks, or
 * touches the database — the engine does that; this module only prepares
 * inputs and diffs outputs.
 */

export const simulationOverridesSchema = z
  .object({
    gpa: z
      .object({
        value: z.number().finite().nonnegative(),
        scale: z.number().int().positive(),
      })
      .refine((gpa) => gpa.value <= gpa.scale, {
        message: "GPA value must not exceed its scale",
      })
      .optional(),
    budget: z
      .object({
        amount: z.number().finite().nonnegative(),
        currency: z
          .string()
          .length(3, "Currency must be a 3-letter code")
          .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter code"),
      })
      .optional(),
    preferredCountry: z.string().trim().min(1).max(100).optional(),
    preferredIntake: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine((value) => normalizeIntake(value) != null, {
        message: "Intake must be a recognizable season, month, or rolling intake",
      })
      .optional(),
  })
  .strict();

export type SimulationOverrides = z.infer<typeof simulationOverridesSchema>;

export type RecommendationChangeType =
  | "NEWLY_ELIGIBLE"
  | "NO_LONGER_ELIGIBLE"
  | "RANK_UP"
  | "RANK_DOWN"
  | "UNCHANGED";

export interface RecommendationChange {
  courseId: string;
  courseName: string;
  change: RecommendationChangeType;
  /** True when the course crossed the eligible/ineligible boundary. */
  eligibilityChanged: boolean;
  oldRank: number | null;
  newRank: number | null;
  oldScore: number | null;
  newScore: number | null;
  scoreDelta: number | null;
}

export interface SimulationSummary {
  movedUp: number;
  movedDown: number;
  newlyEligible: number;
  noLongerEligible: number;
  unchanged: number;
}

export interface SimulationComparison {
  baseline: RecommendationResult[];
  simulated: RecommendationResult[];
  changes: RecommendationChange[];
  summary: SimulationSummary;
}

/**
 * Copy a profile and apply temporary overrides. The input object is never
 * mutated. Wholly unknown override sets are rejected upstream by Zod —
 * here an empty override set is a no-op copy.
 */
export function applySimulationOverrides(
  student: StudentProfile,
  overrides: SimulationOverrides
): StudentProfile {
  return {
    ...student,
    ielts: { ...student.ielts },
    gpa:
      overrides.gpa != null
        ? { value: overrides.gpa.value, scale: overrides.gpa.scale }
        : { ...student.gpa },
    budgetAmount:
      overrides.budget != null ? overrides.budget.amount : student.budgetAmount,
    budgetCurrency:
      overrides.budget != null
        ? overrides.budget.currency.toUpperCase()
        : student.budgetCurrency,
    preferredCountries:
      overrides.preferredCountry != null
        ? [overrides.preferredCountry]
        : [...student.preferredCountries],
    preferredIntake:
      overrides.preferredIntake ?? student.preferredIntake,
  };
}

/** Rank both profiles with the single existing engine and diff the lists. */
export function compareRecommendations(
  student: StudentProfile,
  overrides: SimulationOverrides,
  courses: Course[]
): SimulationComparison {
  const baseline = rankRecommendations(student, courses);
  const simulated = rankRecommendations(
    applySimulationOverrides(student, overrides),
    courses
  );
  return {
    baseline,
    simulated,
    ...diffRecommendations(baseline, simulated),
  };
}

function toRankMap(
  results: RecommendationResult[]
): Map<string, { rank: number; result: RecommendationResult }> {
  const map = new Map<string, { rank: number; result: RecommendationResult }>();
  results.forEach((result, index) => {
    map.set(result.courseId, { rank: index + 1, result });
  });
  return map;
}

/**
 * Diff two ranked lists. Baseline ranking is exhaustive (every non-ineligible
 * course is ranked), so appearing only in `simulated` means newly eligible
 * and vice versa — NEWLY_ELIGIBLE/NO_LONGER_ELIGIBLE therefore coincide
 * with newly recommended/removed, and `eligibilityChanged` marks the
 * boundary crossing explicitly.
 */
export function diffRecommendations(
  baseline: RecommendationResult[],
  simulated: RecommendationResult[]
): { changes: RecommendationChange[]; summary: SimulationSummary } {
  const baselineById = toRankMap(baseline);
  const simulatedById = toRankMap(simulated);
  const ids = new Set([...baselineById.keys(), ...simulatedById.keys()]);

  const changes: RecommendationChange[] = [];
  for (const courseId of [...ids].sort()) {
    const oldEntry = baselineById.get(courseId);
    const newEntry = simulatedById.get(courseId);
    const courseName =
      newEntry?.result.courseName ?? oldEntry?.result.courseName ?? courseId;

    if (oldEntry == null && newEntry == null) continue;
    if (oldEntry == null && newEntry != null) {
      changes.push({
        courseId,
        courseName,
        change: "NEWLY_ELIGIBLE",
        eligibilityChanged: true,
        oldRank: null,
        newRank: newEntry.rank,
        oldScore: null,
        newScore: newEntry.result.overallScore,
        scoreDelta: null,
      });
      continue;
    }
    if (newEntry == null && oldEntry != null) {
      changes.push({
        courseId,
        courseName,
        change: "NO_LONGER_ELIGIBLE",
        eligibilityChanged: true,
        oldRank: oldEntry.rank,
        newRank: null,
        oldScore: oldEntry.result.overallScore,
        newScore: null,
        scoreDelta: null,
      });
      continue;
    }
    if (oldEntry != null && newEntry != null) {
      const scoreDelta =
        newEntry.result.overallScore - oldEntry.result.overallScore;
      const change: RecommendationChangeType =
        newEntry.rank < oldEntry.rank
          ? "RANK_UP"
          : newEntry.rank > oldEntry.rank
            ? "RANK_DOWN"
            : "UNCHANGED";
      changes.push({
        courseId,
        courseName,
        change,
        eligibilityChanged:
          oldEntry.result.eligibilityStatus !== newEntry.result.eligibilityStatus,
        oldRank: oldEntry.rank,
        newRank: newEntry.rank,
        oldScore: oldEntry.result.overallScore,
        newScore: newEntry.result.overallScore,
        scoreDelta,
      });
    }
  }

  const summary: SimulationSummary = {
    movedUp: changes.filter((c) => c.change === "RANK_UP").length,
    movedDown: changes.filter((c) => c.change === "RANK_DOWN").length,
    newlyEligible: changes.filter((c) => c.change === "NEWLY_ELIGIBLE").length,
    noLongerEligible: changes.filter((c) => c.change === "NO_LONGER_ELIGIBLE").length,
    unchanged: changes.filter((c) => c.change === "UNCHANGED").length,
  };
  return { changes, summary };
}
