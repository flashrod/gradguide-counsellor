import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResumeReview } from "./resume-review";

function mockFetch(responder: (url: string, init?: RequestInit) => unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(responder(url, init)),
      })
    )
  );
}

const DETAIL = {
  id: "resume-1",
  studentId: null,
  fileName: "resume.pdf",
  fileSizeBytes: 1200,
  pageCount: 1,
  status: "needs_review",
  errorMessage: null,
  extraction: {
    personal: { name: "Dylan Mascarenhas", email: "a@b.com", phone: null, location: null },
    education: [],
    experience: [],
    projects: [],
    skills: { languages: ["Python"], frameworks: [], databases: [], cloudTools: [], aiMl: [], other: [] },
    certifications: [],
    achievements: [],
  },
  candidate: {
    fields: [
      { field: "degree", value: "B.E.", scale: null, alternatives: [], source: "resume", status: "needs_review", evidence: [] },
      { field: "gpa", value: 8.62, scale: 10, alternatives: [], source: "resume", status: "needs_review", evidence: [] },
    ],
    notInferred: ["budget", "preferredCountries", "preferredIntake", "careerGoal"],
  },
  confirmedFieldSources: null,
  confirmedAt: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ResumeReview", () => {
  it("renders the upload state with PDF guardrails", async () => {
    mockFetch(() => ({ students: [] }));
    render(<ResumeReview preselectedStudentId={null} />);
    expect(await screen.findByText("Upload resume")).toBeDefined();
    expect(screen.getByText("PDF up to 5 MB")).toBeDefined();
  });

  it("rejects non-PDF files before any request", async () => {
    mockFetch(() => ({ students: [] }));
    const fetchSpy = vi.mocked(fetch);
    render(<ResumeReview preselectedStudentId={null} />);
    await screen.findByText("Upload resume");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Extract information"));
    expect(await screen.findByText("Only PDF resumes are accepted.")).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringContaining("/api/resumes/upload"), expect.anything());
  });

  it("shows provenance badges and counsellor-only fields at review", async () => {
    mockFetch((url) => {
      if (url.includes("/api/resumes/upload")) return { resume: DETAIL };
      return { students: [] };
    });
    render(<ResumeReview preselectedStudentId={null} />);
    await screen.findByText("Upload resume");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["%PDF"], "resume.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByText("Extract information"));
    expect(await screen.findByText("Review extracted profile")).toBeDefined();
    expect(screen.getAllByText("From resume · review").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("Career goal (e.g. AI/ML)")).toBeDefined();
    expect(screen.getByText("Confirm profile")).toBeDefined();
  });

  it("confirms into a new student and links recommendations", async () => {
    mockFetch((url) => {
      if (url.includes("/api/resumes/upload")) return { resume: DETAIL };
      if (url.includes("/confirm")) return { studentId: "student-9", student: {} };
      if (url.includes("/api/resumes/")) return { resume: { ...DETAIL, status: "confirmed" } };
      return { students: [] };
    });
    render(<ResumeReview preselectedStudentId={null} />);
    await screen.findByText("Upload resume");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["%PDF"], "resume.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByText("Extract information"));
    await screen.findByText("Review extracted profile");
    fireEvent.click(screen.getByText("Confirm profile"));
    await waitFor(() => {
      expect(screen.getByText("Profile confirmed — recommendations use the existing engine.")).toBeDefined();
    });
    const link = document.querySelector('a[href="/workspace?student=student-9"]');
    expect(link).not.toBeNull();
  });
});
