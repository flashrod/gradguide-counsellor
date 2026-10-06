import { makeCourse, makeStudent } from "./fixtures.js";
import type { Course, StudentProfile } from "./types.js";

/**
 * Deterministic counselling-scenario fixtures (Milestone 12).
 * Synthetic catalogue + students spanning US/UK, currencies, and
 * completeness levels. No database, no network.
 */

export function studentA_ukCanadaAI(): StudentProfile {
  return makeStudent({
    id: "student-a",
    gpa: { value: 8.4, scale: 10 },
    careerGoal: "AI / Machine Learning",
    budgetAmount: 3500000,
    budgetCurrency: "INR",
    preferredCountries: ["UK", "Canada"],
  });
}

export function studentB_usToefl(): StudentProfile {
  return makeStudent({
    id: "student-b",
    gpa: { value: 3.7, scale: 4 },
    ielts: {
      overall: null,
      writing: null,
      reading: null,
      listening: null,
      speaking: null,
    },
    toeflOverall: 102,
    budgetAmount: 120000,
    budgetCurrency: "USD",
    careerGoal: "Software Engineering",
    preferredCountries: ["USA"],
    preferredIntake: "Fall 2027",
  });
}

export function studentC_europeDS(): StudentProfile {
  return makeStudent({
    id: "student-c",
    degree: "B.Sc Software Engineering",
    field: "Software Engineering",
    gpa: { value: 7.2, scale: 10 },
    ielts: {
      overall: 6.5,
      writing: 6.0,
      reading: 6.5,
      listening: 6.5,
      speaking: 6.0,
    },
    toeflOverall: null,
    budgetAmount: 30000,
    budgetCurrency: "EUR",
    careerGoal: "Data Science",
    preferredCountries: ["Germany", "Ireland"],
    preferredIntake: "September 2027",
    workExperienceMonths: null,
  });
}

export function studentD_incomplete(): StudentProfile {
  return makeStudent({
    id: "student-d",
    gpa: { value: null, scale: null },
    ielts: {
      overall: null,
      writing: null,
      reading: null,
      listening: null,
      speaking: null,
    },
    toeflOverall: null,
    budgetAmount: null,
    budgetCurrency: null,
    careerGoal: null,
    preferredCountries: [],
    preferredIntake: null,
    workExperienceMonths: null,
  });
}

function catalogueCourse(
  id: string,
  country: string,
  overrides: Partial<Course> = {}
): Course {
  return makeCourse({
    id,
    universityId: `uni-${id}`,
    universityName: `${country} Test University`,
    universityCountry: country,
    minIeltsWriting: null,
    minIeltsReading: null,
    minIeltsListening: null,
    minIeltsSpeaking: null,
    ...overrides,
  });
}

/** Small mixed US/UK catalogue exercising currencies, intakes, and minima. */
export function mixedCatalogue(): Course[] {
  return [
    catalogueCourse("us-ai", "USA", {
      name: "Computer Science MS",
      field: "Artificial Intelligence",
      minGpa: { value: 3.0, scale: 4 },
      minIeltsOverall: 6.5,
      minToeflOverall: 88,
      tuitionAmount: 28500,
      tuitionCurrency: "USD",
      tuitionPeriod: "annual",
      durationMonths: 24,
      careerTags: ["AI", "Machine Learning"],
      intakes: ["Fall", "Spring"],
    }),
    catalogueCourse("uk-ai", "UK", {
      name: "Artificial Intelligence MSc",
      field: "Artificial Intelligence",
      minGpa: { value: null, scale: null },
      minIeltsOverall: 6.5,
      minToeflOverall: null,
      tuitionAmount: 30000,
      tuitionCurrency: "GBP",
      tuitionPeriod: "annual",
      durationMonths: 12,
      careerTags: ["AI", "Machine Learning"],
      intakes: ["September"],
    }),
    catalogueCourse("us-se", "USA", {
      name: "Software Engineering MS",
      field: "Software Engineering",
      minGpa: { value: 3.2, scale: 4 },
      minIeltsOverall: null,
      minToeflOverall: 90,
      tuitionAmount: 20000,
      tuitionCurrency: "USD",
      tuitionPeriod: "annual",
      durationMonths: 24,
      careerTags: ["Software Engineering"],
      intakes: ["Fall"],
    }),
    catalogueCourse("uk-ds", "UK", {
      name: "Data Science MSc",
      field: "Data Science",
      minGpa: { value: null, scale: null },
      academicBackgrounds: ["Computer Science", "Software Engineering"],
      minIeltsOverall: 6.0,
      minToeflOverall: null,
      tuitionAmount: 22000,
      tuitionCurrency: "GBP",
      tuitionPeriod: "annual",
      durationMonths: 12,
      careerTags: ["Data Science"],
      intakes: ["September", "January"],
    }),
  ];
}
