import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompareTable, type CompareEntry } from "./compare-table";
import type { ApiCourseDetails, ApiRecommendation } from "@/lib/api-types";

function makeEntry(
  id: string,
  name: string,
  score: number,
  academic: number,
  details: Partial<ApiCourseDetails> = {},
  status: ApiRecommendation["eligibilityStatus"] = "eligible"
): CompareEntry {
  return {
    recommendation: {
      courseId: id,
      universityId: "uni-1",
      courseName: name,
      universityName: `${name} University`,
      universityCountry: "UK",
      sourceUrl: `https://example.com/${id}`,
      sourceName: `${name} source`,
      lastVerifiedAt: "2026-10-05T00:00:00.000Z",
      intakes: ["Fall"],
      eligibilityStatus: status,
      overallScore: score,
      scoreBreakdown: {
        academic,
        career: 80,
        budget: 80,
        eligibility: 100,
        country: 80,
        intake: 80,
      },
      reasons: [
        { type: "positive", category: "academic", message: `${name} reason.` },
      ],
      warnings:
        status === "eligible"
          ? []
          : [{ type: "warning", category: "gpa", message: `${name} GPA warning.` }],
      estimatedTotalCost: null,
    },
    details: {
      courseName: name,
      universityName: `${name} University`,
      universityCountry: "UK",
      universityCity: "Testville",
      degreeType: "MSc",
      field: "AI",
      durationMonths: 12,
      tuitionAmount: 28500,
      tuitionCurrency: "GBP",
      tuitionPeriod: "annual",
      livingCostAmount: null,
      livingCostCurrency: null,
      livingCostPeriod: null,
      minGpa: { value: 8.0, scale: 10 },
      minIeltsOverall: 7.0,
      minIeltsWriting: null,
      minIeltsReading: null,
      minIeltsListening: null,
      minIeltsSpeaking: null,
      minToeflOverall: null,
      workExperienceRequired: false,
      workExperienceMonthsRequired: null,
      academicBackgrounds: ["Computer Science"],
      intakes: ["Fall"],
      careerTags: ["AI"],
      sourceUrl: `https://example.com/${id}`,
      sourceName: `${name} source`,
      lastVerifiedAt: "2026-10-05T00:00:00.000Z",
      ...details,
    },
  };
}

const ENTRIES = [
  makeEntry("a", "Alpha", 91, 90),
  makeEntry("b", "Beta", 82, 75, { tuitionAmount: null, tuitionCurrency: null, durationMonths: null, minToeflOverall: null }),
];

describe("CompareTable", () => {
  it("renders courses side-by-side with scores", () => {
    render(<CompareTable entries={ENTRIES} />);
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByText("Beta")).toBeDefined();
    expect(screen.getByText("91")).toBeDefined();
    expect(screen.getByText("82")).toBeDefined();
  });

  it("keeps unknown values visibly unknown", () => {
    render(<CompareTable entries={ENTRIES} />);
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    expect(screen.queryByText("$0")).toBeNull();
    expect(screen.queryByText("0 months")).toBeNull();
  });

  it("marks the strongest dimension without declaring a winner", () => {
    render(<CompareTable entries={ENTRIES} />);
    expect(screen.getAllByText("Strongest").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Best university/i)).toBeNull();
  });

  it("renders eligibility and backend evidence", () => {
    render(<CompareTable entries={ENTRIES} />);
    expect(screen.getAllByText("Eligible").length).toBe(2);
    expect(screen.getByText("Alpha reason.")).toBeDefined();
  });

  it("shows ineligibility reasons from evidence", () => {
    render(
      <CompareTable entries={[makeEntry("a", "Alpha", 91, 90), makeEntry("c", "Gamma", 40, 50, {}, "unknown")]} />
    );
    expect(screen.getAllByText("Unknown").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Gamma GPA warning.")).toHaveLength(2);
  });

  it("renders clickable sources with verified dates", () => {
    render(<CompareTable entries={ENTRIES} />);
    const link = screen.getByText("Alpha source").closest("a");
    expect(link?.getAttribute("href")).toBe("https://example.com/a");
    expect(screen.getAllByText(/Oct 5, 2026/).length).toBe(2);
  });
});
