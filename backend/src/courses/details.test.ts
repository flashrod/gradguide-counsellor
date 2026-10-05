import { describe, expect, it } from "vitest";

import { toCourseDetails } from "./details.js";
import type {
  Course as DbCourse,
  University as DbUniversity,
} from "../db/schema.js";

const university: DbUniversity = {
  id: "uni-1",
  name: "Test University",
  country: "UK",
  city: "Testville",
  websiteUrl: "https://example.com",
  logoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const course: DbCourse = {
  id: "course-1",
  universityId: "uni-1",
  name: "MSc Test Programme",
  degreeType: "MSc",
  field: "Artificial Intelligence",
  durationMonths: 12,
  tuitionAmount: 28500,
  tuitionCurrency: "GBP",
  tuitionPeriod: "annual",
  livingCostAmount: 12000,
  livingCostCurrency: "GBP",
  livingCostPeriod: "annual",
  intakes: ["September 2027"],
  minGpa: 8.0,
  minGpaScale: 10,
  minIeltsOverall: 7.0,
  minIeltsWriting: 6.5,
  minIeltsReading: null,
  minIeltsListening: null,
  minIeltsSpeaking: null,
  minToeflOverall: null,
  workExperienceRequired: false,
  workExperienceMonthsRequired: null,
  careerTags: ["AI"],
  academicBackgrounds: ["Computer Science"],
  eligibilityNotes: "",
  sourceUrl: "https://example.com/programme",
  sourceName: "Test source",
  lastVerifiedAt: new Date("2026-10-01T00:00:00.000Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("toCourseDetails", () => {
  it("maps stored rows without database IDs", () => {
    const details = toCourseDetails(course, university);
    expect(details).toMatchObject({
      courseName: "MSc Test Programme",
      universityCountry: "UK",
      degreeType: "MSc",
      durationMonths: 12,
      tuitionAmount: 28500,
      minGpa: { value: 8.0, scale: 10 },
      minToeflOverall: null,
    });
    expect(details).not.toHaveProperty("id");
    expect(details).not.toHaveProperty("courseId");
    expect(details.lastVerifiedAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("preserves unknown values as null", () => {
    const details = toCourseDetails(
      { ...course, durationMonths: null, tuitionAmount: null },
      university
    );
    expect(details.durationMonths).toBeNull();
    expect(details.tuitionAmount).toBeNull();
  });
});
