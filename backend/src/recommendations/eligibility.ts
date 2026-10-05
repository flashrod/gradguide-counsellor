import type {
  Course,
  EligibilityResult,
  EligibilityStatus,
  Evidence,
  StudentProfile,
} from "./types.js";
import { backgroundMatches } from "./normalize.js";

/**
 * Hard eligibility evaluation (pure function — no I/O, no randomness).
 *
 * Rules:
 * - A failed requirement  → "ineligible".
 * - A requirement that cannot be evaluated because data is missing → "unknown".
 * - UNKNOWN IS NOT INELIGIBLE. Missing information preserves the course so a
 *   future "Next Best Question" feature can ask for it.
 * - Intake mismatch is a strong negative signal (warning), never ineligibility,
 *   because the profile has no "intake is mandatory" flag yet.
 * - Academic background matching is intentionally naive (see `backgroundMatches`).
 */

const IELTS_SECTIONS = [
  { key: "writing", label: "writing", getMin: (c: Course) => c.minIeltsWriting },
  { key: "reading", label: "reading", getMin: (c: Course) => c.minIeltsReading },
  {
    key: "listening",
    label: "listening",
    getMin: (c: Course) => c.minIeltsListening,
  },
  { key: "speaking", label: "speaking", getMin: (c: Course) => c.minIeltsSpeaking },
] as const;

type SectionKey = (typeof IELTS_SECTIONS)[number]["key"];

export function evaluateEligibility(
  student: StudentProfile,
  course: Course
): EligibilityResult {
  const reasons: Evidence[] = [];
  const warnings: Evidence[] = [];
  let status: EligibilityStatus = "eligible";

  const markIneligible = (reason: Evidence): void => {
    status = "ineligible";
    reasons.push(reason);
  };
  const markUnknown = (warning: Evidence): void => {
    if (status === "eligible") status = "unknown";
    warnings.push(warning);
  };

  // -- GPA ---------------------------------------------------------------
  if (course.minGpa == null) {
    reasons.push({
      type: "positive",
      category: "gpa",
      message: "The course specifies no minimum GPA.",
    });
  } else if (student.gpa == null) {
    markUnknown({
      type: "warning",
      category: "gpa",
      message:
        "Student GPA is unknown, so the GPA requirement cannot be evaluated.",
    });
  } else if (student.gpa < course.minGpa) {
    markIneligible({
      type: "warning",
      category: "gpa",
      message: `Student GPA ${student.gpa} is below the required minimum of ${course.minGpa}.`,
    });
  } else {
    reasons.push({
      type: "positive",
      category: "gpa",
      message: `Student GPA ${student.gpa} meets the required minimum of ${course.minGpa}.`,
    });
  }

  // -- IELTS overall ------------------------------------------------------
  if (course.minIeltsOverall == null) {
    reasons.push({
      type: "positive",
      category: "ielts",
      message: "The course specifies no minimum IELTS overall score.",
    });
  } else if (student.ielts.overall == null) {
    markUnknown({
      type: "warning",
      category: "ielts",
      message:
        "Student IELTS overall score is unknown, so the requirement cannot be evaluated.",
    });
  } else if (student.ielts.overall < course.minIeltsOverall) {
    markIneligible({
      type: "warning",
      category: "ielts",
      message: `Student IELTS ${student.ielts.overall} is below the required minimum of ${course.minIeltsOverall}.`,
    });
  } else {
    reasons.push({
      type: "positive",
      category: "ielts",
      message: `Student IELTS ${student.ielts.overall} meets the required minimum of ${course.minIeltsOverall}.`,
    });
  }

  // -- IELTS sections ------------------------------------------------------
  for (const section of IELTS_SECTIONS) {
    const required = section.getMin(course);
    if (required == null) continue;
    const actual = student.ielts[section.key as SectionKey];
    if (actual == null) {
      markUnknown({
        type: "warning",
        category: "ielts",
        message: `Student IELTS ${section.label} score is unknown, so the section minimum of ${required} cannot be evaluated.`,
      });
    } else if (actual < required) {
      markIneligible({
        type: "warning",
        category: "ielts",
        message: `Student IELTS ${section.label} ${actual} is below the required minimum of ${required}.`,
      });
    } else {
      reasons.push({
        type: "positive",
        category: "ielts",
        message: `Student IELTS ${section.label} ${actual} meets the required minimum of ${required}.`,
      });
    }
  }

  // -- Work experience ------------------------------------------------------
  if (!course.workExperienceRequired) {
    reasons.push({
      type: "positive",
      category: "work-experience",
      message: "The course does not require work experience.",
    });
  } else if (
    course.workExperienceMonthsRequired == null ||
    student.workExperienceMonths == null
  ) {
    markUnknown({
      type: "warning",
      category: "work-experience",
      message:
        "Work experience is required but the required or actual months are unknown.",
    });
  } else if (
    student.workExperienceMonths < course.workExperienceMonthsRequired
  ) {
    markIneligible({
      type: "warning",
      category: "work-experience",
      message: `Student has ${student.workExperienceMonths} months of work experience but ${course.workExperienceMonthsRequired} are required.`,
    });
  } else {
    reasons.push({
      type: "positive",
      category: "work-experience",
      message: `Student work experience (${student.workExperienceMonths} months) meets the requirement of ${course.workExperienceMonthsRequired} months.`,
    });
  }

  // -- Intake (strong signal, never ineligibility) ---------------------------
  if (student.preferredIntake == null) {
    reasons.push({
      type: "positive",
      category: "intake",
      message: "The student has no intake preference to conflict with.",
    });
  } else if (course.intakes.length === 0) {
    markUnknown({
      type: "warning",
      category: "intake",
      message:
        "The course has no intake data, so availability cannot be evaluated.",
    });
  } else if (course.intakes.includes(student.preferredIntake)) {
    reasons.push({
      type: "positive",
      category: "intake",
      message: `The preferred intake "${student.preferredIntake}" is offered.`,
    });
  } else {
    markUnknown({
      type: "warning",
      category: "intake",
      message: `The preferred intake "${student.preferredIntake}" is not offered (available: ${course.intakes.join(", ")}). Treated as a strong negative signal, not ineligibility.`,
    });
  }

  // -- Academic background (naive, transparent) ------------------------------
  if (course.academicBackgrounds.length === 0) {
    markUnknown({
      type: "warning",
      category: "background",
      message:
        "The course specifies no accepted academic backgrounds, so fit cannot be evaluated.",
    });
  } else {
    const matches = course.academicBackgrounds.some(
      (background) =>
        backgroundMatches(background, student.field) ||
        backgroundMatches(background, student.degree)
    );
    if (matches) {
      reasons.push({
        type: "positive",
        category: "background",
        message:
          "The student's degree or field matches an accepted academic background.",
      });
    } else {
      markIneligible({
        type: "warning",
        category: "background",
        message:
          "The student's degree and field match none of the accepted academic backgrounds.",
      });
    }
  }

  return { status, reasons, warnings };
}
