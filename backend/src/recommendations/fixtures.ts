import type { Course, StudentProfile } from "./types.js";

/** Baseline student: eligible for the baseline course on every check. */
export function makeStudent(
  overrides: Partial<StudentProfile> = {}
): StudentProfile {
  return {
    id: "student-1",
    name: "Test Student",
    degree: "B.Tech Computer Science",
    field: "Computer Science",
    gpa: 8.4,
    ielts: {
      overall: 7.5,
      writing: 7.0,
      reading: 7.5,
      listening: 8.0,
      speaking: 7.0,
    },
    budgetAmount: 3500000,
    budgetCurrency: "INR",
    careerGoal: "AI / Machine Learning",
    preferredCountries: ["UK", "Canada"],
    preferredIntake: "September 2027",
    workExperienceMonths: null,
    ...overrides,
  };
}

/** Baseline course: the baseline student is eligible with no warnings. */
export function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: "course-1",
    universityId: "uni-1",
    universityName: "Test University",
    universityCountry: "UK",
    name: "MSc Test Programme",
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
    careerTags: ["AI", "Machine Learning"],
    academicBackgrounds: ["Computer Science"],
    intakes: ["September 2027"],
    ...overrides,
  };
}
