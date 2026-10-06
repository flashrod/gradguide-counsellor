import { describe, expect, it } from "vitest";

import { DeterministicResumeExtractor } from "./extractor.js";
import { mapToProfileCandidate } from "./mapping.js";
import { resumeExtractionSchema } from "./schema.js";
import {
  CONFUSING_DATES_PAGES,
  CS_STUDENT_PAGES,
  ENGLISH_AND_WORK_PAGES,
  GPA_37_PAGES,
  GPA_NO_SCALE_PAGES,
  INTEREST_ONLY_PAGES,
  MULTI_INSTITUTION_PAGES,
  MULTIPLE_GPA_PAGES,
  NO_EDUCATION_PAGES,
  NO_GPA_PAGES,
  PERCENTAGE_PAGES,
} from "./fixtures.js";

const extractor = new DeterministicResumeExtractor();

describe("DeterministicResumeExtractor", () => {
  it("extracts personal block, education, skills, and projects", () => {
    const out = extractor.extract(CS_STUDENT_PAGES);
    expect(resumeExtractionSchema.safeParse(out).success).toBe(true);
    expect(out.personal.name).toBe("Dylan Mascarenhas");
    expect(out.personal.email).toBe("dylan.mascarenhas@example.com");
    expect(out.personal.phone).toBe("+91 98765 43210");
    expect(out.personal.location).toBe("Bengaluru, India");
    expect(out.education).toHaveLength(1);
    expect(out.education[0]?.degree).toMatch(/B\.?E\.?/i);
    expect(out.education[0]?.institution).toBe("Visvesvaraya Technological University");
    expect(out.education[0]?.field).toBe("Computer Engineering");
    expect(out.education[0]?.gpa).toMatchObject({ value: 8.62, scale: 10, kind: "overall" });
    expect(out.skills.languages).toEqual(expect.arrayContaining(["Python", "JavaScript", "SQL"]));
    expect(out.skills.frameworks).toEqual(expect.arrayContaining(["React", "FastAPI"]));
    expect(out.projects).toHaveLength(1);
    expect(out.projects[0]?.technologies).toEqual(expect.arrayContaining(["React", "Python"]));
    expect(out.experience).toHaveLength(1);
    expect(out.experience[0]?.company).toBe("Acme Labs");
    expect(out.certifications).toHaveLength(1);
  });

  it("reads GPA 3.7/4 with scale", () => {
    const out = extractor.extract(GPA_37_PAGES);
    expect(out.education[0]?.gpa).toMatchObject({ value: 3.7, scale: 4, kind: "overall" });
  });

  it("leaves scale unknown when the resume states no scale", () => {
    const out = extractor.extract(GPA_NO_SCALE_PAGES);
    expect(out.education[0]?.gpa).toMatchObject({ value: 8.1, scale: null });
  });

  it("keeps semester figures separate from overall GPA", () => {
    const out = extractor.extract(MULTIPLE_GPA_PAGES);
    const gpas = out.education.flatMap((e) => [e.gpa, ...e.otherGpas].filter((g) => g != null));
    expect(gpas.some((g) => g.kind === "semester")).toBe(true);
    expect(gpas.filter((g) => g.kind === "overall")).toHaveLength(2);
    // Headline GPA is overall, never the semester figure.
    expect(out.education[0]?.gpa?.kind).toBe("overall");
  });

  it("returns empty education when no education section exists", () => {
    const out = extractor.extract(NO_EDUCATION_PAGES);
    expect(out.education).toEqual([]);
    expect(out.skills.languages).toEqual(expect.arrayContaining(["JavaScript"]));
  });

  it("returns null GPA when no GPA is stated", () => {
    const out = extractor.extract(NO_GPA_PAGES);
    expect(out.education[0]?.gpa).toBeNull();
  });

  it("never turns percentages into GPA", () => {
    const out = extractor.extract(PERCENTAGE_PAGES);
    expect(out.education[0]?.gpa).toBeNull();
  });

  it("does not confuse deadline dates with durations or graduation", () => {
    const out = extractor.extract(CONFUSING_DATES_PAGES);
    expect(out.education[0]?.endYear).toBe(2023);
    expect(out.education[0]?.gpa).toMatchObject({ value: 8.62, scale: 10 });
    expect(out.workExperienceMonths).toBeNull();
  });

  it("preserves multiple institutions", () => {
    const out = extractor.extract(MULTI_INSTITUTION_PAGES);
    expect(out.education.length).toBeGreaterThanOrEqual(2);
    expect(out.education.map((e) => e.institution).join(" ")).toContain("Toronto");
  });

  it("extracts English minima and explicit work duration", () => {
    const out = extractor.extract(ENGLISH_AND_WORK_PAGES);
    expect(out.englishIeltsOverall).toBe(7.5);
    expect(out.workExperienceMonths).toBe(36);
  });

  it("never infers skills from prose without a skills section", () => {
    const out = extractor.extract(INTEREST_ONLY_PAGES);
    // "Interested in AI" must not become AI experience ...
    expect(out.skills.aiMl).toEqual([]);
    // ... while explicitly listed languages are still captured.
    expect(out.skills.languages).toEqual(["Python"]);
  });
});

describe("mapToProfileCandidate", () => {
  it("maps resume fields and lists what is never inferred", () => {
    const candidate = mapToProfileCandidate(extractor.extract(CS_STUDENT_PAGES));
    const byField = Object.fromEntries(candidate.fields.map((f) => [f.field, f]));
    expect(byField["degree"]?.value).toMatch(/B\.E\./i);
    expect(byField["field"]?.value).toBe("Computer Engineering");
    expect(byField["gpa"]?.value).toBe(8.62);
    expect(candidate.notInferred).toEqual(
      expect.arrayContaining(["budget", "preferredCountries", "preferredIntake", "careerGoal"])
    );
    for (const f of candidate.fields) {
      expect(f.source).toBe("resume");
      expect(f.status).toBe("needs_review");
    }
  });

  it("surfaces multiple overall GPAs as alternatives", () => {
    const candidate = mapToProfileCandidate(extractor.extract(MULTIPLE_GPA_PAGES));
    const gpa = candidate.fields.find((f) => f.field === "gpa");
    expect(gpa?.alternatives.length).toBeGreaterThanOrEqual(1);
    expect(gpa?.alternatives.every((a) => a.snippet.length > 0)).toBe(true);
  });

  it("maps null value with empty evidence when the resume lacks a field", () => {
    const candidate = mapToProfileCandidate(extractor.extract(NO_GPA_PAGES));
    const gpa = candidate.fields.find((f) => f.field === "gpa");
    expect(gpa?.value).toBeNull();
    expect(gpa?.evidence).toEqual([]);
  });
});
