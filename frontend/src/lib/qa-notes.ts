/**
 * Asked-and-answered notes. When a counsellor saves a next-best-question
 * answer during an active session, the card writes a structured note —
 * `Q: <question>\nA: <answer>` — so the exchange is preserved in the
 * session history. Anything else (free text, "Next best question…"
 * attachments) is not a Q&A record and is ignored here.
 */

export interface AnsweredPair {
  question: string;
  answer: string;
}

export function formatQaNote(question: string, answer: string): string {
  return `Q: ${question}\nA: ${answer}`;
}

export function parseAnsweredNotes(
  notes: { content: string }[]
): AnsweredPair[] {
  const pairs: AnsweredPair[] = [];
  for (const note of notes) {
    if (!note.content.startsWith("Q: ")) continue;
    const rest = note.content.slice("Q: ".length);
    const splitAt = rest.indexOf("\nA: ");
    if (splitAt < 0) continue;
    const question = rest.slice(0, splitAt).trim();
    const answer = rest.slice(splitAt + "\nA: ".length).trim();
    if (question === "" || answer === "") continue;
    pairs.push({ question, answer });
  }
  return pairs;
}
