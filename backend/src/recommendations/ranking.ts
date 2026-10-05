import { evaluateEligibility } from "./eligibility.js";
import { calculateScore } from "./scoring.js";
import type {
  Course,
  RecommendationResult,
  StudentProfile,
} from "./types.js";

/**
 * Rank courses for a student (pure function — no I/O, no randomness).
 *
 * 1. Evaluate eligibility for every course.
 * 2. Drop definitively ineligible courses (unknown stays visible).
 * 3. Score the survivors.
 * 4. Sort by: overall desc → eligibility desc → budget desc → course id asc.
 *    The final tie-breaker (course id ascending) guarantees a total,
 *    deterministic order — the same inputs always produce the same ranking.
 */
export function rankRecommendations(
  student: StudentProfile,
  courses: Course[]
): RecommendationResult[] {
  const results: RecommendationResult[] = [];

  for (const course of courses) {
    const eligibility = evaluateEligibility(student, course);
    if (eligibility.status === "ineligible") continue;

    const score = calculateScore(student, course, eligibility);
    results.push({
      courseId: course.id,
      universityId: course.universityId,
      courseName: course.name,
      universityName: course.universityName,
      eligibilityStatus: eligibility.status,
      overallScore: score.overall,
      scoreBreakdown: score.breakdown,
      reasons: score.reasons,
      warnings: score.warnings,
      estimatedTotalCost: score.estimatedTotalCost,
    });
  }

  results.sort((a, b) => {
    if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
    if (b.scoreBreakdown.eligibility !== a.scoreBreakdown.eligibility) {
      return b.scoreBreakdown.eligibility - a.scoreBreakdown.eligibility;
    }
    if (b.scoreBreakdown.budget !== a.scoreBreakdown.budget) {
      return b.scoreBreakdown.budget - a.scoreBreakdown.budget;
    }
    return a.courseId < b.courseId ? -1 : a.courseId > b.courseId ? 1 : 0;
  });

  return results;
}
