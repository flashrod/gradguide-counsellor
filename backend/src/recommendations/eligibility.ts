import { compareGpa, formatGpa } from "./gpa.js";
import { compareIntakes } from "./intake.js";
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
 * - A failed requirement  → "ineligible".
 * - A requirement that cannot be evaluated because data is missing → "unknown".
 * - UNKNOWN IS NOT INELIGIBLE.
 * - GPA is compared on normalized (value/scale) values; a missing or
 *   malformed scale makes the check UNKNOWN.
 * - IELTS and TOEFL are ALTERNATIVE English requirements: satisfying one
 *   accepted requirement satisfies English. Cross-test conversion is never
 *   performed.
 * - Intake mismatch is a strong negative signal (warning), never
 *   ineligibility. Open/rolling intakes match everything.
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

function formatScore(value: number | null): string {
  return value == null ? "unknown" : String(value);
}

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

  // -- GPA (scale-aware) ---------------------------------------------------
  if (course.minGpa == null) {
    reasons.push({
      type: "positive",
      category: "gpa",
      message: "The course specifies no minimum GPA.",
    });
  } else {
    const verdict = compareGpa(student.gpa, course.minGpa);
    if (verdict === "pass") {
      reasons.push({
        type: "positive",
        category: "gpa",
        message: `Student GPA ${formatGpa(student.gpa)} meets the required minimum of ${formatGpa(course.minGpa)}.`,
      });
    } else if (verdict === "fail") {
      markIneligible({
        type: "warning",
        category: "gpa",
        message: `Student GPA ${formatGpa(student.gpa)} is below the required minimum of ${formatGpa(course.minGpa)}.`,
      });
    } else {
      markUnknown({
        type: "warning",
        category: "gpa",
        message:
          "GPA scale information is incomplete, so the GPA requirement cannot be evaluated.",
      });
    }
  }

  // -- English: IELTS and TOEFL are alternatives -----------------------------
  const ieltsRequired = course.minIeltsOverall != null;
  const toeflRequired = course.minToeflOverall != null;
  const ieltsMet =
    ieltsRequired &&
    student.ielts.overall != null &&
    student.ielts.overall >= (course.minIeltsOverall ?? Number.POSITIVE_INFINITY);
  const toeflMet =
    toeflRequired &&
    student.toeflOverall != null &&
    student.toeflOverall >= (course.minToeflOverall ?? Number.POSITIVE_INFINITY);
  const ieltsFailed =
    ieltsRequired &&
    student.ielts.overall != null &&
    !ieltsMet;
  const toeflFailed =
    toeflRequired &&
    student.toeflOverall != null &&
    !toeflMet;

  if (!ieltsRequired && !toeflRequired) {
    reasons.push({
      type: "positive",
      category: "ielts",
      message: "The course specifies no minimum English test score.",
    });
  } else if (ieltsMet || toeflMet) {
    const met: string[] = [];
    if (ieltsMet) met.push(`IELTS ${student.ielts.overall}`);
    if (toeflMet) met.push(`TOEFL ${student.toeflOverall}`);
    reasons.push({
      type: "positive",
      category: "ielts",
      message: `English requirement satisfied (${met.join(" and ")}).`,
    });
  } else if (ieltsFailed || toeflFailed) {
    const failed: string[] = [];
    if (ieltsFailed) {
      failed.push(
        `IELTS ${student.ielts.overall} below the required ${formatScore(course.minIeltsOverall)}`
      );
    }
    if (toeflFailed) {
      failed.push(
        `TOEFL ${student.toeflOverall} below the required ${formatScore(course.minToeflOverall)}`
      );
    }
    markIneligible({
      type: "warning",
      category: "ielts",
      message: `English requirement not met: ${failed.join("; ")}.`,
    });
  } else {
    markUnknown({
      type: "warning",
      category: "ielts",
      message:
        "Student English test scores are unknown, so the requirement cannot be evaluated.",
    });
  }

  // -- IELTS sections (unchanged, IELTS-specific) -------------------------------
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

  // -- Work experience ----------------------------------------------------------
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

  // -- Intake (compatibility, never ineligibility) ----------------------------------
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
  } else {
    const outcomes = course.intakes.map((entry) =>
      compareIntakes(student.preferredIntake ?? "", entry)
    );
    if (outcomes.includes("match")) {
      reasons.push({
        type: "positive",
        category: "intake",
        message: `The preferred intake "${student.preferredIntake}" is compatible with the course intakes.`,
      });
    } else if (outcomes.every((o) => o === "mismatch")) {
      markUnknown({
        type: "warning",
        category: "intake",
        message: `The preferred intake "${student.preferredIntake}" is not offered (available: ${course.intakes.join(", ")}). Treated as a strong negative signal, not ineligibility.`,
      });
    } else {
      markUnknown({
        type: "warning",
        category: "intake",
        message: `Intake compatibility with "${student.preferredIntake}" cannot be determined from the course data.`,
      });
    }
  }

  // -- Academic background (naive, transparent) -------------------------------------
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
