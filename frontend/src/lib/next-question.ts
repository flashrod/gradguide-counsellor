import type { ApiEvidence } from "./api-types";

/**
 * Next-best-question derivation (Milestone 6).
 * Deterministic mapping from the top recommendation's first warning to a
 * counsellor question. NOT intelligent yet — the full algorithm lands in a
 * later milestone. Returns null when there is nothing to ask about.
 */

export interface NextQuestion {
  question: string;
  reason: string;
  category: string;
  placeholder: boolean;
}

const CATEGORY_QUESTIONS: Record<string, { question: string; category: string }> = {
  gpa: { question: "Ask about GPA and grading scale", category: "Academic" },
  ielts: { question: "Ask about English test scores", category: "English" },
  "work-experience": { question: "Ask about work experience", category: "Background" },
  intake: { question: "Confirm preferred intake", category: "Logistics" },
  background: { question: "Ask about academic background", category: "Academic" },
  career: { question: "Ask about career goals", category: "Goals" },
  budget: { question: "Confirm total budget", category: "Budget" },
  country: { question: "Confirm preferred countries", category: "Logistics" },
  academic: { question: "Ask about academic records", category: "Academic" },
  eligibility: { question: "Review open eligibility items", category: "Eligibility" },
};

export function nextQuestionFromWarnings(
  warnings: ApiEvidence[]
): NextQuestion | null {
  const warning = warnings[0];
  if (warning == null) return null;
  const mapped = CATEGORY_QUESTIONS[warning.category] ?? {
    question: "Review the flagged item with the student",
    category: "Follow-up",
  };
  return {
    question: mapped.question,
    reason: warning.message,
    category: mapped.category,
    placeholder: false,
  };
}

export const NEXT_QUESTION_PLACEHOLDER: NextQuestion = {
  question: "No open questions right now",
  reason:
    "Placeholder — intelligent question suggestions arrive in a later milestone.",
  category: "Placeholder",
  placeholder: true,
};
