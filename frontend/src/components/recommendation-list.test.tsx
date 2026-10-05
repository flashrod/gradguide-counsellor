import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecommendationList } from "./recommendation-list";
import type { ApiRecommendation } from "@/lib/api-types";

function makeRec(id: string, name: string): ApiRecommendation {
  return {
    courseId: id,
    universityId: "uni-1",
    courseName: name,
    universityName: "Test University",
    universityCountry: "UK",
    sourceUrl: "https://example.com",
    sourceName: "Test source",
    lastVerifiedAt: "2026-10-05T00:00:00.000Z",
    intakes: ["Fall"],
    eligibilityStatus: "eligible",
    overallScore: 80,
    scoreBreakdown: {
      academic: 80,
      career: 80,
      budget: 80,
      eligibility: 100,
      country: 80,
      intake: 80,
    },
    reasons: [],
    warnings: [],
    estimatedTotalCost: null,
  };
}

const RECS = [
  makeRec("a", "Course A"),
  makeRec("b", "Course B"),
  makeRec("c", "Course C"),
  makeRec("d", "Course D"),
];

function toggleCourse(name: string): void {
  const heading = screen.getByText(name);
  const card = heading.closest("div[class*='rounded-xl']") ?? heading.parentElement;
  const button = Array.from(card?.querySelectorAll("button") ?? []).find((b) =>
    b.textContent?.includes("Compare") || b.textContent?.includes("Selected")
  );
  if (button == null) throw new Error(`Compare button missing for ${name}`);
  fireEvent.click(button);
}

describe("RecommendationList selection", () => {
  it("selects and deselects a course", () => {
    render(<RecommendationList recommendations={RECS} />);
    toggleCourse("Course A");
    expect(screen.getByText("1 selected")).toBeDefined();
    toggleCourse("Course A");
    expect(screen.queryByText("1 selected")).toBeNull();
  });

  it("enables comparison at 2 selections with a correct link", () => {
    render(<RecommendationList recommendations={RECS} />);
    toggleCourse("Course A");
    toggleCourse("Course B");
    const link = screen.getByText("Compare selected").closest("a");
    expect(link?.getAttribute("href")).toBe("/workspace/compare?ids=a,b");
  });

  it("blocks a fourth selection with a message", () => {
    render(<RecommendationList recommendations={RECS} />);
    toggleCourse("Course A");
    toggleCourse("Course B");
    toggleCourse("Course C");
    toggleCourse("Course D");
    expect(
      screen.getByText("Compare up to 3 courses at a time.")
    ).toBeDefined();
    expect(screen.getByText("3 selected")).toBeDefined();
  });

  it("clears the selection", () => {
    render(<RecommendationList recommendations={RECS} />);
    toggleCourse("Course A");
    fireEvent.click(screen.getByText("Clear"));
    expect(screen.queryByText("1 selected")).toBeNull();
  });
});
