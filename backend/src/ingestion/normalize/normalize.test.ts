import { describe, expect, it } from "vitest";

import { parseDurationMonths } from "./duration.js";
import { parseIntakes } from "./intake.js";
import {
  parseGpa,
  parseIelts,
  parseToefl,
  parseWorkExperienceMonths,
} from "./requirements.js";
import { parseTuition } from "./tuition.js";

describe("parseTuition", () => {
  it("parses annual tuition", () => {
    expect(parseTuition("$50,000 per year")).toEqual({
      amount: 50000,
      currency: "USD",
      period: "annual",
    });
  });

  it("parses total tuition without a period word", () => {
    expect(parseTuition("Tuition: $32,100 total")).toEqual({
      amount: 32100,
      currency: "USD",
      period: "total",
    });
  });

  it("parses semester tuition", () => {
    expect(parseTuition("$12,000 per semester")).toMatchObject({
      amount: 12000,
      period: "semester",
    });
  });

  it("parses monthly costs", () => {
    expect(parseTuition("$1,350 per month")).toMatchObject({
      amount: 1350,
      period: "monthly",
    });
  });

  it("flags per-credit pricing separately", () => {
    expect(parseTuition("$1,800 per credit hour")).toMatchObject({
      amount: 1800,
      period: "per-credit",
    });
  });

  it("recognizes GBP symbols", () => {
    expect(parseTuition("£28,500 per year")).toMatchObject({
      currency: "GBP",
    });
  });

  it("returns null when no amount is present", () => {
    expect(parseTuition("Tuition varies by program")).toBeNull();
  });

  it("returns null for malformed values", () => {
    expect(parseTuition("$$$ per year")).toBeNull();
  });
});

describe("parseDurationMonths", () => {
  it("converts years to months", () => {
    expect(parseDurationMonths("typically completed in 2 years")).toBe(24);
  });

  it("parses months directly", () => {
    expect(parseDurationMonths("16-month program")).toBe(16);
  });

  it("converts semesters at 4 months each", () => {
    expect(parseDurationMonths("4 semesters full-time")).toBe(16);
  });

  it("refuses to invent months from credit hours", () => {
    expect(parseDurationMonths("30 credit hours required")).toBeNull();
  });

  it("returns null when no duration is stated", () => {
    expect(parseDurationMonths("A flexible graduate program")).toBeNull();
  });
});

describe("requirements parsing", () => {
  it("extracts GPA", () => {
    expect(parseGpa("A minimum cumulative GPA of 3.0 is recommended")).toBe(3.0);
  });

  it("rejects out-of-range GPA text", () => {
    expect(parseGpa("GPA of 8.4 on a 10-point scale")).toBeNull();
  });

  it("extracts IELTS", () => {
    expect(parseIelts("IELTS: 6.5")).toBe(6.5);
  });

  it("extracts TOEFL", () => {
    expect(parseToefl("TOEFL: 88")).toBe(88);
  });

  it("returns null when requirements are missing", () => {
    expect(parseGpa("Strong academic background expected")).toBeNull();
    expect(parseIelts("English proficiency required")).toBeNull();
    expect(parseToefl("English proficiency required")).toBeNull();
  });

  it("extracts work-experience years as months", () => {
    expect(
      parseWorkExperienceMonths("2 years of work experience required")
    ).toBe(24);
  });
});

describe("parseIntakes", () => {
  it("parses Fall and Spring", () => {
    expect(parseIntakes("Admit terms: Fall or Spring")).toEqual(["Fall", "Spring"]);
  });

  it("returns an empty list when no intake is stated", () => {
    expect(parseIntakes("Applications are reviewed on a rolling basis")).toEqual([]);
  });
});
