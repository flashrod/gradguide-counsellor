import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

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
    render(
      <NextQuestionCard
        data={QUESTION}
        studentId="student-1"
        activeSessionId="session-1"
      />
    );
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
    render(
      <NextQuestionCard
        data={COMPLETE}
        studentId="student-1"
        activeSessionId={null}
      />
    );
    expect(screen.getByText("Profile is sufficiently complete")).toBeDefined();
    expect(screen.getByText(/enough information/, { exact: false })).toBeDefined();
    expect(screen.queryByText("Add to session notes")).toBeNull();
  });

  it("renders numeric answer inputs for the budget field", () => {
    render(
      <NextQuestionCard
        data={QUESTION}
        studentId="student-1"
        activeSessionId="session-1"
      />
    );
    expect(screen.getByLabelText("Budget amount")).toBeDefined();
    expect(screen.getByLabelText("Budget currency")).toBeDefined();
    expect(screen.getByText("Add to session notes")).toBeDefined();
  });

  it("saves a career answer with PATCH and confirms", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ student: { id: "student-1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(
        <NextQuestionCard
          data={{ ...QUESTION, field: "career" }}
          studentId="student-1"
          activeSessionId="session-1"
        />
      );
      fireEvent.change(screen.getByLabelText("Answer"), {
        target: { value: "ML engineer" },
      });
      fireEvent.click(screen.getByText("Save answer"));
      await screen.findByText("Saved — recommendations updated.");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/students/student-1",
        expect.objectContaining({ method: "PATCH" })
      );
      const body = JSON.parse(
        (fetchMock.mock.calls[0]?.[1] as { body: string }).body
      ) as { careerGoal?: string };
      expect(body.careerGoal).toBe("ML engineer");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
