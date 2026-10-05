import { describe, expect, it } from "vitest";

import { makeCourse, makeStudent } from "./fixtures.js";
import {
  calculateAcademicFit,
  calculateBudgetFit,
  calculateCareerFit,
  calculateCountryFit,
  calculateEstimatedTotalCost,
  calculateIntakeFit,
  calculateScore,
  eligibilityScore,
} from "./scoring.js";
import { evaluateEligibility } from "./eligibility.js";

describe("calculateEstimatedTotalCost", () => {
  it("annual tuition plus annual living cost for a 12-month course", () => {
    const { cost, warnings } = calculateEstimatedTotalCost(makeCourse());
    expect(warnings).toEqual([]);
    expect(cost).toEqual({ amount: 40500, currency: "GBP" });
  });

  it("uses total tuition directly", () => {
    const { cost } = calculateEstimatedTotalCost(
      makeCourse({
        tuitionAmount: 24300,
        tuitionPeriod: "total",
        livingCostAmount: null,
        livingCostCurrency: null,
        livingCostPeriod: null,
      })
    );
    expect(cost).toEqual({ amount: 24300, currency: "GBP" });
  });

  it("multiplies monthly living cost by duration", () => {
    const { cost } = calculateEstimatedTotalCost(
      makeCourse({
        tuitionAmount: null,
        tuitionCurrency: null,
        tuitionPeriod: null,
        livingCostAmount: 1350,
        livingCostCurrency: "GBP",
        livingCostPeriod: "monthly",
      })
    );
    expect(cost).toEqual({ amount: 16200, currency: "GBP" });
  });

  it("multiplies semester tuition by estimated semesters", () => {
    const { cost } = calculateEstimatedTotalCost(
      makeCourse({
        durationMonths: 12,
        tuitionAmount: 10000,
        tuitionPeriod: "semester",
        livingCostAmount: null,
        livingCostCurrency: null,
        livingCostPeriod: null,
      })
    );
    expect(cost).toEqual({ amount: 20000, currency: "GBP" });
  });

  it("uses annual living cost scaled by whole years", () => {
    const { cost } = calculateEstimatedTotalCost(
      makeCourse({
        durationMonths: 16,
        tuitionAmount: null,
        tuitionCurrency: null,
        tuitionPeriod: null,
        livingCostAmount: 12000,
        livingCostPeriod: "annual",
      })
    );
    expect(cost).toEqual({ amount: 24000, currency: "GBP" });
  });

  it("returns null with a warning for mixed currencies", () => {
    const { cost, warnings } = calculateEstimatedTotalCost(
      makeCourse({ livingCostCurrency: "CAD", livingCostPeriod: "annual" })
    );
    expect(cost).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("returns null with a warning when no cost data exists", () => {
    const { cost, warnings } = calculateEstimatedTotalCost(
      makeCourse({
        tuitionAmount: null,
        tuitionCurrency: null,
        tuitionPeriod: null,
        livingCostAmount: null,
        livingCostCurrency: null,
        livingCostPeriod: null,
      })
    );
    expect(cost).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe("calculateEstimatedTotalCost — unknown duration", () => {
  it("returns null for annual tuition with unknown duration", () => {
    const { cost, warnings } = calculateEstimatedTotalCost(
      makeCourse({ durationMonths: null })
    );
    expect(cost).toBeNull();
    expect(warnings.some((w) => w.message.includes("duration"))).toBe(true);
  });

  it("still uses total tuition with unknown duration", () => {
    const { cost } = calculateEstimatedTotalCost(
      makeCourse({
        durationMonths: null,
        tuitionAmount: 24300,
        tuitionCurrency: "CAD",
        tuitionPeriod: "total",
        livingCostAmount: null,
        livingCostCurrency: null,
        livingCostPeriod: null,
      })
    );
    expect(cost).toEqual({ amount: 24300, currency: "CAD" });
  });

  it("treats zero duration as unknown, never as zero cost", () => {
    const { cost } = calculateEstimatedTotalCost(
      makeCourse({ durationMonths: 0 })
    );
    expect(cost).toBeNull();
  });

  it("scores budget neutral when duration is unknown", () => {
    const { score } = calculateBudgetFit(
      makeStudent({ budgetAmount: 100000, budgetCurrency: "GBP" }),
      makeCourse({
        durationMonths: null,
        tuitionAmount: 28500,
        tuitionCurrency: "GBP",
        tuitionPeriod: "annual",
        livingCostAmount: null,
        livingCostCurrency: null,
        livingCostPeriod: null,
      })
    );
    expect(score).toBe(70);
  });
});

describe("calculateBudgetFit", () => {
  const gbpStudent = (budget: number) =>
    makeStudent({ budgetAmount: budget, budgetCurrency: "GBP" });
  const gbpCourse = (tuition: number) =>
    makeCourse({
      tuitionAmount: tuition,
      tuitionPeriod: "total",
      livingCostAmount: null,
      livingCostCurrency: null,
      livingCostPeriod: null,
    });

  it("scores 100 when cost is comfortably below budget", () => {
    expect(calculateBudgetFit(gbpStudent(100000), gbpCourse(50000)).score).toBe(100);
  });

  it("scores moderately when cost is close to budget", () => {
    expect(calculateBudgetFit(gbpStudent(50000), gbpCourse(48000)).score).toBe(70);
  });

  it("scores low when cost is above budget", () => {
    const { score, warnings } = calculateBudgetFit(gbpStudent(40000), gbpCourse(45000));
    expect(score).toBeLessThanOrEqual(40);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("is neutral with a warning when currencies differ", () => {
    const { score, warnings } = calculateBudgetFit(makeStudent(), makeCourse());
    expect(score).toBe(70);
    expect(warnings.some((w) => w.message.includes("currencies differ"))).toBe(true);
  });

  it("is neutral when the student budget is unknown", () => {
    const { score } = calculateBudgetFit(
      makeStudent({ budgetAmount: null }),
      gbpCourse(20000)
    );
    expect(score).toBe(70);
  });
});

describe("calculateCareerFit", () => {
  it("scores 100 on a strong tag match", () => {
    const { score } = calculateCareerFit(makeStudent(), makeCourse());
    expect(score).toBe(100);
  });

  it("scores partially on partial token overlap", () => {
    const { score } = calculateCareerFit(
      makeStudent({ careerGoal: "AI / Machine Learning" }),
      makeCourse({ careerTags: ["AI", "Finance"] })
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("scores 0 with a warning on no overlap", () => {
    const { score, warnings } = calculateCareerFit(
      makeStudent({ careerGoal: "Software Engineering" }),
      makeCourse({ careerTags: ["Cybersecurity", "Security"] })
    );
    expect(score).toBe(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("is neutral with a warning when the career goal is missing", () => {
    const { score, warnings } = calculateCareerFit(
      makeStudent({ careerGoal: null }),
      makeCourse()
    );
    expect(score).toBe(70);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("matches case-insensitively", () => {
    const { score } = calculateCareerFit(
      makeStudent({ careerGoal: "ai / machine learning" }),
      makeCourse({ careerTags: ["AI", "Machine Learning"] })
    );
    expect(score).toBe(100);
  });
});

describe("calculateCountryFit", () => {
  it("scores 100 for a preferred country", () => {
    expect(calculateCountryFit(makeStudent(), makeCourse()).score).toBe(100);
  });

  it("scores lower for a non-preferred country", () => {
    const { score } = calculateCountryFit(
      makeStudent({ preferredCountries: ["UK"] }),
      makeCourse({ universityCountry: "Canada" })
    );
    expect(score).toBeLessThan(70);
  });

  it("is neutral when the student has no country preference", () => {
    expect(
      calculateCountryFit(makeStudent({ preferredCountries: [] }), makeCourse()).score
    ).toBe(70);
  });
});

describe("calculateIntakeFit", () => {
  it("scores 100 on a matching intake", () => {
    expect(calculateIntakeFit(makeStudent(), makeCourse()).score).toBe(100);
  });

  it("scores lower when the preferred intake is not offered", () => {
    expect(
      calculateIntakeFit(
        makeStudent({ preferredIntake: "January 2028" }),
        makeCourse()
      ).score
    ).toBeLessThan(70);
  });

  it("is neutral when intake data is missing", () => {
    expect(
      calculateIntakeFit(makeStudent(), makeCourse({ intakes: [] })).score
    ).toBe(70);
  });

  it("is neutral when the student has no intake preference", () => {
    expect(
      calculateIntakeFit(makeStudent({ preferredIntake: null }), makeCourse()).score
    ).toBe(70);
  });
});

describe("calculateAcademicFit", () => {
  it("rewards comfortably exceeding the minimum more than barely meeting it", () => {
    const high = calculateAcademicFit(
      makeStudent({ gpa: { value: 9.5, scale: 10 } }),
      makeCourse({ minGpa: { value: 8.0, scale: 10 } })
    );
    const bare = calculateAcademicFit(
      makeStudent({ gpa: { value: 8.0, scale: 10 } }),
      makeCourse({ minGpa: { value: 8.0, scale: 10 } })
    );
    expect(high.score).toBeGreaterThan(bare.score);
  });

  it("is neutral with a warning when GPA is missing", () => {
    const { warnings } = calculateAcademicFit(
      makeStudent({ gpa: { value: null, scale: null } }),
      makeCourse()
    );
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe("eligibilityScore", () => {
  it("maps eligible to 100, unknown to 70, ineligible to 0", () => {
    expect(eligibilityScore("eligible")).toBe(100);
    expect(eligibilityScore("unknown")).toBe(70);
    expect(eligibilityScore("ineligible")).toBe(0);
  });
});

describe("calculateScore", () => {
  it("keeps every part within 0–100", () => {
    const student = makeStudent();
    const eligibility = evaluateEligibility(student, makeCourse());
    const result = calculateScore(student, makeCourse(), eligibility);
    for (const value of Object.values(result.breakdown)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
      expect(Number.isInteger(value)).toBe(true);
    }
    expect(Number.isInteger(result.overall)).toBe(true);
  });

  it("applies the documented weights on the baseline fixture", () => {
    // academic: gpaPart 70+(8.4-8.0)*15=76, bg 100 → round(76*.6+100*.4)=86
    // career 100, budget 70 (GBP vs INR), eligibility 100, country 100, intake 100
    // overall = round(86*.25 + 100*.25 + 70*.2 + 100*.15 + 100*.1 + 100*.05) = 91
    const student = makeStudent();
    const eligibility = evaluateEligibility(student, makeCourse());
    const result = calculateScore(student, makeCourse(), eligibility);
    expect(result.breakdown).toEqual({
      academic: 86,
      career: 100,
      budget: 70,
      eligibility: 100,
      country: 100,
      intake: 100,
    });
    expect(result.overall).toBe(91);
    expect(result.estimatedTotalCost).toEqual({ amount: 40500, currency: "GBP" });
  });

  it("never returns NaN on malformed input", () => {
    const student = makeStudent({
      gpa: { value: NaN, scale: 10 },
      budgetAmount: NaN,
      preferredCountries: [],
      preferredIntake: null,
      careerGoal: null,
      workExperienceMonths: null,
    });
    const course = makeCourse({
      durationMonths: -5,
      tuitionAmount: NaN,
      careerTags: [],
      academicBackgrounds: [],
      intakes: [],
    });
    const eligibility = evaluateEligibility(student, course);
    const result = calculateScore(student, course, eligibility);
    expect(Number.isNaN(result.overall)).toBe(false);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });
});
