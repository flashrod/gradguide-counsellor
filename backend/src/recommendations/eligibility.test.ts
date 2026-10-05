import { describe, expect, it } from "vitest";

import { evaluateEligibility } from "./eligibility.js";
import { makeCourse, makeStudent } from "./fixtures.js";

describe("evaluateEligibility — GPA (scale-aware)", () => {
  it("passes 8.4/10 against a 3.0/4.0 requirement", () => {
    const result = evaluateEligibility(
      makeStudent({ gpa: { value: 8.4, scale: 10 } }),
      makeCourse({ minGpa: { value: 3.0, scale: 4 } })
    );
    expect(result.status).toBe("eligible");
  });

  it("fails 7.0/10 against a 3.0/4.0 requirement", () => {
    const result = evaluateEligibility(
      makeStudent({ gpa: { value: 7.0, scale: 10 } }),
      makeCourse({ minGpa: { value: 3.0, scale: 4 } })
    );
    expect(result.status).toBe("ineligible");
  });

  it("passes when GPA is exactly at the normalized requirement", () => {
    const result = evaluateEligibility(
      makeStudent({ gpa: { value: 8.0, scale: 10 } }),
      makeCourse({ minGpa: { value: 8.0, scale: 10 } })
    );
    expect(result.status).toBe("eligible");
  });

  it("is ineligible when GPA is below the requirement", () => {
    const result = evaluateEligibility(
      makeStudent({ gpa: { value: 7.9, scale: 10 } }),
      makeCourse({ minGpa: { value: 8.0, scale: 10 } })
    );
    expect(result.status).toBe("ineligible");
    expect(result.reasons.some((r) => r.category === "gpa")).toBe(true);
  });

  it("is unknown (not ineligible) when GPA is missing", () => {
    const result = evaluateEligibility(
      makeStudent({ gpa: { value: null, scale: null } }),
      makeCourse({ minGpa: { value: 8.0, scale: 10 } })
    );
    expect(result.status).toBe("unknown");
    expect(result.warnings.some((w) => w.category === "gpa")).toBe(true);
  });

  it("is unknown when the course scale is missing", () => {
    const result = evaluateEligibility(
      makeStudent({ gpa: { value: 8.4, scale: 10 } }),
      makeCourse({ minGpa: { value: 3.0, scale: null } })
    );
    // Value present but scale unknown → unknown, never ineligible.
    expect(result.status).toBe("unknown");
    expect(result.warnings.some((w) => w.category === "gpa")).toBe(true);
  });

  it("is unknown when the student scale is missing", () => {
    const result = evaluateEligibility(
      makeStudent({ gpa: { value: 8.4, scale: null } }),
      makeCourse({ minGpa: { value: 3.0, scale: 4 } })
    );
    expect(result.status).toBe("unknown");
  });

  it("passes when the course has no GPA requirement", () => {
    const result = evaluateEligibility(
      makeStudent({ gpa: { value: null, scale: null } }),
      makeCourse({ minGpa: { value: null, scale: null } })
    );
    expect(result.status).toBe("eligible");
  });
});

describe("evaluateEligibility — English (IELTS/TOEFL alternatives)", () => {
  const ieltsOnly = () => makeCourse({ minIeltsOverall: 7.0, minToeflOverall: null });
  const noSections = {
    minIeltsWriting: null,
    minIeltsReading: null,
    minIeltsListening: null,
    minIeltsSpeaking: null,
  };
  const toeflOnly = () =>
    makeCourse({ minIeltsOverall: null, minToeflOverall: 88, ...noSections });
  const both = () => makeCourse({ minIeltsOverall: 6.5, minToeflOverall: 88 });
  it("passes when IELTS is above the requirement", () => {
    const result = evaluateEligibility(
      makeStudent({ ielts: { overall: 7.5, writing: 7, reading: 7, listening: 7, speaking: 7 } }),
      ieltsOnly()
    );
    expect(result.status).toBe("eligible");
  });

  it("passes when IELTS is exactly at the requirement", () => {
    const result = evaluateEligibility(
      makeStudent({ ielts: { overall: 7.0, writing: 7, reading: 7, listening: 7, speaking: 7 } }),
      ieltsOnly()
    );
    expect(result.status).toBe("eligible");
  });

  it("is ineligible when IELTS is below the requirement", () => {
    const result = evaluateEligibility(
      makeStudent({ ielts: { overall: 6.5, writing: 7, reading: 7, listening: 7, speaking: 7 } }),
      ieltsOnly()
    );
    expect(result.status).toBe("ineligible");
  });

  it("is unknown (not ineligible) when IELTS is missing", () => {
    const result = evaluateEligibility(
      makeStudent({
        ielts: { overall: null, writing: null, reading: null, listening: null, speaking: null },
      }),
      ieltsOnly()
    );
    expect(result.status).toBe("unknown");
  });

  it("passes when TOEFL is above the requirement", () => {
    const result = evaluateEligibility(
      makeStudent({
        ielts: { overall: null, writing: null, reading: null, listening: null, speaking: null },
        toeflOverall: 95,
      }),
      toeflOnly()
    );
    expect(result.status).toBe("eligible");
  });

  it("passes when TOEFL is exactly at the requirement", () => {
    const result = evaluateEligibility(
      makeStudent({
        ielts: { overall: null, writing: null, reading: null, listening: null, speaking: null },
        toeflOverall: 88,
      }),
      toeflOnly()
    );
    expect(result.status).toBe("eligible");
  });

  it("is ineligible when TOEFL is below the requirement", () => {
    const result = evaluateEligibility(
      makeStudent({
        ielts: { overall: null, writing: null, reading: null, listening: null, speaking: null },
        toeflOverall: 80,
      }),
      toeflOnly()
    );
    expect(result.status).toBe("ineligible");
  });

  it("is unknown when student TOEFL is missing", () => {
    const result = evaluateEligibility(
      makeStudent({ toeflOverall: null }),
      toeflOnly()
    );
    // Baseline student has IELTS 7.5 but the course only accepts TOEFL —
    // no cross-test conversion, so this is unknown, not satisfied.
    expect(result.status).toBe("unknown");
  });

  it("satisfies English via IELTS when both are accepted", () => {
    const result = evaluateEligibility(makeStudent(), both());
    expect(result.status).toBe("eligible");
  });

  it("satisfies English via TOEFL when both are accepted", () => {
    const result = evaluateEligibility(
      makeStudent({
        ielts: { overall: null, writing: null, reading: null, listening: null, speaking: null },
        toeflOverall: 95,
      }),
      makeCourse({ minIeltsOverall: 6.5, minToeflOverall: 88, ...noSections })
    );
    expect(result.status).toBe("eligible");
  });

  it("is ineligible when neither accepted score suffices", () => {
    const result = evaluateEligibility(
      makeStudent({
        ielts: { overall: 6.0, writing: 6, reading: 6, listening: 6, speaking: 6 },
        toeflOverall: 80,
      }),
      both()
    );
    expect(result.status).toBe("ineligible");
  });

  it("is ineligible when an IELTS section is below its minimum", () => {
    const result = evaluateEligibility(
      makeStudent({ ielts: { overall: 7.5, writing: 6.0, reading: 7, listening: 7, speaking: 7 } }),
      makeCourse({ minIeltsWriting: 6.5 })
    );
    expect(result.status).toBe("ineligible");
    expect(result.reasons.some((r) => r.message.includes("writing"))).toBe(true);
  });

  it("is unknown when a required IELTS section score is missing", () => {
    const result = evaluateEligibility(
      makeStudent({ ielts: { overall: 7.5, writing: null, reading: 7, listening: 7, speaking: 7 } }),
      makeCourse({ minIeltsWriting: 6.5 })
    );
    expect(result.status).toBe("unknown");
    expect(result.warnings.some((w) => w.message.includes("writing"))).toBe(true);
  });
});

describe("evaluateEligibility — work experience", () => {
  const requiringCourse = () =>
    makeCourse({ workExperienceRequired: true, workExperienceMonthsRequired: 12 });

  it("passes when experience meets the requirement", () => {
    const result = evaluateEligibility(
      makeStudent({ workExperienceMonths: 12 }),
      requiringCourse()
    );
    expect(result.status).toBe("eligible");
  });

  it("is ineligible when experience is below the requirement", () => {
    const result = evaluateEligibility(
      makeStudent({ workExperienceMonths: 6 }),
      requiringCourse()
    );
    expect(result.status).toBe("ineligible");
  });

  it("is unknown when student experience is missing", () => {
    const result = evaluateEligibility(
      makeStudent({ workExperienceMonths: null }),
      requiringCourse()
    );
    expect(result.status).toBe("unknown");
  });

  it("is unknown when the required months are unspecified", () => {
    const result = evaluateEligibility(
      makeStudent({ workExperienceMonths: 24 }),
      makeCourse({ workExperienceRequired: true, workExperienceMonthsRequired: null })
    );
    expect(result.status).toBe("unknown");
  });

  it("passes when no work experience is required", () => {
    const result = evaluateEligibility(
      makeStudent({ workExperienceMonths: null }),
      makeCourse({ workExperienceRequired: false })
    );
    expect(result.status).toBe("eligible");
  });
});

describe("evaluateEligibility — academic background", () => {
  it("passes on a matching background", () => {
    const result = evaluateEligibility(
      makeStudent({ field: "Computer Science" }),
      makeCourse({ academicBackgrounds: ["Computer Science"] })
    );
    expect(result.status).toBe("eligible");
  });

  it("matches case-insensitively against degree text", () => {
    const result = evaluateEligibility(
      makeStudent({ degree: "B.Tech Computer Science", field: "Engineering" }),
      makeCourse({ academicBackgrounds: ["computer science"] })
    );
    expect(result.status).toBe("eligible");
  });

  it("is ineligible on a clear background mismatch", () => {
    const result = evaluateEligibility(
      makeStudent({ degree: "BA History", field: "History" }),
      makeCourse({ academicBackgrounds: ["Computer Science"] })
    );
    expect(result.status).toBe("ineligible");
  });

  it("is unknown when the course lists no backgrounds", () => {
    const result = evaluateEligibility(
      makeStudent(),
      makeCourse({ academicBackgrounds: [] })
    );
    expect(result.status).toBe("unknown");
  });
});

describe("evaluateEligibility — intake signal", () => {
  it("is unknown (never ineligible) on intake mismatch", () => {
    const result = evaluateEligibility(
      makeStudent({ preferredIntake: "January 2028" }),
      makeCourse({ intakes: ["September 2027"] })
    );
    expect(result.status).toBe("unknown");
    expect(result.warnings.some((w) => w.category === "intake")).toBe(true);
  });

  it("matches September 2027 against Fall", () => {
    const result = evaluateEligibility(
      makeStudent({ preferredIntake: "September 2027" }),
      makeCourse({ intakes: ["Fall"] })
    );
    expect(result.status).toBe("eligible");
  });

  it("is unknown when the course has no intake data", () => {
    const result = evaluateEligibility(
      makeStudent({ preferredIntake: "September 2027" }),
      makeCourse({ intakes: [] })
    );
    expect(result.status).toBe("unknown");
  });
});
