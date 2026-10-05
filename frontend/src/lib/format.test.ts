import { describe, expect, it } from "vitest";

import {
  formatBudget,
  formatCost,
  formatGpa,
  formatTestScore,
  formatVerifiedDate,
} from "./format";

describe("formatGpa", () => {
  it("preserves the original value and scale", () => {
    expect(formatGpa({ value: 8.4, scale: 10 })).toBe("8.4 / 10");
  });

  it("renders Unknown when value or scale is missing", () => {
    expect(formatGpa({ value: null, scale: 10 })).toBe("Unknown");
    expect(formatGpa({ value: 3.0, scale: null })).toBe("Unknown");
  });
});

describe("formatCost", () => {
  it("formats a known estimate", () => {
    expect(formatCost({ amount: 40500, currency: "GBP" })).toBe(
      "GBP 40,500 (est. total)"
    );
  });

  it("never renders unknown cost as zero", () => {
    expect(formatCost(null)).toBe("Unknown");
    expect(formatCost(null)).not.toContain("0");
  });
});

describe("formatBudget", () => {
  it("formats a known budget", () => {
    expect(formatBudget(3500000, "INR")).toBe("INR 3,500,000 (max total)");
  });

  it("renders Unknown when budget is missing", () => {
    expect(formatBudget(null, "INR")).toBe("Unknown");
    expect(formatBudget(1000, null)).toBe("Unknown");
  });
});

describe("formatTestScore", () => {
  it("renders the score or Unknown", () => {
    expect(formatTestScore(7.5)).toBe("7.5");
    expect(formatTestScore(null)).toBe("Unknown");
  });
});

describe("formatVerifiedDate", () => {
  it("formats an ISO date", () => {
    expect(formatVerifiedDate("2026-10-05T00:00:00.000Z")).toBe("Oct 5, 2026");
  });

  it("renders Unknown for garbage input", () => {
    expect(formatVerifiedDate("not-a-date")).toBe("Unknown");
  });
});
