/**
 * Shared domain types for the GradGuide Copilot shell.
 * Milestone 1 uses static mock data only — no persistence.
 */

export interface StudentProfile {
  id: string;
  name: string;
  degree: string;
  gpa: string;
  ielts: string;
  budget: string;
  careerGoal: string;
  preferredCountries: string[];
  intake: string;
  status: "Active" | "Prospective" | "On Hold";
}

export interface CourseRecommendation {
  id: string;
  courseName: string;
  university: string;
  country: string;
  tuition: string;
  intake: string;
  duration: string;
  matchScore: number;
  explanation: string;
}

export interface NextQuestion {
  id: string;
  question: string;
  reason: string;
  category: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}
