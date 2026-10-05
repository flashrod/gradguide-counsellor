import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyRecommendations } from "./empty-recommendations";
import { RecommendationCard } from "./recommendation-card";
import type { ApiRecommendation } from "@/lib/api-types";

function makeRecommendation(
  overrides: Partial<ApiRecommendation> = {}
): ApiRecommendation {
  return {
    courseId: "course-1",
    universityId: "uni-1",
    courseName: "Computer Science MS",
    universityName: "Rochester Institute of Technology",
    universityCountry: "USA",
    sourceUrl: "https://www.rit.edu/study/computer-science-ms",
    sourceName: "RIT Graduate Study",
    lastVerifiedAt: "2026-10-05T00:00:00.000Z",
    intakes: ["Fall", "Spring"],
    eligibilityStatus: "eligible",
    overallScore: 84,
    scoreBreakdown: {
      academic: 90,
      career: 70,
      budget: 70,
      eligibility: 100,
      country: 100,
      intake: 100,
    },
    reasons: [
      {
        type: "positive",
        category: "academic",
        message: "Student GPA 8.4/10 meets the required minimum of 3.0/4.0.",
      },
    ],
    warnings: [
      {
        type: "warning",
        category: "budget",
        message: "Estimated total cost is unknown.",
      },
    ],
    estimatedTotalCost: null,
    ...overrides,
  };
}

describe("RecommendationCard", () => {
  it("renders names, score, and eligibility", () => {
    render(<RecommendationCard recommendation={makeRecommendation()} />);
    expect(screen.getByText("Computer Science MS")).toBeDefined();
    expect(
      screen.getByText("Rochester Institute of Technology")
    ).toBeDefined();
    expect(screen.getByText("84")).toBeDefined();
    expect(screen.getByText("Eligible")).toBeDefined();
  });

  it("renders unknown cost as Unknown, never $0", () => {
    render(<RecommendationCard recommendation={makeRecommendation()} />);
    expect(screen.getByText("Unknown")).toBeDefined();
    expect(screen.queryByText("$0")).toBeNull();
  });

  it("renders a known cost estimate", () => {
    render(
      <RecommendationCard
        recommendation={makeRecommendation({
          estimatedTotalCost: { amount: 40500, currency: "GBP" },
        })}
      />
    );
    expect(screen.getByText("GBP 40,500 (est. total)")).toBeDefined();
  });

  it("reveals backend evidence on Why?", () => {
    render(<RecommendationCard recommendation={makeRecommendation()} />);
    expect(
      screen.queryByText("Student GPA 8.4/10 meets the required minimum of 3.0/4.0.")
    ).toBeNull();
    fireEvent.click(screen.getByText("Why 84?"));
    expect(
      screen.getByText("Student GPA 8.4/10 meets the required minimum of 3.0/4.0.")
    ).toBeDefined();
    expect(screen.getByText("Estimated total cost is unknown.")).toBeDefined();
  });

  it("renders the source link and verified date", () => {
    render(<RecommendationCard recommendation={makeRecommendation()} />);
    const link = screen.getByText("View source").closest("a");
    expect(link?.getAttribute("href")).toBe(
      "https://www.rit.edu/study/computer-science-ms"
    );
    expect(screen.getByText(/Oct 5, 2026/)).toBeDefined();
  });

  it("flags unknown eligibility distinctly", () => {
    render(
      <RecommendationCard
        recommendation={makeRecommendation({ eligibilityStatus: "unknown" })}
      />
    );
    expect(screen.getByText("Unknown eligibility")).toBeDefined();
  });
});

describe("EmptyRecommendations", () => {
  it("explains the empty state", () => {
    render(<EmptyRecommendations />);
    expect(screen.getByText("No strong matches yet")).toBeDefined();
  });
});
