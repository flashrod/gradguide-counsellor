import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { NoteForm } from "./note-form";
import { SessionBar } from "./session-bar";
import { SessionHistoryList } from "./session-history-list";
import type { ApiSessionSummary } from "@/lib/api-types";

const SUMMARY: ApiSessionSummary = {
  id: "session-1",
  studentId: "student-1",
  counsellorId: "counsellor-1",
  startedAt: "2026-10-05T09:00:00.000Z",
  endedAt: null,
  status: "ACTIVE",
  recommendationCount: 3,
  simulationCount: 1,
  comparisonCount: 1,
  noteCount: 2,
  topRecommendation: {
    courseName: "Computer Science MS",
    universityName: "Rochester Institute of Technology",
    score: 84,
  },
};

describe("SessionBar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts a session and shows the active indicator", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ session: SUMMARY }),
      })
    );
    const { rerender } = render(<SessionBar studentId="s1" activeSession={null} />);
    expect(screen.getByText("Start counselling session")).toBeDefined();
    fireEvent.click(screen.getByText("Start counselling session"));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    rerender(
      <SessionBar
        studentId="s1"
        activeSession={{ id: "session-1", startedAt: SUMMARY.startedAt }}
      />
    );
    expect(screen.getByText("Session active")).toBeDefined();
    expect(screen.getByText("End session")).toBeDefined();
  });

  it("shows an error when starting fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    render(<SessionBar studentId="s1" activeSession={null} />);
    fireEvent.click(screen.getByText("Start counselling session"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
  });
});

describe("SessionHistoryList", () => {
  it("renders session rows with snapshot summaries", () => {
    render(<SessionHistoryList sessions={[SUMMARY]} />);
    expect(screen.getByText("Active")).toBeDefined();
    expect(
      screen.getByText((_, element) =>
        element?.tagName === "P" &&
        (element?.textContent ?? "").includes("Top: Computer Science MS")
      )
    ).toBeDefined();
    expect(
      screen.getByText(/3 recommendations/, { exact: false })
    ).toBeDefined();
    expect(screen.getByText("View session").closest("a")?.getAttribute("href")).toBe(
      "/sessions/session-1"
    );
  });

  it("renders the empty state", () => {
    render(<SessionHistoryList sessions={[]} />);
    expect(screen.getByText("No sessions yet")).toBeDefined();
    expect(screen.getByText("Go to workspace")).toBeDefined();
  });
});

describe("NoteForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts a note and clears the field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ note: { id: "n1", content: "Hi" } }),
      })
    );
    render(<NoteForm sessionId="session-1" />);
    fireEvent.change(screen.getByLabelText("Add a note"), {
      target: { value: "Prefers Fall." },
    });
    fireEvent.click(screen.getByText("Save note"));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    expect(
      (screen.getByLabelText("Add a note") as HTMLTextAreaElement).value
    ).toBe("");
  });

  it("shows an error when saving fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    render(<NoteForm sessionId="session-1" />);
    fireEvent.change(screen.getByLabelText("Add a note"), {
      target: { value: "Prefers Fall." },
    });
    fireEvent.click(screen.getByText("Save note"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
  });
});
