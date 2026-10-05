/**
 * Intake normalization (Milestone 5).
 *
 * Raw strings ("Fall", "September 2027", "Fall 2027") are preserved on the
 * records; this module derives a comparable { season, month, year } view.
 * Seasons follow northern-hemisphere academic convention:
 * Fall = Sep–Nov, Winter = Dec–Feb, Spring = Mar–May, Summer = Jun–Aug.
 * "Rolling / year-round / throughout the year" means open intake (matches
 * everything). Unparseable text yields null — never a guess.
 */

export type IntakeSeason = "Fall" | "Winter" | "Spring" | "Summer";

export interface NormalizedIntake {
  season: IntakeSeason | null;
  month: number | null;
  year: number | null;
  open: boolean;
}

const SEASONS: IntakeSeason[] = ["Fall", "Winter", "Spring", "Summer"];

const MONTHS: { name: string; month: number; season: IntakeSeason }[] = [
  { name: "january", month: 1, season: "Winter" },
  { name: "february", month: 2, season: "Winter" },
  { name: "march", month: 3, season: "Spring" },
  { name: "april", month: 4, season: "Spring" },
  { name: "may", month: 5, season: "Spring" },
  { name: "june", month: 6, season: "Summer" },
  { name: "july", month: 7, season: "Summer" },
  { name: "august", month: 8, season: "Summer" },
  { name: "september", month: 9, season: "Fall" },
  { name: "october", month: 10, season: "Fall" },
  { name: "november", month: 11, season: "Fall" },
  { name: "december", month: 12, season: "Winter" },
];

const OPEN_PATTERNS =
  /rolling|year-round|year round|throughout the year|open admission|continuous/i;

export function isOpenIntakeText(text: string): boolean {
  return OPEN_PATTERNS.test(text);
}

export function normalizeIntake(value: string): NormalizedIntake | null {
  if (isOpenIntakeText(value)) {
    return { season: null, month: null, year: null, open: true };
  }
  const lowered = value.toLowerCase();
  let season: IntakeSeason | null = null;
  for (const candidate of SEASONS) {
    if (new RegExp(`\\b${candidate.toLowerCase()}\\b`).test(lowered)) {
      season = candidate;
      break;
    }
  }
  let month: number | null = null;
  for (const entry of MONTHS) {
    if (new RegExp(`\\b${entry.name}\\b`).test(lowered)) {
      month = entry.month;
      season = entry.season;
      break;
    }
  }
  const yearMatch = /(19|20)\d{2}/.exec(value);
  const year = yearMatch != null ? Number(yearMatch[0]) : null;
  if (season == null && month == null && year == null) return null;
  return { season, month, year, open: false };
}

export type IntakeCompatibility = "match" | "mismatch" | "unknown";

/**
 * Compatibility between one preferred intake and one course intake entry.
 * Compatible when nothing contradicts: equal seasons match, a month implying
 * the entry's season matches, differing years mismatch. Underspecified
 * sides do not block a match.
 */
export function compareIntakes(
  preferred: string,
  courseEntry: string
): IntakeCompatibility {
  const student = normalizeIntake(preferred);
  const course = normalizeIntake(courseEntry);
  if (student == null || course == null) return "unknown";
  if (student.open || course.open) return "match";
  if (
    student.year != null &&
    course.year != null &&
    student.year !== course.year
  ) {
    return "mismatch";
  }
  if (
    student.season != null &&
    course.season != null &&
    student.season !== course.season
  ) {
    return "mismatch";
  }
  return "match";
}
