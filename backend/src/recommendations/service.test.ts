import "dotenv/config";

import { afterAll, describe, expect, it } from "vitest";

import type { Student as DbStudent, Course as DbCourse, University as DbUniversity } from "../db/schema.js";
import {
  getNextBestQuestion,
  getRecommendationsForStudent,
  getStudentById,
  simulateRecommendationsForStudent,
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
  gpaScale: 10,
  ieltsOverall: 7.5,
  ieltsWriting: 7.0,
  ieltsReading: 7.5,
  ieltsListening: 8.0,
  ieltsSpeaking: 7.0,
  toeflOverall: null,
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
  minGpaScale: 10,
  minIeltsOverall: 7.0,
  minIeltsWriting: 6.5,
  minIeltsReading: 6.5,
  minIeltsListening: 6.5,
  minIeltsSpeaking: 6.5,
  minToeflOverall: null,
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
      gpa: { value: 8.4, scale: 10 },
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
      minGpa: { value: 8.0, scale: 10 },
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
      // The 3 seeded courses must always be present (2 eligible + 1 unknown
      // with missing work experience). Other rows (e.g. ingested courses)
      // may also appear — the catalogue grows over time.
      const seededIds = new Set([
        "33333333-3333-4333-8333-333333333333",
        "44444444-4444-4344-8344-444444444444",
        "55555555-5555-4355-8355-555555555555",
      ]);
      const seeded = recommendations.filter((r) => seededIds.has(r.courseId));
      expect(seeded).toHaveLength(3);
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

    it("returns a deterministic next-best question for the demo student", async () => {
      const first = await getNextBestQuestion(
        "66666666-6666-4366-8366-666666666666"
      );
      const second = await getNextBestQuestion(
        "66666666-6666-4366-8366-666666666666"
      );
      expect(second).toEqual(first);
      // Demo student lacks work experience while a ranked course requires
      // it; budget/TOEFL are known-or-satisfied and must not be asked about.
      expect(first).toMatchObject({ field: "work-experience" });
      if ("field" in first) {
        expect(first.affectedRecommendationCount).toBeGreaterThanOrEqual(1);
        expect(first.question.length).toBeGreaterThan(0);
      }
    });

    it("never mutates the stored student record during simulation", async () => {
      const studentId = "66666666-6666-4366-8366-666666666666";
      const before = await getStudentById(studentId);
      const simulation = await simulateRecommendationsForStudent(studentId, {
        gpa: { value: 9.5, scale: 10 },
        budget: { amount: 100000, currency: "USD" },
        preferredCountry: "Canada",
        preferredIntake: "Spring 2028",
      });
      expect(simulation.changes.length).toBeGreaterThan(0);
      const after = await getStudentById(studentId);
      expect(after).toEqual(before);
    });

    it("throws StudentNotFoundError when simulating an unknown student", async () => {
      await expect(
        simulateRecommendationsForStudent(
          "00000000-0000-4000-8000-000000000000",
          { budget: { amount: 100, currency: "USD" } }
        )
      ).rejects.toBeInstanceOf(StudentNotFoundError);
    });
  }
);
