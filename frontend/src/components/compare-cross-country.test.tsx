import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import { CompareTable } from "./compare-table";
import type { ApiCourseDetails, ApiRecommendation } from "@/lib/api-types";

function makeRec(id: string, country: string, score: number): ApiRecommendation {
  return {
    courseId: id,
    universityId: "uni-1",
    courseName: `Course ${id}`,
    universityName: `${country} University`,
    universityCountry: country,
    sourceUrl: "https://example.com",
    sourceName: "Test source",
    lastVerifiedAt: "2026-10-05T00:00:00.000Z",
    intakes: ["Fall"],
    eligibilityStatus: "eligible",
    overallScore: score,
    scoreBreakdown: {
      academic: 80,
      career: 80,
      budget: 80,
      eligibility: 100,
      country: country === "USA" ? 100 : 40,
      intake: 80,
    },
    reasons: [],
    warnings: [],
    estimatedTotalCost: null,
  };
}

function makeDetails(
  currency: string | null,
  tuition: number | null
): ApiCourseDetails {
  return {
    courseName: "Course",
    universityName: "Uni",
    universityCountry: "USA",
    universityCity: "Testville",
    degreeType: "MS",
    field: "Computer Science",
    durationMonths: 24,
    tuitionAmount: tuition,
    tuitionCurrency: currency,
    tuitionPeriod: tuition != null ? "annual" : null,
    livingCostAmount: null,
    livingCostCurrency: null,
    livingCostPeriod: null,
    minGpa: { value: 3.0, scale: 4 },
    minIeltsOverall: 6.5,
    minIeltsWriting: null,
    minIeltsReading: null,
    minIeltsListening: null,
    minIeltsSpeaking: null,
    minToeflOverall: 88,
    workExperienceRequired: false,
    workExperienceMonthsRequired: null,
    academicBackgrounds: [],
    intakes: ["Fall"],
    careerTags: [],
    sourceUrl: "https://example.com",
    sourceName: "Test source",
    lastVerifiedAt: "2026-10-05T00:00:00.000Z",
  };
}

describe("CompareTable cross-country", () => {
  it("shows both currencies without conversion", () => {
    render(
      <CompareTable
        entries={[
          { recommendation: makeRec("us", "USA", 85), details: makeDetails("USD", 28500) },
          { recommendation: makeRec("uk", "UK", 82), details: makeDetails("GBP", 34000) },
        ]}
      />
    );
    expect(screen.getByText("USD 28,500 annual")).toBeDefined();
    expect(screen.getByText("GBP 34,000 annual")).toBeDefined();
  });

  it("keeps unknown tuition unknown across countries", () => {
    render(
      <CompareTable
        entries={[
          { recommendation: makeRec("us", "USA", 85), details: makeDetails(null, null) },
          { recommendation: makeRec("uk", "UK", 82), details: makeDetails("GBP", 34000) },
        ]}
      />
    );
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    expect(screen.queryByText("$0")).toBeNull();
  });
});
