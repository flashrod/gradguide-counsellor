import { describe, expect, it } from "vitest";

import { summarizeQuality, type QualityRow } from "./qualityReport.js";

function row(overrides: Partial<QualityRow> = {}): QualityRow {
  return {
    universityName: "Test University",
    country: "UK",
    courseName: "Computer Science MSc",
    tuitionAmount: 20000,
    minGpa: null,
    minIeltsOverall: 6.5,
    minToeflOverall: null,
    intakes: ["September"],
    durationMonths: 12,
    sourceUrl: "https://example.com/ms",
    lastVerifiedAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

describe("summarizeQuality", () => {
  it("counts totals, countries, and coverage", () => {
    const summary = summarizeQuality(
      [
        row({}),
        row({ country: "USA", tuitionAmount: null, intakes: [] }),
      ],
      new Date("2026-10-06T00:00:00Z")
    );
    expect(summary.total).toBe(2);
    expect(summary.byCountry).toEqual({ UK: 1, USA: 1 });
    expect(summary.coverage.tuition).toBe(50);
    expect(summary.coverage.intake).toBe(50);
    expect(summary.coverage.duration).toBe(100);
  });

  it("flags fee-like tuition, legacy zero durations, and off-scale English minima", () => {
    const summary = summarizeQuality(
      [
        row({ tuitionAmount: 60 }),
        row({ courseName: "B", durationMonths: 0 }),
        row({ courseName: "C", minToeflOverall: 59 }),
        row({ courseName: "D", minIeltsOverall: 5.0 }),
        row({ courseName: "E", durationMonths: 72 }),
      ],
      new Date("2026-10-06T00:00:00Z")
    );
    expect(summary.suspicious).toHaveLength(5);
  });

  it("flags records not verified within 90 days", () => {
    const summary = summarizeQuality(
      [row({ lastVerifiedAt: new Date("2025-01-01T00:00:00Z") })],
      new Date("2026-10-06T00:00:00Z")
    );
    expect(summary.stale).toHaveLength(1);
  });

  it("handles an empty catalogue without dividing by zero", () => {
    const summary = summarizeQuality([]);
    expect(summary.total).toBe(0);
    expect(summary.coverage.tuition).toBe(0);
  });
});
