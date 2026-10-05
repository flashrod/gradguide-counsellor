/**
 * Deterministic deduplication (Milestone 4).
 *
 * Identity = normalized university name + normalized course name.
 * Normalization lowercases, drops periods, expands nothing — conservative
 * by design: "M.S. Computer Science" ≡ "MS Computer Science", but
 * "MS Computer Engineering" stays distinct.
 */

/** Normalize one identity component for comparison. */
export function normalizeIdentityComponent(value: string): string {
  return value
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Canonical identity key for a university + course pair. */
export function courseIdentityKey(
  universityName: string,
  courseName: string
): string {
  return `${normalizeIdentityComponent(universityName)}|${normalizeIdentityComponent(courseName)}`;
}

/** True when two pairs refer to the same course. */
export function isDuplicateCourse(
  a: { universityName: string; courseName: string },
  b: { universityName: string; courseName: string }
): boolean {
  return courseIdentityKey(a.universityName, a.courseName) ===
    courseIdentityKey(b.universityName, b.courseName);
}
