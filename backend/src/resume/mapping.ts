import type { ResumeExtraction } from "./schema.js";

/**
 * ResumeExtraction → ProfileCandidate mapping (Milestone 13).
 *
 * Precedence (documented product rule):
 *   COUNSELLOR CONFIRMED / MANUAL  >  RESUME EXTRACTED  >  UNKNOWN
 *
 * The mapper never writes to a student profile. It produces candidates
 * with evidence; the counsellor picks values at review time and the
 * confirm step applies only explicitly confirmed fields.
 *
 * Deliberately NEVER inferred: budget, preferred countries, preferred
 * intake, career goal. They appear in `notInferred` so the UI can prompt
 * the counsellor instead of fabricating them.
 */

export type CandidateField =
  | "name"
  | "degree"
  | "field"
  | "gpa"
  | "ieltsOverall"
  | "toeflOverall"
  | "workExperienceMonths";

export interface FieldCandidate {
  field: CandidateField;
  /** Null = resume has nothing usable for this field. */
  value: string | number | null;
  /** GPA scale travels alongside the value; null = scale unknown. */
  scale: number | null;
  /** All overall GPA mentions when several exist — counsellor picks one. */
  alternatives: { value: number; scale: number | null; snippet: string }[];
  source: "resume";
  status: "needs_review";
  evidence: string[];
}

export interface ProfileCandidate {
  fields: FieldCandidate[];
  /** Recommendation-relevant fields a resume cannot provide. */
  notInferred: ("budget" | "preferredCountries" | "preferredIntake" | "careerGoal")[];
}

function candidate(
  field: CandidateField,
  value: string | number | null,
  evidence: string[],
  extra: Partial<Pick<FieldCandidate, "scale" | "alternatives">> = {}
): FieldCandidate {
  return {
    field,
    value,
    scale: null,
    alternatives: [],
    source: "resume",
    status: "needs_review",
    evidence,
    ...extra,
  };
}

/** Highest degree wins: prefer entries with end years, then later years. */
function pickEducation(extraction: ResumeExtraction) {
  const entries = extraction.education;
  if (entries.length === 0) return null;
  const ranked = [...entries].sort(
    (a, b) => (b.endYear ?? 0) - (a.endYear ?? 0)
  );
  return ranked[0] ?? null;
}

export function mapToProfileCandidate(extraction: ResumeExtraction): ProfileCandidate {
  const fields: FieldCandidate[] = [];

  fields.push(
    candidate(
      "name",
      extraction.personal.name,
      extraction.personal.name != null ? [`resume header: "${extraction.personal.name}"`] : []
    )
  );

  const education = pickEducation(extraction);
  fields.push(
    candidate(
      "degree",
      education?.degree ?? null,
      education?.degree != null ? [education.snippet] : []
    )
  );
  fields.push(
    candidate(
      "field",
      education?.field ?? null,
      education?.field != null ? [education.snippet] : []
    )
  );

  // GPA: overall mentions only — semester figures are never candidates.
  const overall = extraction.education.flatMap((e) =>
    [e.gpa, ...e.otherGpas].filter(
      (g): g is NonNullable<typeof g> => g != null && g.kind === "overall"
    )
  );
  const primary = overall[0] ?? null;
  fields.push(
    candidate(
      "gpa",
      primary?.value ?? null,
      primary != null ? [primary.snippet] : [],
      {
        scale: primary?.scale ?? null,
        alternatives: overall.slice(1).map((g) => ({
          value: g.value,
          scale: g.scale,
          snippet: g.snippet,
        })),
      }
    )
  );

  fields.push(
    candidate(
      "ieltsOverall",
      extraction.englishIeltsOverall,
      extraction.englishIeltsOverall != null && extraction.englishEvidence != null
        ? [extraction.englishEvidence]
        : []
    )
  );
  fields.push(
    candidate(
      "toeflOverall",
      extraction.englishToeflOverall,
      extraction.englishToeflOverall != null && extraction.englishEvidence != null
        ? [extraction.englishEvidence]
        : []
    )
  );
  fields.push(
    candidate(
      "workExperienceMonths",
      extraction.workExperienceMonths,
      extraction.workExperienceMonths != null && extraction.workExperienceEvidence != null
        ? [extraction.workExperienceEvidence]
        : []
    )
  );

  return {
    fields,
    notInferred: ["budget", "preferredCountries", "preferredIntake", "careerGoal"],
  };
}
