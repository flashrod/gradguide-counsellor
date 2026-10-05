import { describe, expect, it } from "vitest";

import { makeCourse, makeStudent } from "./fixtures.js";
import {
  applySimulationOverrides,
  compareRecommendations,
  diffRecommendations,
  simulationOverridesSchema,
} from "./simulation.js";
import { rankRecommendations } from "./ranking.js";
import type { Course } from "./types.js";

function gbpCourse(id: string, totalTuition: number): Course {
  return makeCourse({
    id,
    tuitionAmount: totalTuition,
    tuitionPeriod: "total",
    livingCostAmount: null,
    livingCostCurrency: null,
    livingCostPeriod: null,
  });
}

describe("simulationOverridesSchema", () => {
  it("accepts a full valid override set", () => {
    expect(
      simulationOverridesSchema.safeParse({
        gpa: { value: 8.8, scale: 10 },
        budget: { amount: 3000000, currency: "INR" },
        preferredCountry: "Canada",
        preferredIntake: "Fall 2027",
      }).success
    ).toBe(true);
  });

  it("rejects GPA above its scale", () => {
    const result = simulationOverridesSchema.safeParse({
      gpa: { value: 11, scale: 10 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero and negative scales", () => {
    expect(
      simulationOverridesSchema.safeParse({ gpa: { value: 3, scale: 0 } }).success
    ).toBe(false);
  });

  it("rejects negative budgets", () => {
    expect(
      simulationOverridesSchema.safeParse({
        budget: { amount: -100, currency: "INR" },
      }).success
    ).toBe(false);
  });

  it("rejects malformed currencies", () => {
    expect(
      simulationOverridesSchema.safeParse({
        budget: { amount: 100, currency: "RUPEES" },
      }).success
    ).toBe(false);
  });

  it("rejects unrecognizable intakes", () => {
    expect(
      simulationOverridesSchema.safeParse({ preferredIntake: "someday maybe" })
        .success
    ).toBe(false);
  });

  it("rejects blank countries", () => {
    expect(
      simulationOverridesSchema.safeParse({ preferredCountry: "  " }).success
    ).toBe(false);
  });

  it("rejects unknown override fields", () => {
    expect(
      simulationOverridesSchema.safeParse({ degree: "PhD" } as Record<string, unknown>)
        .success
    ).toBe(false);
  });
});

describe("applySimulationOverrides", () => {
  it("overrides GPA with value and scale preserved", () => {
    const student = makeStudent();
    const simulated = applySimulationOverrides(student, {
      gpa: { value: 9.0, scale: 10 },
    });
    expect(simulated.gpa).toEqual({ value: 9.0, scale: 10 });
    expect(student.gpa).toEqual({ value: 8.4, scale: 10 });
  });

  it("overrides budget, country, and intake together", () => {
    const simulated = applySimulationOverrides(makeStudent(), {
      budget: { amount: 3000000, currency: "INR" },
      preferredCountry: "Canada",
      preferredIntake: "Fall 2027",
    });
    expect(simulated.budgetAmount).toBe(3000000);
    expect(simulated.preferredCountries).toEqual(["Canada"]);
    expect(simulated.preferredIntake).toBe("Fall 2027");
  });

  it("leaves the input profile untouched", () => {
    const student = makeStudent();
    const snapshot = JSON.parse(JSON.stringify(student));
    applySimulationOverrides(student, {
      budget: { amount: 1, currency: "USD" },
    });
    expect(student).toEqual(snapshot);
  });
});

describe("compareRecommendations — GPA", () => {
  it("makes a below-threshold course newly eligible on a GPA bump", () => {
    const student = makeStudent({ gpa: { value: 7.0, scale: 10 } });
    const courses = [
      makeCourse({ id: "a", minGpa: { value: 8.0, scale: 10 } }),
      makeCourse({ id: "b", minGpa: { value: 6.0, scale: 10 } }),
    ];
    const result = compareRecommendations(student, { gpa: { value: 8.5, scale: 10 } }, courses);
    expect(result.baseline.map((r) => r.courseId)).toEqual(["b"]);
    const newly = result.changes.find((c) => c.courseId === "a");
    expect(newly?.change).toBe("NEWLY_ELIGIBLE");
    expect(newly?.eligibilityChanged).toBe(true);
    expect(result.summary.newlyEligible).toBe(1);
  });

  it("drops a course on a GPA reduction", () => {
    const student = makeStudent({ gpa: { value: 8.4, scale: 10 } });
    const courses = [makeCourse({ id: "a", minGpa: { value: 8.0, scale: 10 } })];
    const result = compareRecommendations(student, { gpa: { value: 7.0, scale: 10 } }, courses);
    expect(result.changes[0]?.change).toBe("NO_LONGER_ELIGIBLE");
    expect(result.summary.noLongerEligible).toBe(1);
  });
});

describe("compareRecommendations — budget/country/intake", () => {
  it("raises scores when the budget grows to cover costs", () => {
    const student = makeStudent({ budgetAmount: 30000, budgetCurrency: "GBP" });
    const courses = [gbpCourse("pricey", 90000)];
    const result = compareRecommendations(
      student,
      { budget: { amount: 200000, currency: "GBP" } },
      courses
    );
    const change = result.changes.find((c) => c.courseId === "pricey");
    // Budget part moves 15 → 100, i.e. +17 overall at 20% weight.
    expect(change?.scoreDelta).toBe(17);
  });

  it("flips ranks on an intake switch", () => {
    const student = makeStudent({ preferredIntake: "September 2027" });
    const courses = [
      makeCourse({ id: "fall-course", intakes: ["Fall"] }),
      makeCourse({ id: "spring-course", intakes: ["Spring"] }),
    ];
    const baseline = rankRecommendations(student, courses);
    expect(baseline[0]?.courseId).toBe("fall-course");
    const result = compareRecommendations(
      student,
      { preferredIntake: "Spring 2028" },
      courses
    );
    expect(result.changes.find((c) => c.courseId === "spring-course")?.change).toBe("RANK_UP");
    expect(result.changes.find((c) => c.courseId === "fall-course")?.change).toBe("RANK_DOWN");
    expect(result.summary.movedUp).toBe(1);
    expect(result.summary.movedDown).toBe(1);
  });

  it("reflects a country switch in country scores", () => {
    const student = makeStudent({ preferredCountries: ["UK"] });
    const courses = [makeCourse({ id: "a", universityCountry: "UK" })];
    const result = compareRecommendations(student, { preferredCountry: "Canada" }, courses);
    const change = result.changes.find((c) => c.courseId === "a");
    expect(change?.change).toBe("UNCHANGED");
    expect(change?.scoreDelta).toBeLessThan(0);
  });

  it("reflects an intake switch", () => {
    const student = makeStudent({ preferredIntake: "September 2027" });
    const courses = [makeCourse({ id: "a", intakes: ["Fall"] })];
    const result = compareRecommendations(student, { preferredIntake: "Spring 2028" }, courses);
    const change = result.changes.find((c) => c.courseId === "a");
    expect(change?.scoreDelta).toBeLessThan(0);
  });
});

describe("compareRecommendations — determinism and shape", () => {
  it("is deeply equal across repeated runs", () => {
    const student = makeStudent();
    const courses = [makeCourse({ id: "a" }), makeCourse({ id: "b" })];
    const overrides = { budget: { amount: 3000000, currency: "INR" } };
    const first = compareRecommendations(student, overrides, courses);
    const second = compareRecommendations(student, overrides, courses);
    expect(second).toEqual(first);
  });

  it("marks unchanged recommendations explicitly", () => {
    const result = compareRecommendations(makeStudent(), {}, [makeCourse({ id: "a" })]);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({
      change: "UNCHANGED",
      oldRank: 1,
      newRank: 1,
      scoreDelta: 0,
    });
    expect(result.summary.unchanged).toBe(1);
  });
});
