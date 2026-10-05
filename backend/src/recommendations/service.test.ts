import "dotenv/config";

import { afterAll, describe, expect, it } from "vitest";

import type { Student as DbStudent, Course as DbCourse, University as DbUniversity } from "../db/schema.js";
import {
  getRecommendationsForStudent,
  StudentNotFoundError,
  toDomainCourse,
  toDomainStudent,
} from "./service.js";
import { closePool } from "../db/index.js";

const dbStudentRow: DbStudent = {
  id: "student-1",
  name: "Test Student",
  degree: "B.Tech Computer Science",
  field: "Computer Science",
  gpa: 8.4,
  ieltsOverall: 7.5,
  ieltsWriting: 7.0,
  ieltsReading: 7.5,
  ieltsListening: 8.0,
  ieltsSpeaking: 7.0,
  budgetAmount: 3500000,
  budgetCurrency: "INR",
  careerGoal: "AI / Machine Learning",
  preferredCountries: ["UK", "Canada"],
  preferredIntake: "September 2027",
  workExperienceMonths: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const dbCourseRow: DbCourse = {
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
  minGpa: 8.0,
  minIeltsOverall: 7.0,
  minIeltsWriting: 6.5,
  minIeltsReading: 6.5,
  minIeltsListening: 6.5,
  minIeltsSpeaking: 6.5,
  workExperienceRequired: false,
  workExperienceMonthsRequired: null,
  careerTags: ["AI"],
  academicBackgrounds: ["Computer Science"],
  intakes: ["September 2027"],
  eligibilityNotes: "",
  sourceUrl: "https://example.com",
  sourceName: "test",
  lastVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const dbUniversityRow: DbUniversity = {
  id: "uni-1",
  name: "Test University",
  country: "UK",
  city: "Testville",
  websiteUrl: "https://example.com",
  logoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("DB boundary mapping (no database required)", () => {
  it("maps a student row to the domain shape", () => {
    expect(toDomainStudent(dbStudentRow)).toMatchObject({
      id: "student-1",
      gpa: 8.4,
      ielts: { overall: 7.5, writing: 7.0 },
      budgetAmount: 3500000,
      budgetCurrency: "INR",
      preferredCountries: ["UK", "Canada"],
    });
  });

  it("maps course + university rows to the domain shape", () => {
    expect(toDomainCourse(dbCourseRow, dbUniversityRow)).toMatchObject({
      id: "course-1",
      universityName: "Test University",
      universityCountry: "UK",
      tuitionPeriod: "annual",
      minGpa: 8.0,
    });
  });
});

describe.skipIf(!process.env["DATABASE_URL"])(
  "getRecommendationsForStudent (live database)",
  () => {
    afterAll(async () => {
      await closePool();
    });

    it("ranks all eligible and unknown seeded courses for the demo student", async () => {
      const { student, recommendations } = await getRecommendationsForStudent(
        "66666666-6666-4366-8366-666666666666"
      );
      expect(student.name).toContain("Aarav Sharma");
      // 2 eligible + 1 unknown (work experience missing) = 3 visible.
      expect(recommendations).toHaveLength(3);
      for (const rec of recommendations) {
        expect(rec.overallScore).toBeGreaterThanOrEqual(0);
        expect(rec.overallScore).toBeLessThanOrEqual(100);
        expect(rec.reasons.length).toBeGreaterThan(0);
      }
      const unknown = recommendations.find(
        (r) => r.eligibilityStatus === "unknown"
      );
      expect(unknown?.warnings.length).toBeGreaterThan(0);
      // Sorted descending.
      const scores = recommendations.map((r) => r.overallScore);
      expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    });

    it("is deterministic across calls", async () => {
      const first = await getRecommendationsForStudent(
        "66666666-6666-4366-8366-666666666666"
      );
      const second = await getRecommendationsForStudent(
        "66666666-6666-4366-8366-666666666666"
      );
      expect(second).toEqual(first);
    });

    it("throws StudentNotFoundError for an unknown student", async () => {
      await expect(
        getRecommendationsForStudent("00000000-0000-4000-8000-000000000000")
      ).rejects.toBeInstanceOf(StudentNotFoundError);
    });
  }
);
