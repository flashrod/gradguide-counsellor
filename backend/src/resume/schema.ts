import { z } from "zod";

/**
 * ResumeExtraction — validated intermediate structure (Milestone 13).
 *
 * Deterministic extraction output only: every value must be traceable to
 * resume text via `snippet`. Nothing here is trusted — the counsellor
 * reviews and confirms before any of it reaches a student profile.
 * Confidence is a review state, never a fabricated percentage.
 */

export const reviewStateSchema = z.enum(["extracted", "needs_review", "confirmed"]);

const gpaMentionSchema = z.object({
  value: z.number().finite(),
  /** Null = scale not stated (never assumed). */
  scale: z.number().int().positive().nullable(),
  /** "overall" vs "semester": semester figures must not become the profile GPA. */
  kind: z.enum(["overall", "semester"]),
  snippet: z.string().min(1),
});

const educationEntrySchema = z.object({
  institution: z.string().nullable(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  startYear: z.number().int().min(1950).max(2100).nullable(),
  endYear: z.number().int().min(1950).max(2100).nullable(),
  gpa: gpaMentionSchema.nullable(),
  /** Non-primary mentions (e.g. semester figures) — preserved, never conflated. */
  otherGpas: z.array(gpaMentionSchema),
  coursework: z.array(z.string()),
  snippet: z.string(),
});

const experienceEntrySchema = z.object({
  company: z.string().nullable(),
  role: z.string().nullable(),
  startLabel: z.string().nullable(),
  endLabel: z.string().nullable(),
  description: z.string(),
  technologies: z.array(z.string()),
  snippet: z.string(),
});

const projectEntrySchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  snippet: z.string(),
});

const skillsSchema = z.object({
  languages: z.array(z.string()),
  frameworks: z.array(z.string()),
  databases: z.array(z.string()),
  cloudTools: z.array(z.string()),
  aiMl: z.array(z.string()),
  other: z.array(z.string()),
});

const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string().nullable(),
  dateLabel: z.string().nullable(),
});

export const resumeExtractionSchema = z.object({
  personal: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
  }),
  education: z.array(educationEntrySchema),
  experience: z.array(experienceEntrySchema),
  projects: z.array(projectEntrySchema),
  skills: skillsSchema,
  certifications: z.array(certificationSchema),
  achievements: z.array(z.string()),
  interests: z.array(z.string()),
  /** Explicit work-experience duration ("3 years experience" → 36), if stated. */
  workExperienceMonths: z.number().int().nonnegative().nullable(),
  workExperienceEvidence: z.string().nullable(),
  englishIeltsOverall: z.number().min(0).max(9).nullable(),
  englishToeflOverall: z.number().int().min(0).max(120).nullable(),
  englishEvidence: z.string().nullable(),
});

export type ResumeExtraction = z.infer<typeof resumeExtractionSchema>;
export type GpaMention = z.infer<typeof gpaMentionSchema>;
export type EducationEntry = z.infer<typeof educationEntrySchema>;
