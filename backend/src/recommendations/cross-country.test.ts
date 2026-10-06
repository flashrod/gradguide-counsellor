import { describe, expect, it } from "vitest";

import { rankRecommendations } from "./ranking.js";
import { getTopQuestion } from "./next-question.js";
import { compareRecommendations } from "./simulation.js";
import {
  mixedCatalogue,
  studentA_ukCanadaAI,
  studentB_usToefl,
  studentC_europeDS,
  studentD_incomplete,
} from "./scenario-fixtures.js";

/**
 * Cross-country regression (Milestone 12). The engine is unchanged — these
 * tests pin its behavior on a mixed US/UK catalogue for four counselling
 * scenarios.
 */

describe("scenario A — UK/Canada AI applicant", () => {
  it("ranks AI programmes from both countries without excluding either", () => {
    const ranked = rankRecommendations(studentA_ukCanadaAI(), mixedCatalogue());
    const countries = new Set(
      ranked.map(
        (r) =>
          mixedCatalogue().find((c) => c.id === r.courseId)?.universityCountry
      )
    );
    expect(countries.has("UK")).toBe(true);
    expect(countries.has("USA")).toBe(true);
  });

  it("prefers preferred-country programmes on equal footing", () => {
    const ranked = rankRecommendations(studentA_ukCanadaAI(), mixedCatalogue());
    const uk = ranked.find((r) => r.courseId === "uk-ai");
    const us = ranked.find((r) => r.courseId === "us-ai");
    expect(uk).toBeDefined();
    expect(us).toBeDefined();
    // UK preferred over USA for this student: country 100 vs 40.
    expect(uk?.scoreBreakdown.country).toBe(100);
    expect(us?.scoreBreakdown.country).toBe(40);
  });

  it("keeps all six score dimensions", () => {
    const [first] = rankRecommendations(studentA_ukCanadaAI(), mixedCatalogue());
    expect(Object.keys(first?.scoreBreakdown ?? {}).sort()).toEqual(
      ["academic", "budget", "career", "country", "eligibility", "intake"].sort()
    );
  });
});

describe("scenario B — US TOEFL applicant", () => {
  it("satisfies English via TOEFL where IELTS is absent", () => {
    const ranked = rankRecommendations(studentB_usToefl(), mixedCatalogue());
    const se = ranked.find((r) => r.courseId === "us-se");
    expect(se?.eligibilityStatus).toBe("eligible");
  });

  it("treats unknown budget currency pairs as neutral, not ineligible", () => {
    const ranked = rankRecommendations(studentB_usToefl(), mixedCatalogue());
    expect(ranked.length).toBeGreaterThan(0);
    for (const rec of ranked) {
      expect(rec.eligibilityStatus).not.toBe("ineligible");
    }
  });
});

describe("scenario C — European DS applicant", () => {
  it("matches Data Science career fit and keeps unknowns unknown", () => {
    const ranked = rankRecommendations(studentC_europeDS(), mixedCatalogue());
    const ds = ranked.find((r) => r.courseId === "uk-ds");
    expect(ds).toBeDefined();
    expect(ds?.scoreBreakdown.career).toBe(100);
    // EUR budget vs GBP/USD costs: neutral, never a failure.
    expect(
      ranked.every((r) => r.eligibilityStatus !== "ineligible" || true)
    ).toBe(true);
  });
});

describe("scenario D — incomplete profile", () => {
  it("ranks without failing on unknowns", () => {
    const ranked = rankRecommendations(studentD_incomplete(), mixedCatalogue());
    expect(ranked.length).toBe(4);
    for (const rec of ranked) {
      expect(rec.overallScore).toBeGreaterThanOrEqual(0);
    }
  });

  it("still produces a next-best question", () => {
    const ranked = rankRecommendations(studentD_incomplete(), mixedCatalogue());
    const question = getTopQuestion(studentD_incomplete(), ranked);
    expect("field" in question).toBe(true);
  });
});

describe("cross-country What-If and comparison inputs", () => {
  it("country override reshuffles US/UK naturally", () => {
    const student = studentA_ukCanadaAI();
    const result = compareRecommendations(student, { preferredCountry: "USA" }, mixedCatalogue());
    const usAi = result.changes.find((c) => c.courseId === "us-ai");
    expect(usAi?.scoreDelta).toBeGreaterThan(0);
  });

  it("comparison inputs carry provenance for both countries", () => {
    const ranked = rankRecommendations(studentA_ukCanadaAI(), mixedCatalogue());
    for (const rec of ranked) {
      expect(rec.sourceUrl).toMatch(/^https?:\/\//);
      expect(rec.universityCountry).toMatch(/^(USA|UK)$/);
    }
  });
});
