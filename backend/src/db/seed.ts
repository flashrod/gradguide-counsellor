import "dotenv/config";

import { z } from "zod";

import { auth } from "../auth.js";
import { closePool, db } from "./index.js";
import {
  authUser,
  counsellingSessions,
  courses,
  sessionNotes,
  sessionRecommendations,
  students,
  universities,
} from "./schema.js";
import { eq } from "drizzle-orm";

/**
 * Local-development seed (Milestone 2).
 *
 * - SMALL, fixed set of records with stable UUIDs so re-seeding is idempotent.
 * - Every record is explicitly labelled demo/mock data — nothing here claims
 *   to be a real university or course.
 * - DEV ONLY: the script clears all six tables before inserting.
 */

// Every seeded course must carry provenance; enforce it structurally.
const seedCourseProvenance = z.object({
  sourceUrl: z.string().url(),
  sourceName: z.string().min(1),
  lastVerifiedAt: z.date(),
});

const DEMO_SOURCE = {
  sourceUrl: "https://example.com/gradguide-demo-dataset",
  sourceName: "GradGuide demo seed dataset (MOCK — not real data)",
  lastVerifiedAt: new Date("2026-10-01T00:00:00.000Z"),
} as const;

seedCourseProvenance.parse({
  ...DEMO_SOURCE,
  lastVerifiedAt: new Date(DEMO_SOURCE.lastVerifiedAt),
});

const UNI_MOCKBRIDGE = "11111111-1111-4111-8111-111111111111";
const UNI_LAKESIDE = "22222222-2222-4222-8222-222222222222";
const COURSE_AI = "33333333-3333-4333-8333-333333333333";
const COURSE_ML = "44444444-4444-4344-8344-444444444444";
const COURSE_DS = "55555555-5555-4355-8355-555555555555";
const STUDENT_DEMO = "66666666-6666-4366-8366-666666666666";
const SESSION_DEMO = "77777777-7777-4377-8377-777777777777";

async function seed(): Promise<void> {
  // Demo counsellor (idempotent): the seeded session must reference a real
  // user row. Credentials come from DEMO_COUNSELLOR_* env (dev only).
  const demoEmail =
    process.env["DEMO_COUNSELLOR_EMAIL"] ?? "demo@gradguide.local";
  const demoPassword =
    process.env["DEMO_COUNSELLOR_PASSWORD"] ?? "gradguide-dev-only";
  const demoName = process.env["DEMO_COUNSELLOR_NAME"] ?? "Demo Counsellor";
  try {
    await auth.api.signUpEmail({
      body: { email: demoEmail, password: demoPassword, name: demoName },
    });
  } catch {
    // Already exists — reuse the existing row.
  }
  const [demoUser] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, demoEmail))
    .limit(1);
  if (demoUser == null) throw new Error("Demo counsellor seed failed");

  await db.transaction(async (tx) => {
    // Clear child → parent (dev-only reset).
    await tx.delete(sessionNotes);
    await tx.delete(sessionRecommendations);
    await tx.delete(counsellingSessions);
    await tx.delete(students);
    await tx.delete(courses);
    await tx.delete(universities);

    await tx.insert(universities).values([
      {
        id: UNI_MOCKBRIDGE,
        name: "Mockbridge University (Demo Data)",
        country: "UK",
        city: "Mockbridge",
        websiteUrl: "https://example.com/mockbridge-university",
        logoUrl: null,
      },
      {
        id: UNI_LAKESIDE,
        name: "Lakeside Institute of Technology (Demo Data)",
        country: "Canada",
        city: "Lakeside",
        websiteUrl: "https://example.com/lakeside-institute",
        logoUrl: null,
      },
    ]);

    await tx.insert(courses).values([
      {
        id: COURSE_AI,
        universityId: UNI_MOCKBRIDGE,
        name: "MSc Demo Artificial Intelligence (Mock Course)",
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
        minIeltsReading: 6.5,
        minIeltsListening: 6.5,
        minIeltsSpeaking: 6.5,
        workExperienceRequired: false,
        workExperienceMonthsRequired: null,
        careerTags: ["AI", "Machine Learning"],
        academicBackgrounds: ["Computer Science"],
        eligibilityNotes: "Demo record — verify against a real source before use.",
        ...DEMO_SOURCE,
      },
      {
        id: COURSE_ML,
        universityId: UNI_MOCKBRIDGE,
        name: "MSc Demo Machine Learning (Mock Course)",
        degreeType: "MSc",
        field: "Machine Learning",
        durationMonths: 12,
        tuitionAmount: 32100,
        tuitionCurrency: "GBP",
        tuitionPeriod: "annual",
        livingCostAmount: 1350,
        livingCostCurrency: "GBP",
        livingCostPeriod: "monthly",
        intakes: ["September 2027", "January 2028"],
        minGpa: 8.0,
        minGpaScale: 10,
        minIeltsOverall: 7.5,
        minIeltsWriting: 7.0,
        minIeltsReading: 6.5,
        minIeltsListening: 6.5,
        minIeltsSpeaking: 6.5,
        workExperienceRequired: false,
        workExperienceMonthsRequired: null,
        careerTags: ["Machine Learning", "Data Science"],
        academicBackgrounds: ["Computer Science", "Statistics"],
        eligibilityNotes: "Demo record — verify against a real source before use.",
        ...DEMO_SOURCE,
      },
      {
        id: COURSE_DS,
        universityId: UNI_LAKESIDE,
        name: "MACS Demo Applied Computing, AI Stream (Mock Course)",
        degreeType: "MACS",
        field: "Applied Computer Science",
        durationMonths: 16,
        tuitionAmount: 24300,
        tuitionCurrency: "CAD",
        tuitionPeriod: "total",
        livingCostAmount: null,
        livingCostCurrency: null,
        livingCostPeriod: null,
        intakes: ["September 2027"],
        minGpa: 7.5,
        minGpaScale: 10,
        minIeltsOverall: 7.0,
        minIeltsWriting: 6.5,
        minIeltsReading: 6.5,
        minIeltsListening: 6.5,
        minIeltsSpeaking: 6.5,
        workExperienceRequired: true,
        workExperienceMonthsRequired: 12,
        careerTags: ["AI", "Software Engineering"],
        academicBackgrounds: ["Computer Science", "Engineering"],
        eligibilityNotes:
          "Demo record — work-experience flag set to exercise the Next Best Question UI.",
        ...DEMO_SOURCE,
      },
    ]);

    await tx.insert(students).values([
      {
        id: STUDENT_DEMO,
        name: "Aarav Sharma (Demo Data)",
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
      },
    ]);

    await tx.insert(counsellingSessions).values([
      {
        id: SESSION_DEMO,
        studentId: STUDENT_DEMO,
        counsellorId: demoUser.id,
        startedAt: new Date("2026-10-05T09:00:00.000Z"),
        endedAt: null,
      },
    ]);

    await tx.insert(sessionRecommendations).values([
      {
        sessionId: SESSION_DEMO,
        courseId: COURSE_AI,
        score: 94,
        action: "shortlisted",
      },
      {
        sessionId: SESSION_DEMO,
        courseId: COURSE_DS,
        score: 88,
        action: "discussed",
      },
    ]);

    await tx.insert(sessionNotes).values([
      {
        sessionId: SESSION_DEMO,
        content:
          "Demo note: asked about work experience — affects the Lakeside AI-stream option.",
      },
    ]);
  });

  // eslint-disable-next-line no-console
  console.log(
    "Seed complete: 2 universities, 3 courses, 1 student, 1 session, 2 recommendations, 1 note (all DEMO data)."
  );
}

seed()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
