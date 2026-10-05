import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WhatIfPanel } from "./what-if-panel";

const DEFAULTS = {
  budgetAmount: "3500000",
  budgetCurrency: "INR",
  country: "UK",
  intake: "September 2027",
  gpaValue: "8.4",
  gpaScale: "10",
};

function mockFetchOnce(payload: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(payload),
    })
  );
}

const SIMULATION = {
  studentId: "s1",
  studentName: "Test",
  baseline: [],
  simulated: [],
  changes: [
    {
      courseId: "c1",
      courseName: "RIT — MS Computer Science",
      change: "RANK_UP",
      eligibilityChanged: false,
      oldRank: 4,
      newRank: 1,
      oldScore: 78,
      newScore: 91,
      scoreDelta: 13,
    },
  ],
  summary: {
    movedUp: 1,
    movedDown: 0,
    newlyEligible: 0,
    noLongerEligible: 0,
    unchanged: 2,
  },
};

describe("WhatIfPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the scenario controls", () => {
    render(<WhatIfPanel studentId="s1" defaults={DEFAULTS} />);
    expect(screen.getByText("What If?")).toBeDefined();
    expect(screen.getByLabelText("Scenario budget amount")).toBeDefined();
    expect(screen.getByLabelText("Scenario country")).toBeDefined();
    expect(
      screen.getByText(/Simulation only/, { exact: false })
    ).toBeDefined();
  });

  it("applies a simulation and renders rank and score deltas", async () => {
    mockFetchOnce(SIMULATION);
    render(<WhatIfPanel studentId="s1" defaults={DEFAULTS} />);
    fireEvent.change(screen.getByLabelText("Scenario country"), {
      target: { value: "Canada" },
    });
    fireEvent.click(screen.getByText("Apply simulation"));
    await waitFor(() => {
      expect(screen.getByText("Scenario results")).toBeDefined();
    });
    expect(screen.getByText("RIT — MS Computer Science")).toBeDefined();
    expect(screen.getByText("#4 → #1")).toBeDefined();
    expect(screen.getByText("78 → 91 (+13)")).toBeDefined();
    expect(screen.getByText("Moved up")).toBeDefined();
    const [url, init] = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/students/s1/recommendations/simulate");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("resets back to baseline without further requests", async () => {
    mockFetchOnce(SIMULATION);
    render(<WhatIfPanel studentId="s1" defaults={DEFAULTS} />);
    fireEvent.change(screen.getByLabelText("Scenario country"), {
      target: { value: "Canada" },
    });
    fireEvent.click(screen.getByText("Apply simulation"));
    await waitFor(() => {
      expect(screen.getByText("Scenario results")).toBeDefined();
    });
    const calls = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.length;
    fireEvent.click(screen.getByText("Reset scenario"));
    expect(screen.queryByText("Scenario results")).toBeNull();
    expect(
      (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.length
    ).toBe(calls);
  });

  it("shows an error state when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
    render(<WhatIfPanel studentId="s1" defaults={DEFAULTS} />);
    fireEvent.change(screen.getByLabelText("Scenario country"), {
      target: { value: "Canada" },
    });
    fireEvent.click(screen.getByText("Apply simulation"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
  });

  it("requires at least one scenario value", async () => {
    mockFetchOnce(SIMULATION);
    render(<WhatIfPanel studentId="s1" defaults={DEFAULTS} />);
    fireEvent.click(screen.getByText("Apply simulation"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
