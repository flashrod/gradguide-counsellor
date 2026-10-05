import { describe, expect, it } from "vitest";

import { makeCourse, makeStudent } from "./fixtures.js";
import { rankRecommendations } from "./ranking.js";

describe("rankRecommendations", () => {
  it("ranks the higher-scoring course first", () => {
    const student = makeStudent({
      budgetAmount: 100000,
      budgetCurrency: "GBP",
      preferredCountries: [],
      preferredIntake: null,
      careerGoal: null,
    });
    const cheap = makeCourse({
      id: "course-cheap",
      tuitionAmount: 20000,
      tuitionPeriod: "total",
      livingCostAmount: null,
      livingCostCurrency: null,
      livingCostPeriod: null,
      careerTags: [],
      academicBackgrounds: [],
      intakes: [],
    });
    const pricey = makeCourse({
      id: "course-pricey",
      tuitionAmount: 90000,
      tuitionPeriod: "total",
      livingCostAmount: null,
      livingCostCurrency: null,
      livingCostPeriod: null,
      careerTags: [],
      academicBackgrounds: [],
      intakes: [],
    });
    const ranked = rankRecommendations(student, [pricey, cheap]);
    expect(ranked.map((r) => r.courseId)).toEqual(["course-cheap", "course-pricey"]);
  });

  it("excludes definitively ineligible courses", () => {
    const ranked = rankRecommendations(makeStudent(), [
      makeCourse({ id: "ok" }),
      makeCourse({ id: "too-low-gpa", minGpa: 9.9 }),
    ]);
    expect(ranked.map((r) => r.courseId)).toEqual(["ok"]);
  });

  it("keeps unknown courses visible with warnings", () => {
    const ranked = rankRecommendations(
      makeStudent({ gpa: null }),
      [makeCourse({ id: "unknown-gpa" })]
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.eligibilityStatus).toBe("unknown");
    expect(ranked[0]?.warnings.length).toBeGreaterThan(0);
  });

  it("breaks ties deterministically by course id", () => {
    const first = rankRecommendations(makeStudent(), [
      makeCourse({ id: "course-b" }),
      makeCourse({ id: "course-a" }),
    ]);
    const second = rankRecommendations(makeStudent(), [
      makeCourse({ id: "course-a" }),
      makeCourse({ id: "course-b" }),
    ]);
    expect(first.map((r) => r.courseId)).toEqual(["course-a", "course-b"]);
    expect(second.map((r) => r.courseId)).toEqual(["course-a", "course-b"]);
  });

  it("returns an empty list when every course is ineligible", () => {
    expect(
      rankRecommendations(makeStudent(), [makeCourse({ minGpa: 9.9 })])
    ).toEqual([]);
  });
});

describe("recommendation consistency", () => {
  it("produces identical results across repeated runs", () => {
    const student = makeStudent();
    const courses = [
      makeCourse({ id: "course-1" }),
      makeCourse({ id: "course-2", tuitionAmount: 50000 }),
      makeCourse({ id: "course-3", minGpa: 9.9 }),
      makeCourse({ id: "course-4", intakes: ["January 2028"] }),
    ];
    const runs = Array.from({ length: 5 }, () =>
      rankRecommendations(student, courses)
    );
    for (const run of runs.slice(1)) {
      expect(run).toEqual(runs[0]);
    }
    // And the content itself is fully populated.
    const [first] = runs[0] ?? [];
    expect(first?.reasons.length).toBeGreaterThan(0);
    expect(first?.scoreBreakdown).toBeDefined();
  });
});
