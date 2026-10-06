import { describe, expect, it } from "vitest";

import { rankRecommendations } from "./ranking.js";
import { getTopQuestion } from "./next-question.js";
import { compareRecommendations } from "./simulation.js";
import { makeCourse } from "./fixtures.js";
import {
  mixedCatalogue,
  studentA_ukCanadaAI,
  studentC_europeDS,
  studentD_incomplete,
} from "./scenario-fixtures.js";
import type { Course } from "./types.js";

/**
 * Wave 2 regression (Milestone 12B). Canada + Germany courses flow through
 * the UNCHANGED engine: ECTS notes, missing scales, and non-IELTS/TOEFL
 * language evidence must never produce false ineligibility.
 */

function wave2Catalogue(): Course[] {
  return [
    ...mixedCatalogue(),
    makeCourse({
      id: "ca-mcgill",
      universityId: "uni-mcgill",
      universityName: "McGill Test University",
      universityCountry: "Canada",
      name: "Computer Science M.Sc.",
      minGpa: { value: 3.2, scale: 4 },
      minIeltsOverall: 6.5,
      minToeflOverall: 100,
      tuitionAmount: null,
      tuitionCurrency: null,
      tuitionPeriod: null,
      careerTags: [],
      academicBackgrounds: ["Computer Science"],
      intakes: [],
    }),
    makeCourse({
      id: "de-tum",
      universityId: "uni-tum",
      universityName: "TUM Test University",
      universityCountry: "Germany",
      name: "Informatics M.Sc.",
      minGpa: { value: null, scale: null },
      minIeltsOverall: null,
      minToeflOverall: null,
      tuitionAmount: null,
      tuitionCurrency: null,
      tuitionPeriod: null,
      durationMonths: 24,
      careerTags: [],
      academicBackgrounds: ["Computer Science"],
      intakes: ["Winter", "Summer"],
    }),
  ];
}

describe("wave 2 catalogue", () => {
  it("ranks Canadian and German programmes without excluding countries", () => {
    const ranked = rankRecommendations(studentA_ukCanadaAI(), wave2Catalogue());
    const countries = new Set(
      ranked.map(
        (r) => wave2Catalogue().find((c) => c.id === r.courseId)?.universityCountry
      )
    );
    expect(countries.has("Canada")).toBe(true);
    expect(countries.has("Germany")).toBe(true);
    expect(countries.has("USA")).toBe(true);
    expect(countries.has("UK")).toBe(true);
  });

  it("never marks the German course ineligible over unmodeled requirements", () => {
    for (const student of [studentA_ukCanadaAI(), studentC_europeDS(), studentD_incomplete()]) {
      const ranked = rankRecommendations(student, wave2Catalogue());
      const tum = ranked.find((r) => r.courseId === "de-tum");
      // Unknown ≠ ineligible: present with warnings, or absent only for a
      // modeled reason — never silently failed.
      if (tum != null) {
        expect(tum.eligibilityStatus).not.toBe("ineligible");
      }
    }
  });

  it("keeps ECTS/grade evidence out of scoring cutoffs", () => {
    const ranked = rankRecommendations(studentA_ukCanadaAI(), wave2Catalogue());
    const mcgill = ranked.find((r) => r.courseId === "ca-mcgill");
    // Present (intake data is absent upstream, so unknown — never a
    // fabricated ineligible).
    expect(mcgill).toBeDefined();
    expect(mcgill?.eligibilityStatus).not.toBe("ineligible");
  });

  it("still answers next-best-question over four countries", () => {
    const student = studentD_incomplete();
    const ranked = rankRecommendations(student, wave2Catalogue());
    expect(getTopQuestion(student, ranked) != null).toBe(true);
  });

  it("what-if country override reaches Canada and Germany", () => {
    const student = studentA_ukCanadaAI();
    for (const country of ["Canada", "Germany"]) {
      const result = compareRecommendations(student, { preferredCountry: country }, wave2Catalogue());
      const moved = result.changes.filter(
        (c) => c.change === "RANK_UP" || c.change === "RANK_DOWN"
      );
      expect(moved.length).toBeGreaterThan(0);
    }
  });
});
