import { describe, expect, it } from "vitest";

import type { CourseCandidate } from "./types.js";
import { courseIdentityKey, isDuplicateCourse } from "./utils/dedupe.js";
import { validateCourseCandidate } from "./validation/courseSchema.js";

function makeCandidate(overrides: Partial<CourseCandidate> = {}): CourseCandidate {
  return {
    universityName: "Rochester Institute of Technology",
    universityCountry: "USA",
    universityCity: "Rochester",
    universityWebsite: "https://www.rit.edu",
    courseName: "Computer Science MS",
    degreeType: "MS",
    field: "Computer Science",
    durationMonths: 24,
    tuitionAmount: 50000,
    tuitionCurrency: "USD",
    tuitionPeriod: "annual",
    livingCostAmount: null,
    livingCostCurrency: null,
    livingCostPeriod: null,
    minimumGpa: 3.0,
    minimumIelts: 6.5,
    minimumToefl: 88,
    workExperienceRequired: false,
    workExperienceMonthsRequired: null,
    academicBackgrounds: ["Computer Science"],
    intakes: ["Fall", "Spring"],
    careerTags: [],
    sourceUrl: "https://www.rit.edu/study/computer-science-ms",
    sourceName: "RIT Graduate Study — Computer Science MS",
    lastVerifiedAt: new Date(),
    evidence: [],
    ...overrides,
  };
}

describe("validateCourseCandidate", () => {
  it("classifies a complete candidate as VALID", () => {
    expect(validateCourseCandidate(makeCandidate()).tier).toBe("VALID");
  });

  it("classifies missing tuition as PARTIAL, not INVALID", () => {
    const result = validateCourseCandidate(
      makeCandidate({ tuitionAmount: null, tuitionCurrency: null, tuitionPeriod: null })
    );
    expect(result.tier).toBe("PARTIAL");
    expect(result.missing).toContain("tuition");
  });

  it("accepts null GPA as PARTIAL when the source publishes none", () => {
    const result = validateCourseCandidate(makeCandidate({ minimumGpa: null }));
    expect(result.tier).toBe("PARTIAL");
    expect(result.missing).toContain("GPA");
  });

  it("rejects out-of-range GPA as INVALID", () => {
    const result = validateCourseCandidate(makeCandidate({ minimumGpa: 8.4 }));
    expect(result.tier).toBe("INVALID");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects out-of-range IELTS as INVALID", () => {
    expect(
      validateCourseCandidate(makeCandidate({ minimumIelts: 12 })).tier
    ).toBe("INVALID");
  });

  it("rejects missing provenance as INVALID", () => {
    expect(
      validateCourseCandidate(makeCandidate({ sourceUrl: "" })).tier
    ).toBe("INVALID");
  });

  it("rejects missing identity as INVALID", () => {
    expect(validateCourseCandidate(makeCandidate({ courseName: "" })).tier).toBe(
      "INVALID"
    );
  });
});

describe("dedupe", () => {
  it("treats punctuated variants as the same course", () => {
    expect(
      isDuplicateCourse(
        { universityName: "Rochester Institute of Technology", courseName: "M.S. Computer Science" },
        { universityName: "rochester institute of technology", courseName: "MS Computer Science" }
      )
    ).toBe(true);
  });

  it("keeps similarly named programmes distinct", () => {
    expect(
      isDuplicateCourse(
        { universityName: "Rochester Institute of Technology", courseName: "MS Computer Science" },
        { universityName: "Rochester Institute of Technology", courseName: "MS Computer Engineering" }
      )
    ).toBe(false);
  });

  it("produces stable identity keys", () => {
    expect(courseIdentityKey("RIT", "MS CS")).toBe(courseIdentityKey("rit", "MS CS"));
  });
});
