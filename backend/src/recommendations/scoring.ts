import type {
  CostPeriod,
  Course,
  EligibilityResult,
  EligibilityStatus,
  EstimatedTotalCost,
  Evidence,
  ScoreBreakdown,
  StudentProfile,
} from "./types.js";
import { clampScore, normalize, tokenize } from "./normalize.js";

/**
 * Deterministic scoring engine (pure functions — no I/O, no randomness).
 *
 * Weights: academic 25% + career 25% + budget 20% + eligibility 15% +
 *          country 10% + intake 5% = 100%.
 * Every part score is an integer in [0, 100]; the overall score is
 * Math.round of the weighted sum (then clamped — no floating-point noise
 * can leak into rankings).
 *
 * Missing information yields the neutral score 70 plus a warning — never a
 * punishment, never a silent zero. NaN can never escape: every helper
 * funnels through `clampScore`.
 */

export const SCORE_WEIGHTS = {
  academic: 0.25,
  career: 0.25,
  budget: 0.2,
  eligibility: 0.15,
  country: 0.1,
  intake: 0.05,
} as const;

/** Neutral score used whenever information is missing. */
export const NEUTRAL_SCORE = 70;

export interface FitResult {
  score: number;
  reasons: Evidence[];
  warnings: Evidence[];
}

interface CostResult {
  cost: EstimatedTotalCost | null;
  warnings: Evidence[];
}

// ---------------------------------------------------------------------------
// Total cost normalization
// ---------------------------------------------------------------------------

function periodMultiplier(
  period: CostPeriod,
  durationMonths: number
): number | null {
  const years = Math.max(1, Math.ceil(durationMonths / 12));
  const semesters = Math.max(1, Math.ceil(durationMonths / 6));
  switch (period) {
    case "annual":
      return years;
    case "total":
      return 1;
    case "semester":
      return semesters;
    case "monthly":
      return durationMonths;
    default:
      return null;
  }
}

/**
 * Normalize tuition + living costs into one estimated total programme cost.
 * Returns null (with a warning) when costs cannot be interpreted:
 * no amounts, missing periods, negative amounts, or mixed currencies
 * (currency conversion is explicitly out of scope).
 */
export function calculateEstimatedTotalCost(course: Course): CostResult {
  const warnings: Evidence[] = [];
  const months =
    Number.isFinite(course.durationMonths) && course.durationMonths > 0
      ? Math.floor(course.durationMonths)
      : null;
  if (months == null) {
    warnings.push({
      type: "warning",
      category: "budget",
      message: "Course duration is missing or invalid, so total cost cannot be estimated.",
    });
    return { cost: null, warnings };
  }

  const part = (
    amount: number | null,
    currency: string | null,
    period: CostPeriod | null,
    label: string
  ): { amount: number; currency: string } | null => {
    if (amount == null) return null;
    if (amount < 0 || !Number.isFinite(amount)) {
      warnings.push({
        type: "warning",
        category: "budget",
        message: `Course ${label} amount is invalid, so it was excluded from the estimate.`,
      });
      return null;
    }
    if (currency == null || period == null) {
      warnings.push({
        type: "warning",
        category: "budget",
        message: `Course ${label} is missing its currency or period, so it was excluded from the estimate.`,
      });
      return null;
    }
    const multiplier = periodMultiplier(period, months);
    if (multiplier == null) return null;
    return { amount: amount * multiplier, currency: currency.toUpperCase() };
  };

  const tuition = part(
    course.tuitionAmount,
    course.tuitionCurrency,
    course.tuitionPeriod,
    "tuition"
  );
  const living = part(
    course.livingCostAmount,
    course.livingCostCurrency,
    course.livingCostPeriod,
    "living cost"
  );

  if (tuition == null && living == null) {
    if (warnings.length === 0) {
      warnings.push({
        type: "warning",
        category: "budget",
        message: "The course has no usable cost data, so total cost cannot be estimated.",
      });
    }
    return { cost: null, warnings };
  }
  if (tuition != null && living != null && tuition.currency !== living.currency) {
    warnings.push({
      type: "warning",
      category: "budget",
      message:
        "Tuition and living costs use different currencies and conversion is unavailable, so total cost cannot be estimated.",
    });
    return { cost: null, warnings };
  }
  const total = (tuition?.amount ?? 0) + (living?.amount ?? 0);
  const currency = (tuition ?? living)?.currency ?? "";
  return {
    cost: {
      amount: Math.round(total * 100) / 100,
      currency,
    },
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Individual fits
// ---------------------------------------------------------------------------

export function calculateAcademicFit(
  student: StudentProfile,
  course: Course
): FitResult {
  const reasons: Evidence[] = [];
  const warnings: Evidence[] = [];

  let gpaPart: number;
  if (student.gpa == null || course.minGpa == null) {
    gpaPart = NEUTRAL_SCORE;
    warnings.push({
      type: "warning",
      category: "academic",
      message:
        "GPA information is incomplete, so academic fit uses a neutral score.",
    });
  } else {
    // 70 for barely meeting the minimum, +15 per GPA point above, capped.
    gpaPart = clampScore(70 + (student.gpa - course.minGpa) * 15);
    reasons.push({
      type: "positive",
      category: "academic",
      message:
        student.gpa >= course.minGpa + 1
          ? "GPA comfortably exceeds the course minimum requirement."
          : "GPA meets the course minimum requirement.",
    });
  }

  let backgroundPart: number;
  if (course.academicBackgrounds.length === 0) {
    backgroundPart = NEUTRAL_SCORE;
    warnings.push({
      type: "warning",
      category: "academic",
      message:
        "Accepted academic backgrounds are unknown, so that part of academic fit uses a neutral score.",
    });
  } else {
    // A ranked course with listed backgrounds has already matched (a
    // mismatch is ineligible and never ranked).
    backgroundPart = 100;
    reasons.push({
      type: "positive",
      category: "academic",
      message: "Academic background aligns with the course requirements.",
    });
  }

  return {
    score: clampScore(gpaPart * 0.6 + backgroundPart * 0.4),
    reasons,
    warnings,
  };
}

export function calculateCareerFit(
  student: StudentProfile,
  course: Course
): FitResult {
  const reasons: Evidence[] = [];
  const warnings: Evidence[] = [];

  if (student.careerGoal == null || normalize(student.careerGoal) === "") {
    warnings.push({
      type: "warning",
      category: "career",
      message:
        "Career goal is unknown, so career fit uses a neutral score instead of assuming a mismatch.",
    });
    return { score: NEUTRAL_SCORE, reasons, warnings };
  }
  if (course.careerTags.length === 0) {
    warnings.push({
      type: "warning",
      category: "career",
      message:
        "The course lists no career tags, so career fit uses a neutral score.",
    });
    return { score: NEUTRAL_SCORE, reasons, warnings };
  }

  const goalTokens = tokenize(student.careerGoal);
  const tagTokens = new Set(course.careerTags.flatMap(tokenize));
  const matched = goalTokens.filter((token) => tagTokens.has(token));
  const coverage = goalTokens.length === 0 ? 0 : matched.length / goalTokens.length;
  const score = clampScore(coverage * 100);

  if (score >= 80) {
    reasons.push({
      type: "positive",
      category: "career",
      message: "Course career tags align strongly with the student's career goal.",
    });
  } else if (score > 0) {
    reasons.push({
      type: "positive",
      category: "career",
      message: "Course career tags partially overlap with the student's career goal.",
    });
  } else {
    warnings.push({
      type: "warning",
      category: "career",
      message: "Course career tags show no overlap with the student's career goal.",
    });
  }
  return { score, reasons, warnings };
}

export function calculateBudgetFit(
  student: StudentProfile,
  course: Course
): FitResult {
  const reasons: Evidence[] = [];
  const warnings: Evidence[] = [];
  const { cost, warnings: costWarnings } = calculateEstimatedTotalCost(course);
  warnings.push(...costWarnings);

  if (student.budgetAmount == null || cost == null) {
    if (student.budgetAmount == null) {
      warnings.push({
        type: "warning",
        category: "budget",
        message:
          "Student budget is unknown, so budget fit uses a neutral score.",
      });
    }
    return { score: NEUTRAL_SCORE, reasons, warnings };
  }
  if (
    student.budgetCurrency == null ||
    cost.currency.toUpperCase() !== student.budgetCurrency.toUpperCase()
  ) {
    warnings.push({
      type: "warning",
      category: "budget",
      message:
        "Budget and course currencies differ and conversion is unavailable, so budget fit uses a neutral score.",
    });
    return { score: NEUTRAL_SCORE, reasons, warnings };
  }

  const ratio = cost.amount / student.budgetAmount;
  let score: number;
  if (ratio <= 0.7) {
    score = 100;
    reasons.push({
      type: "positive",
      category: "budget",
      message: "Estimated total cost is comfortably below the student's maximum budget.",
    });
  } else if (ratio <= 0.9) {
    score = 85;
    reasons.push({
      type: "positive",
      category: "budget",
      message: "Estimated total cost fits within the student's maximum budget.",
    });
  } else if (ratio <= 1.0) {
    score = 70;
    warnings.push({
      type: "warning",
      category: "budget",
      message: "Estimated total cost is close to the student's maximum budget.",
    });
  } else if (ratio <= 1.2) {
    score = 40;
    warnings.push({
      type: "warning",
      category: "budget",
      message: "Estimated total cost exceeds the student's maximum budget.",
    });
  } else {
    score = 15;
    warnings.push({
      type: "warning",
      category: "budget",
      message: "Estimated total cost is well above the student's maximum budget.",
    });
  }
  return { score, reasons, warnings };
}

export function calculateCountryFit(
  student: StudentProfile,
  course: Course
): FitResult {
  const reasons: Evidence[] = [];
  const warnings: Evidence[] = [];

  if (student.preferredCountries.length === 0) {
    reasons.push({
      type: "positive",
      category: "country",
      message: "No country preference specified — all countries treated equally.",
    });
    return { score: NEUTRAL_SCORE, reasons, warnings };
  }
  const preferred = student.preferredCountries.some(
    (country) => normalize(country) === normalize(course.universityCountry)
  );
  if (preferred) {
    reasons.push({
      type: "positive",
      category: "country",
      message: `The university country (${course.universityCountry}) is a preferred country.`,
    });
    return { score: 100, reasons, warnings };
  }
  warnings.push({
    type: "warning",
    category: "country",
    message: `The university country (${course.universityCountry}) is not among the student's preferred countries.`,
  });
  return { score: 40, reasons, warnings };
}

export function calculateIntakeFit(
  student: StudentProfile,
  course: Course
): FitResult {
  const reasons: Evidence[] = [];
  const warnings: Evidence[] = [];

  if (student.preferredIntake == null) {
    reasons.push({
      type: "positive",
      category: "intake",
      message: "No intake preference specified — all intakes treated equally.",
    });
    return { score: NEUTRAL_SCORE, reasons, warnings };
  }
  if (course.intakes.length === 0) {
    warnings.push({
      type: "warning",
      category: "intake",
      message: "Course intake data is missing, so intake fit uses a neutral score.",
    });
    return { score: NEUTRAL_SCORE, reasons, warnings };
  }
  if (course.intakes.includes(student.preferredIntake)) {
    reasons.push({
      type: "positive",
      category: "intake",
      message: `The preferred intake "${student.preferredIntake}" is offered.`,
    });
    return { score: 100, reasons, warnings };
  }
  warnings.push({
    type: "warning",
    category: "intake",
    message: `The preferred intake "${student.preferredIntake}" is not offered by this course.`,
  });
  return { score: 40, reasons, warnings };
}

export function eligibilityScore(status: EligibilityStatus): number {
  switch (status) {
    case "eligible":
      return 100;
    case "unknown":
      return NEUTRAL_SCORE;
    case "ineligible":
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Combined score
// ---------------------------------------------------------------------------

export interface ScoreResult {
  overall: number;
  breakdown: ScoreBreakdown;
  reasons: Evidence[];
  warnings: Evidence[];
  estimatedTotalCost: EstimatedTotalCost | null;
}

export function calculateScore(
  student: StudentProfile,
  course: Course,
  eligibility: EligibilityResult
): ScoreResult {
  const academic = calculateAcademicFit(student, course);
  const career = calculateCareerFit(student, course);
  const budget = calculateBudgetFit(student, course);
  const country = calculateCountryFit(student, course);
  const intake = calculateIntakeFit(student, course);
  const eligibilityPoints = eligibilityScore(eligibility.status);

  const breakdown: ScoreBreakdown = {
    academic: academic.score,
    career: career.score,
    budget: budget.score,
    eligibility: eligibilityPoints,
    country: country.score,
    intake: intake.score,
  };

  const overall = clampScore(
    breakdown.academic * SCORE_WEIGHTS.academic +
      breakdown.career * SCORE_WEIGHTS.career +
      breakdown.budget * SCORE_WEIGHTS.budget +
      breakdown.eligibility * SCORE_WEIGHTS.eligibility +
      breakdown.country * SCORE_WEIGHTS.country +
      breakdown.intake * SCORE_WEIGHTS.intake,
    0
  );

  const { cost } = calculateEstimatedTotalCost(course);

  return {
    overall,
    breakdown,
    reasons: [
      ...eligibility.reasons,
      ...academic.reasons,
      ...career.reasons,
      ...budget.reasons,
      ...country.reasons,
      ...intake.reasons,
    ],
    warnings: [
      ...eligibility.warnings,
      ...academic.warnings,
      ...career.warnings,
      ...budget.warnings,
      ...country.warnings,
      ...intake.warnings,
    ],
    estimatedTotalCost: cost,
  };
}
