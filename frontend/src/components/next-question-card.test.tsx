import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NextQuestionCard } from "./next-question-card";
import type {
  ApiNextQuestion,
  ApiNextQuestionComplete,
} from "@/lib/api-types";

const QUESTION: ApiNextQuestion = {
  field: "budget",
  priority: "HIGH",
  impactScore: 82,
  affectedRecommendationCount: 7,
  affectedRecommendationPercentage: 70,
  consideredRecommendationCount: 10,
  question:
    "What is the maximum total budget you're comfortable spending on the entire program?",
  reason: "Your budget is unknown and affects affordability.",
  affectedCourses: ["Course A"],
};

const COMPLETE: ApiNextQuestionComplete = {
  status: "complete",
  message: "We have enough information to make the current recommendations.",
};

describe("NextQuestionCard", () => {
  it("renders the live question with impact", () => {
    render(<NextQuestionCard data={QUESTION} />);
    expect(screen.getByText("HIGH IMPACT")).toBeDefined();
    expect(
      screen.getByText(/maximum total budget/, { exact: false })
    ).toBeDefined();
    expect(
      screen.getByText(/7 of your top 10 recommendations/, { exact: false })
    ).toBeDefined();
    expect(screen.getByText(/affects affordability/, { exact: false })).toBeDefined();
  });

  it("renders the complete state without inventing a question", () => {
    render(<NextQuestionCard data={COMPLETE} />);
    expect(screen.getByText("Profile is sufficiently complete")).toBeDefined();
    expect(screen.getByText(/enough information/, { exact: false })).toBeDefined();
    expect(screen.queryByText("Add to session notes")).toBeNull();
  });
});
