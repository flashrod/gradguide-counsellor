/**
 * Deterministic deduplication (Milestone 4, extended in 12).
 *
 * Identity = normalized university name + normalized course name + country.
 * Normalization lowercases, drops periods, expands nothing — conservative
 * by design: "M.S. Computer Science" ≡ "MS Computer Science", but
 * "MS Computer Engineering" stays distinct, as do same-named programmes
 * in different countries.
 */

export interface CourseIdentity {
  universityName: string;
  courseName: string;
  country?: string | null;
}

/** Normalize one identity component for comparison. */
export function normalizeIdentityComponent(value: string): string {
  return value
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Canonical identity key for a university + course (+ country) triple. */
export function courseIdentityKey(
  universityName: string,
  courseName: string,
  country: string | null = null
): string {
  const base = `${normalizeIdentityComponent(universityName)}|${normalizeIdentityComponent(courseName)}`;
  return country != null && country !== ""
    ? `${base}|${normalizeIdentityComponent(country)}`
    : base;
}

/** True when two identities refer to the same course. */
export function isDuplicateCourse(a: CourseIdentity, b: CourseIdentity): boolean {
  // Country mismatch (both known) always means distinct.
  if (a.country != null && b.country != null && a.country !== "" && b.country !== "") {
    if (normalizeIdentityComponent(a.country) !== normalizeIdentityComponent(b.country)) {
      return false;
    }
  }
  return (
    courseIdentityKey(a.universityName, a.courseName, a.country ?? null) ===
    courseIdentityKey(b.universityName, b.courseName, b.country ?? null)
  );
}

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
]);

/**
 * Canonical URL for dedupe: lowercase host, no fragment, no trailing
 * slash, tracking query params stripped. Never fetched through — display
 * URLs keep their original form.
 */
export function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    url.hash = "";
    const params = new URLSearchParams(url.search);
    for (const key of [...params.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) params.delete(key);
    }
    url.search = params.toString();
    let canonical = `${url.protocol}//${url.host.toLowerCase()}${url.pathname}`;
    if (canonical.endsWith("/") && url.pathname !== "/") {
      canonical = canonical.slice(0, -1);
    }
    const search = params.toString();
    return search !== "" ? `${canonical}?${search}` : canonical;
  } catch {
    return null;
  }
}
