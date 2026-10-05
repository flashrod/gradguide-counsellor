import { describe, expect, it } from "vitest";

import { makeStudent } from "./fixtures.js";
import {
  getTopQuestion,
  rankQuestions,
  type QuestionField,
} from "./next-question.js";
import type { Evidence, RecommendationResult } from "./types.js";

function makeRec(
  index: number,
  warningCategories: string[] = [],
  name?: string
): RecommendationResult {
  return {
    courseId: `course-${index}`,
    universityId: "uni-1",
    courseName: name ?? `Course ${index}`,
    universityName: "Test University",
    universityCountry: "UK",
    sourceUrl: "https://example.com",
    sourceName: "Test source",
    lastVerifiedAt: new Date().toISOString(),
    intakes: ["Fall"],
    eligibilityStatus: "eligible",
    overallScore: 90 - index,
    scoreBreakdown: {
      academic: 90,
      career: 90,
      budget: 90,
      eligibility: 100,
      country: 100,
      intake: 100,
    },
    reasons: [],
    warnings: warningCategories.map(
      (category): Evidence => ({
        type: "warning",
        category: category as Evidence["category"],
        message: `${category} is uncertain.`,
      })
    ),
    estimatedTotalCost: null,
  };
}

function tenRecs(affectedAt: number[], category: string): RecommendationResult[] {
  return Array.from({ length: 10 }, (_, i) =>
    makeRec(i, affectedAt.includes(i) ? [category] : [])
  );
}

describe("rankQuestions — budget", () => {
  it("ranks budget highly when 7 of 10 carry budget uncertainty", () => {
    const student = makeStudent({ budgetAmount: null, budgetCurrency: null });
    const [top] = rankQuestions(student, tenRecs([0, 1, 2, 3, 4, 5, 6], "budget"));
    expect(top?.field).toBe("budget");
    expect(top?.priority).toBe("HIGH");
    expect(top?.affectedRecommendationCount).toBe(7);
    expect(top?.affectedRecommendationPercentage).toBe(70);
    expect(top?.question).toContain("budget");
  });

  it("ignores budget when the student budget is known", () => {
    const student = makeStudent({ budgetAmount: 100000, budgetCurrency: "GBP" });
    const ranked = rankQuestions(student, tenRecs([0, 1, 2], "budget"));
    expect(ranked.some((q) => q.field === "budget")).toBe(false);
  });
});

describe("rankQuestions — English alternatives", () => {
  it("does not ask for TOEFL when IELTS already satisfies requirements", () => {
    const student = makeStudent({ toeflOverall: null });
    const recs = [makeRec(0, []), makeRec(1, [])];
    const ranked = rankQuestions(student, recs);
    expect(ranked.some((q) => q.field === "english")).toBe(false);
  });

  it("ranks English highly when neither score exists", () => {
    const student = makeStudent({
      ielts: { overall: null, writing: null, reading: null, listening: null, speaking: null },
      toeflOverall: null,
    });
    const [top] = rankQuestions(student, tenRecs([0, 1, 2, 3, 4, 5, 6], "ielts"));
    expect(top?.field).toBe("english");
    expect(top?.priority).toBe("HIGH");
  });
});

describe("rankQuestions — other fields", () => {
  it("gives intake meaningful impact when preference is missing", () => {
    const student = makeStudent({ preferredIntake: null });
    const [top] = rankQuestions(student, tenRecs([0, 1, 2, 3], "intake"));
    expect(top?.field).toBe("intake");
    expect(top?.affectedRecommendationCount).toBe(10);
  });

  it("lets country rank highly without preferences", () => {
    const student = makeStudent({ preferredCountries: [] });
    const ranked = rankQuestions(student, tenRecs([0], "budget"));
    expect(ranked.some((q) => q.field === "country")).toBe(true);
  });

  it("scopes work experience to affected courses only", () => {
    const student = makeStudent({ workExperienceMonths: null });
    const [top] = rankQuestions(student, tenRecs([0, 4], "work-experience"));
    expect(top?.field).toBe("work-experience");
    expect(top?.affectedRecommendationCount).toBe(2);
  });

  it("asks about career goals when missing", () => {
    const student = makeStudent({ careerGoal: null });
    const [top] = rankQuestions(student, tenRecs([0, 1, 2], "career"));
    expect(top?.field).toBe("career");
  });

  it("asks about GPA when scale is unknown", () => {
    const student = makeStudent({ gpa: { value: 8.4, scale: null } });
    const [top] = rankQuestions(student, tenRecs([0, 1], "gpa"));
    expect(top?.field).toBe("academic");
  });
});

describe("rankQuestions — ranking sensitivity", () => {
  it("weights top-ranked affected courses more than distant ones", () => {
    const student = makeStudent({ budgetAmount: null, budgetCurrency: null });
    const topAffected = rankQuestions(student, tenRecs([0, 1], "budget"));
    const bottomAffected = rankQuestions(student, tenRecs([8, 9], "budget"));
    const topImpact = topAffected.find((q) => q.field === "budget")?.impactScore ?? 0;
    const bottomImpact = bottomAffected.find((q) => q.field === "budget")?.impactScore ?? 0;
    expect(topImpact).toBeGreaterThan(bottomImpact);
  });
});

describe("rankQuestions — ties and determinism", () => {
  it("breaks equal impacts by fixed field order", () => {
    const student = makeStudent({
      budgetAmount: null,
      budgetCurrency: null,
      ielts: { overall: null, writing: null, reading: null, listening: null, speaking: null },
      toeflOverall: null,
    });
    const recs = [
      makeRec(0, ["budget", "ielts"]),
      makeRec(1, ["budget", "ielts"]),
    ];
    const [first, second] = rankQuestions(student, recs);
    expect(first?.field).toBe("english");
    expect(second?.field).toBe("budget");
  });

  it("returns identical results across 10 runs", () => {
    const student = makeStudent({ budgetAmount: null, budgetCurrency: null });
    const recs = tenRecs([0, 2, 5], "budget");
    const runs = Array.from({ length: 10 }, () => rankQuestions(student, recs));
    for (const run of runs.slice(1)) expect(run).toEqual(runs[0]);
  });
});

describe("rankQuestions — edge cases", () => {
  const fullStudent = makeStudent();

  it("returns complete when nothing is missing", () => {
    expect(getTopQuestion(fullStudent, [makeRec(0, []), makeRec(1, [])])).toEqual({
      status: "complete",
      message: expect.any(String),
    });
  });

  it("returns complete with no recommendations", () => {
    expect(getTopQuestion(fullStudent, [])).toEqual({
      status: "complete",
      message: expect.any(String),
    });
  });

  it("survives malformed recommendation evidence", () => {
    const malformed = makeRec(0, []) as unknown as Record<string, unknown>;
    malformed["warnings"] = undefined;
    const result = getTopQuestion(
      fullStudent,
      [malformed as unknown as RecommendationResult]
    );
    expect(result).toEqual({ status: "complete", message: expect.any(String) });
  });

  it("counts recommendations once despite duplicate warnings", () => {
    const student = makeStudent({ budgetAmount: null, budgetCurrency: null });
    const rec = makeRec(0, ["budget", "budget", "budget"]);
    const [top] = rankQuestions(student, [rec]);
    expect(top?.affectedRecommendationCount).toBe(1);
    expect(top?.affectedRecommendationPercentage).toBe(100);
  });

  it("exposes affected course names", () => {
    const student = makeStudent({ budgetAmount: null, budgetCurrency: null });
    const [top] = rankQuestions(student, [
      makeRec(0, ["budget"], "Alpha"),
      makeRec(1, [], "Beta"),
    ]);
    expect(top?.affectedCourses).toEqual(["Alpha"]);
  });

  it("maps impact to documented priority thresholds", () => {
    const student = makeStudent({ budgetAmount: null, budgetCurrency: null });
    const [single] = rankQuestions(student, [makeRec(0, ["budget"])]);
    // 1 of 1 → coverage 1.0, rankCoverage 1.0 → impact 100 → HIGH.
    expect(single?.impactScore).toBe(100);
    expect(single?.priority).toBe("HIGH");
    const fields: QuestionField[] = ["budget", "country", "intake", "academic", "english", "work-experience", "career"];
    expect(new Set(fields).size).toBe(7);
  });
});
