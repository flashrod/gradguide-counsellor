import { describe, expect, it } from "vitest";

import {
  CollegeScorecardSource,
  loadScorecardConfig,
  parseScorecardResponse,
} from "./collegeScorecard.js";
import { isPathAllowed, parseRobotsDisallows } from "../utils/fetch.js";

describe("robots handling", () => {
  const robots = [
    "User-agent: *",
    "Disallow: /study/computational-finance-ms",
    "Disallow: /admin",
    "",
  ].join("\n");

  it("parses disallow rules", () => {
    expect(parseRobotsDisallows(robots)).toEqual([
      "/study/computational-finance-ms",
      "/admin",
    ]);
  });

  it("allows the RIT programme path", () => {
    expect(isPathAllowed("/study/computer-science-ms", parseRobotsDisallows(robots))).toBe(true);
  });

  it("blocks disallowed paths", () => {
    expect(isPathAllowed("/study/computational-finance-ms", parseRobotsDisallows(robots))).toBe(false);
    expect(isPathAllowed("/admin/login", parseRobotsDisallows(robots))).toBe(false);
  });
});

describe("CollegeScorecardSource", () => {
  it("reads configuration from the environment", () => {
    const config = loadScorecardConfig({
      COLLEGESCOREDATA_API_KEY: "DEMO_KEY",
    } as NodeJS.ProcessEnv);
    expect(config.apiKey).toBe("DEMO_KEY");
    expect(new CollegeScorecardSource(config).isConfigured).toBe(true);
    expect(new CollegeScorecardSource({ apiUrl: "https://x", apiKey: null }).isConfigured).toBe(false);
  });

  it("parses a fixture API payload", () => {
    const candidates = parseScorecardResponse({
      metadata: { total: 1, page: 0 },
      results: [
        {
          id: 194824,
          "school.name": "Rochester Institute of Technology",
          "school.city": "Rochester",
          "school.state": "NY",
          "school.school_url": "www.rit.edu",
        },
      ],
    });
    expect(candidates).toEqual([
      {
        name: "Rochester Institute of Technology",
        country: "USA",
        city: "Rochester",
        website: "www.rit.edu",
        source: "US Dept of Education College Scorecard",
      },
    ]);
  });

  it("rejects malformed payloads", () => {
    expect(() => parseScorecardResponse({ results: [{ id: 1 }] })).toThrow();
  });
});
