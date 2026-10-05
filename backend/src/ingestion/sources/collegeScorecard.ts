import { z } from "zod";

import type { UniversityCandidate } from "../types.js";

/**
 * US Department of Education College Scorecard source (Milestone 4).
 *
 * Institution-discovery abstraction. The demo pipeline does NOT depend on
 * it (works without credentials); when `COLLEGESCOREDATA_API_KEY` is set,
 * the demo uses it to enrich university metadata (city, website).
 *
 * Get a key at https://api.data.gov/signup/ (free). `DEMO_KEY` also works
 * for low-volume testing. Never hardcode keys — env only.
 */

const DEFAULT_API_URL = "https://api.data.gov/ed/collegescorecard/v1";

const schoolSchema = z.object({
  id: z.number(),
  "school.name": z.string(),
  "school.city": z.string().nullable().optional(),
  "school.state": z.string().nullable().optional(),
  "school.school_url": z.string().nullable().optional(),
});

const responseSchema = z.object({
  results: z.array(schoolSchema),
  metadata: z.object({ total: z.number(), page: z.number() }).passthrough(),
});

/** Validate + map a raw Scorecard payload. Exported for unit testing. */
export function parseScorecardResponse(json: unknown): UniversityCandidate[] {
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `College Scorecard response failed validation: ${parsed.error.issues
        .map((i) => i.message)
        .join("; ")}`
    );
  }
  return parsed.data.results.map((school) => ({
    name: school["school.name"],
    country: "USA",
    city: school["school.city"] ?? null,
    website: school["school.school_url"] ?? null,
    source: "US Dept of Education College Scorecard",
  }));
}

export interface ScorecardConfig {
  apiUrl: string;
  apiKey: string | null;
}

export function loadScorecardConfig(
  env: NodeJS.ProcessEnv = process.env
): ScorecardConfig {
  return {
    apiUrl: env["COLLEGESCOREDATA_API_URL"] ?? DEFAULT_API_URL,
    apiKey: env["COLLEGESCOREDATA_API_KEY"] ?? null,
  };
}

export class CollegeScorecardSource {
  static readonly id = "college-scorecard";

  constructor(private readonly config: ScorecardConfig) {}

  get isConfigured(): boolean {
    return this.config.apiKey != null && this.config.apiKey !== "";
  }

  /**
   * Look up institutions by name. Small limits only — this milestone is
   * about proving the adapter, not bulk discovery.
   */
  async getUniversities(options: {
    name: string;
    limit?: number;
  }): Promise<UniversityCandidate[]> {
    if (!this.isConfigured) {
      throw new Error(
        "College Scorecard API key is not configured. Set COLLEGESCOREDATA_API_KEY (see backend/.env.example)."
      );
    }
    const limit = Math.min(Math.max(options.limit ?? 5, 1), 10);
    const params = new URLSearchParams({
      api_key: this.config.apiKey ?? "",
      "school.name": options.name,
      fields: "id,school.name,school.city,school.state,school.school_url",
      per_page: String(limit),
    });
    const response = await fetch(
      `${this.config.apiUrl}/schools.json?${params.toString()}`,
      { signal: AbortSignal.timeout(15_000) }
    );
    if (!response.ok) {
      throw new Error(`College Scorecard request failed (${response.status})`);
    }
    return parseScorecardResponse(await response.json());
  }
}
