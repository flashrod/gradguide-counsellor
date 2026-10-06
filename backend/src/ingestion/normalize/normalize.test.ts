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
      inferredCurrency: true,
    });
  });

  it("parses total tuition without a period word", () => {
    expect(parseTuition("Tuition: $32,100 total")).toEqual({
      amount: 32100,
      currency: "USD",
      period: "total",
      inferredCurrency: true,
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

  it("prefers the international figure in home/international pairs", () => {
    expect(
      parseTuition("Home / international fees 2026/27 £11,800 / £19,450")
    ).toEqual({ amount: 19450, currency: "GBP", period: "total", inferredCurrency: false });
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

  it("uses 6-month semesters when asked (German convention)", () => {
    expect(parseDurationMonths("4 semesters full-time", 6)).toBe(24);
  });

  it("refuses to invent months from credit hours", () => {
    expect(parseDurationMonths("30 credit hours required")).toBeNull();
  });

  it("ignores employment history when looking for program length", () => {
    expect(
      parseDurationMonths("Relevant employment for 3 years or more in Computer Science.")
    ).toBeNull();
    expect(parseDurationMonths("3 years of relevant employment required.")).toBeNull();
  });

  it("still parses a program length stated next to experience text", () => {
    expect(
      parseDurationMonths("3 years of experience required. The program is 2 years long.")
    ).toBe(24);
  });

  it("ignores prerequisite undergraduate degree lengths (Wave 2.5: UTA)", () => {
    expect(
      parseDurationMonths("Applicants must have completed a 4-year bachelor's degree.")
    ).toBeNull();
    expect(
      parseDurationMonths("equivalent to a 4-year undergraduate degree required.")
    ).toBeNull();
  });

  it("never reads a bare deadline date as a duration", () => {
    expect(parseDurationMonths("Application deadline: February 1.")).toBeNull();
  });

  it("returns null when no duration is stated", () => {
    expect(parseDurationMonths("A flexible graduate program")).toBeNull();
  });

  it("prefers the earlier mention over pattern order (Wave 2: MScAC)", () => {
    expect(
      parseDurationMonths(
        "tuition and fees for the entire 16-month MScAC program are estimated. GRE scores are valid for 5 years from the test date."
      )
    ).toBe(16);
  });

  it("still prefers an explicitly standard duration over an earlier incidental one", () => {
    expect(
      parseDurationMonths(
        "GRE scores are valid for 5 years. Please contact the admissions office for details. The standard duration of the program is 2 years."
      )
    ).toBe(24);
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

  it("extracts reversed-order scores", () => {
    expect(parseIelts("79 TOEFL iBT / 6.5 IELTS")).toBe(6.5);
    expect(parseToefl("79 TOEFL iBT / 6.5 IELTS")).toBe(79);
  });

  it("ignores dates when looking for TOEFL scores", () => {
    expect(parseToefl("TOEFL taken before 01/21/2026: Minimum score of 80")).toBe(80);
  });

  it("ignores section scores stated after the number", () => {
    expect(
      parseToefl("minimum score of 24 on the speaking subsection")
    ).toBeNull();
    expect(parseIelts("IELTS: 6.5")).toBe(6.5);
  });

  it("ignores bare subsection scores without 'the' (Wave 2.5: York PTE)", () => {
    expect(parseToefl("PTE Academic 60 with 59 in Writing. TOEFL 4.5")).toBeNull();
  });

  it("ignores other exams leading in the number (Wave 2.5: PTE 60)", () => {
    expect(
      parseToefl(
        "with Merit in each component. PTE Academic. 60 with 52 in Listening. TOEFL. 4.5"
      )
    ).toBeNull();
  });

  it("ignores scores pinned to another test after the number (Wave 2.5: OEAI)", () => {
    expect(
      parseIelts(
        "or 8 on the speaking subsection of the IELTS. Students who are unable to take the iBT or IELTS are required to receive a minimum score of 5 on the OEAI Test, offered on campus."
      )
    ).toBeNull();
  });

  it("ignores worded dates", () => {
    expect(
      parseToefl("For exams taken on or after January 21, 2026: 79 TOEFL iBT")
    ).toBe(79);
  });

  it("attributes scores to the right exam in mixed listings", () => {
    const text = "Duolingo (DET): 130 IELTS: 6.5 PTE Academic: 60 TOEFL: 88";
    expect(parseIelts(text)).toBe(6.5);
    expect(parseToefl(text)).toBe(88);
  });

  it("does not match number prefixes", () => {
    expect(parseGpa("GPA of 8.4 on a 10-point scale")).toBeNull();
  });

  it("returns null when requirements are missing", () => {
    expect(parseGpa("Strong academic background expected")).toBeNull();
    expect(parseIelts("English proficiency required")).toBeNull();
    expect(parseToefl("English proficiency required")).toBeNull();
  });

  it("ignores administrative codes that look like scores (Wave 2)", () => {
    expect(
      parseToefl("TOEFL=Institution Code 0999; Department Code=78")
    ).toBeNull();
    expect(
      parseToefl("Test of English as a Foreign Language (TOEFL) — Department code: 78")
    ).toBeNull();
  });

  it("ignores codes in 'KEYWORD: number' form", () => {
    expect(parseToefl("Department codes: TOEFL: 78, IELTS: 6.5")).toBeNull();
    expect(parseIelts("Department codes: TOEFL: 78, IELTS: 6.5")).toBe(6.5);
  });

  it("ignores percent-suffixed numbers in 'KEYWORD: number' form", () => {
    expect(parseIelts("IELTS: 6.5%")).toBeNull();
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

  it("preserves German semester terms without mapping them to seasons", () => {
    expect(parseIntakes("Start: Winter Semester or Summer Semester")).toEqual([
      "Summer",
      "Winter",
    ]);
  });
});
