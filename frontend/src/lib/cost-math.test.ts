import { describe, expect, it } from "vitest";

import { normalizeTotal, splitCosts } from "./cost-math";

describe("cost math", () => {
  it("annualizes tuition by ceiling years", () => {
    expect(normalizeTotal(28500, "annual", 12)).toBe(28500);
    expect(normalizeTotal(28500, "annual", 16)).toBe(57000);
  });

  it("scales semesters and months", () => {
    expect(normalizeTotal(10000, "semester", 12)).toBe(20000);
    expect(normalizeTotal(1350, "monthly", 12)).toBe(16200);
    expect(normalizeTotal(24300, "total", 16)).toBe(24300);
  });

  it("returns null instead of fabricating", () => {
    expect(normalizeTotal(28500, "annual", null)).toBeNull();
    expect(normalizeTotal(null, "annual", 12)).toBeNull();
    expect(normalizeTotal(28500, "per-credit", 12)).toBeNull();
    expect(normalizeTotal(-5, "total", 12)).toBeNull();
  });

  it("splits tuition and living, totals single-currency only", () => {
    const split = splitCosts({
      tuitionAmount: 28500,
      tuitionCurrency: "GBP",
      tuitionPeriod: "annual",
      livingCostAmount: 1000,
      livingCostCurrency: "GBP",
      livingCostPeriod: "monthly",
      durationMonths: 12,
    });
    expect(split).toEqual({
      tuition: 28500,
      tuitionCurrency: "GBP",
      living: 12000,
      livingCurrency: "GBP",
      total: 40500,
      totalCurrency: "GBP",
    });
  });

  it("withholds the total on mixed currencies", () => {
    const split = splitCosts({
      tuitionAmount: 28500,
      tuitionCurrency: "GBP",
      tuitionPeriod: "annual",
      livingCostAmount: 12000,
      livingCostCurrency: "CAD",
      livingCostPeriod: "annual",
      durationMonths: 12,
    });
    expect(split.tuition).toBe(28500);
    expect(split.living).toBe(12000);
    expect(split.total).toBeNull();
  });
});
