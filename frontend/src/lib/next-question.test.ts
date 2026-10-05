import { describe, expect, it } from "vitest";

import {
  NEXT_QUESTION_PLACEHOLDER,
  nextQuestionFromWarnings,
} from "./next-question";

describe("nextQuestionFromWarnings", () => {
  it("maps a work-experience warning to a question", () => {
    const question = nextQuestionFromWarnings([
      { type: "warning", category: "work-experience", message: "Months unknown." },
    ]);
    expect(question).toMatchObject({
      question: "Ask about work experience",
      reason: "Months unknown.",
      placeholder: false,
    });
  });

  it("falls back gracefully for unknown categories", () => {
    const question = nextQuestionFromWarnings([
      { type: "warning", category: "something-new", message: "Heads up." },
    ]);
    expect(question?.placeholder).toBe(false);
    expect(question?.reason).toBe("Heads up.");
  });

  it("returns null when there are no warnings", () => {
    expect(nextQuestionFromWarnings([])).toBeNull();
  });

  it("marks the placeholder explicitly", () => {
    expect(NEXT_QUESTION_PLACEHOLDER.placeholder).toBe(true);
  });
});
