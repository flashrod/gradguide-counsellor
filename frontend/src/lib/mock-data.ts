import type {
  CourseRecommendation,
  NextQuestion,
  StudentProfile,
} from "./types";

/**
 * Static mock data for Milestone 1 UI shell.
 * Will be replaced by PostgreSQL + Drizzle in Milestone 2.
 * Keep mock data separate from UI components.
 */

export const mockStudent: StudentProfile = {
  id: "stu-aarav-sharma",
  name: "Aarav Sharma",
  degree: "B.Tech Computer Science",
  gpa: "8.4",
  ielts: "7.5",
  budget: "₹35L",
  careerGoal: "AI / Machine Learning",
  preferredCountries: ["UK", "Canada"],
  intake: "September 2027",
  status: "Active",
};

export const mockRecommendations: CourseRecommendation[] = [
  {
    id: "rec-msc-ai-manchester",
    courseName: "MSc Artificial Intelligence",
    university: "University of Manchester",
    country: "UK",
    tuition: "£28,500 / yr",
    intake: "Sep 2027",
    duration: "1 year",
    matchScore: 94,
    explanation:
      "Strong CS foundation and 8.4 GPA clear the entry bar; AI modules align directly with the stated ML career goal.",
  },
  {
    id: "rec-msc-ml-ucl",
    courseName: "MSc Machine Learning",
    university: "University College London",
    country: "UK",
    tuition: "£32,100 / yr",
    intake: "Sep 2027",
    duration: "1 year",
    matchScore: 91,
    explanation:
      "IELTS 7.5 meets the language requirement; curriculum depth in ML matches the career goal within budget tolerance.",
  },
  {
    id: "rec-macs-ai-dalhousie",
    courseName: "MACS — Applied Computer Science (AI stream)",
    university: "Dalhousie University",
    country: "Canada",
    tuition: "CA$24,300 / yr",
    intake: "Sep 2027",
    duration: "16 months",
    matchScore: 88,
    explanation:
      "Canada preference plus lower tuition keeps total cost inside the ₹35L budget; co-op option supports employability.",
  },
];

export const mockNextQuestion: NextQuestion = {
  id: "nq-work-experience",
  question: "Ask about work experience",
  reason:
    "Work history affects eligibility for 2 of the 3 shortlisted courses and strengthens the SOP narrative.",
  category: "Background",
};
