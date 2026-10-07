import { describe, expect, it } from "vitest";

import { formatQaNote, parseAnsweredNotes } from "./qa-notes";

describe("Q&A notes", () => {
  it("round-trips a question and answer", () => {
    const note = formatQaNote("What role?", "ML engineer");
    expect(parseAnsweredNotes([{ content: note }])).toEqual([
      { question: "What role?", answer: "ML engineer" },
    ]);
  });

  it("ignores free-text and question-only notes", () => {
    expect(
      parseAnsweredNotes([
        { content: "Student prefers North America." },
        { content: "Next best question (career): What role?" },
        { content: "Q: Broken" },
        { content: "Q:  \nA:  " },
      ])
    ).toEqual([]);
  });
});
