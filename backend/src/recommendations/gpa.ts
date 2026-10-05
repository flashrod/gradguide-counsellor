import type { GpaValue } from "./types.js";

/**
 * GPA scale normalization (Milestone 5).
 *
 * Raw cross-scale comparison (8.4 >= 3.0) is a bug: the values live on
 * different scales. Both sides carry { value, scale }; comparison happens
 * on value/scale. A missing or malformed scale is UNKNOWN, never a guess —
 * including "value present but scale missing".
 *
 * Limitation (documented, by design): value/scale linearity is a prototype
 * heuristic for ranking — international GPA scales are NOT perfectly
 * linearly equivalent, and this must never be presented as an official
 * admissions equivalency.
 */

/** True when a GPA record is well-formed (finite, non-negative, positive scale). */
export function isValidGpa(
  gpa: GpaValue | null
): gpa is { value: number; scale: number } {
  return (
    gpa != null &&
    gpa.value != null &&
    gpa.scale != null &&
    Number.isFinite(gpa.value) &&
    Number.isFinite(gpa.scale) &&
    gpa.value >= 0 &&
    gpa.scale > 0
  );
}

/** Normalized 0–1 value for internal comparison, or null when unusable. */
export function normalizeGpa(gpa: GpaValue | null): number | null {
  if (!isValidGpa(gpa)) return null;
  return gpa.value / gpa.scale;
}

/** Original-scale display for counsellors (e.g. "8.4/10"). Never normalized. */
export function formatGpa(gpa: GpaValue | null): string {
  if (!isValidGpa(gpa)) return "unknown";
  return `${gpa.value}/${gpa.scale}`;
}

export type GpaComparison = "pass" | "fail" | "unknown";

/** Compare a student GPA against a course minimum on normalized values. */
export function compareGpa(
  student: GpaValue | null,
  minimum: GpaValue | null
): GpaComparison {
  if (minimum == null || minimum.value == null) return "pass";
  if (student == null) return "unknown";
  if (student.value == null) return "unknown";
  if (!isValidGpa(student) || !isValidGpa(minimum)) return "unknown";
  return student.value / student.scale >= minimum.value / minimum.scale
    ? "pass"
    : "fail";
}
