import { z } from "zod";

import type { CourseCandidate, ValidationResult } from "../types.js";

/**
 * CourseCandidate validation (Milestone 4).
 *
 * Ranges: GPA 0–4, IELTS 0–9, TOEFL 0–120, money ≥ 0, duration > 0,
 * work-experience months ≥ 0. Identity + provenance are always required.
 *
 * Tiers:
 * - INVALID: missing identity/provenance or any range violation.
 *   Never inserted.
 * - PARTIAL: valid identity/provenance, but at least one core optional
 *   field missing. Insertable — missing stays missing.
 * - VALID: everything core present.
 */

const costPeriodSchema = z.enum(["annual", "total", "semester", "monthly"]);

export const courseCandidateSchema = z.object({
  universityName: z.string().min(1),
  universityCountry: z.string().min(1),
  universityCity: z.string().nullable(),
  universityWebsite: z.string().url().nullable(),
  courseName: z.string().min(1),
  degreeType: z.string().nullable(),
  field: z.string().nullable(),
  durationMonths: z.number().int().positive().nullable(),
  tuitionAmount: z.number().nonnegative().nullable(),
  tuitionCurrency: z.string().nullable(),
  tuitionPeriod: costPeriodSchema.nullable(),
  livingCostAmount: z.number().nonnegative().nullable(),
  livingCostCurrency: z.string().nullable(),
  livingCostPeriod: costPeriodSchema.nullable(),
  minimumGpa: z.number().min(0).max(4).nullable(),
  minimumIelts: z.number().min(0).max(9).nullable(),
  minimumToefl: z.number().int().min(0).max(120).nullable(),
  workExperienceRequired: z.boolean(),
  workExperienceMonthsRequired: z.number().int().nonnegative().nullable(),
  academicBackgrounds: z.array(z.string()),
  intakes: z.array(z.string()),
  careerTags: z.array(z.string()),
  sourceUrl: z.string().url(),
  sourceName: z.string().min(1),
  lastVerifiedAt: z.date(),
  evidence: z.array(z.string()),
});

/** Core optional fields: all present → VALID, any missing → PARTIAL. */
const CORE_FIELDS: { key: string; label: string }[] = [
  { key: "degreeType", label: "degree type" },
  { key: "field", label: "field" },
  { key: "durationMonths", label: "duration" },
  { key: "tuitionAmount", label: "tuition" },
  { key: "minimumGpa", label: "GPA" },
];

export function validateCourseCandidate(
  candidate: CourseCandidate
): ValidationResult {
  const parsed = courseCandidateSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      tier: "INVALID",
      missing: [],
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      ),
    };
  }
  const missing = CORE_FIELDS.filter(({ key }) => {
    const value = candidate[key as keyof CourseCandidate];
    return value == null || value === "";
  }).map(({ label }) => label);
  const englishMissing =
    candidate.minimumIelts == null && candidate.minimumToefl == null;
  if (englishMissing) missing.push("IELTS/TOEFL");
  if (candidate.intakes.length === 0) missing.push("intake");

  if (missing.length === 0) return { tier: "VALID", missing, errors: [] };
  return { tier: "PARTIAL", missing, errors: [] };
}
