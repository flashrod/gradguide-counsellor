import { describe, expect, it } from "vitest";

import {
  compareIntakes,
  isOpenIntakeText,
  normalizeIntake,
} from "./intake.js";

describe("normalizeIntake", () => {
  it("parses a bare season", () => {
    expect(normalizeIntake("Fall")).toEqual({
      season: "Fall",
      month: null,
      year: null,
      open: false,
      label: null,
    });
  });

  it("parses season with year", () => {
    expect(normalizeIntake("Fall 2027")).toEqual({
      season: "Fall",
      month: null,
      year: 2027,
      open: false,
      label: null,
    });
  });

  it("maps September 2027 to Fall", () => {
    expect(normalizeIntake("September 2027")).toEqual({
      season: "Fall",
      month: 9,
      year: 2027,
      open: false,
      label: null,
    });
  });

  it("maps January to Winter without a year", () => {
    expect(normalizeIntake("January")).toMatchObject({ season: "Winter", month: 1 });
  });

  it("detects rolling intake", () => {
    expect(normalizeIntake("Rolling admissions")).toMatchObject({ open: true });
    expect(normalizeIntake("Applications accepted throughout the year")).toMatchObject({
      open: true,
    });
  });

  it("returns null for unparseable text", () => {
    expect(normalizeIntake("Contact the department")).toBeNull();
  });

  it("detects open-intake phrasing", () => {
    expect(isOpenIntakeText("Year-round entry")).toBe(true);
    expect(isOpenIntakeText("Fall entry")).toBe(false);
  });

  it("maps Winter Semester to Winter without losing the label", () => {
    expect(normalizeIntake("Winter Semester")).toMatchObject({
      season: "Winter",
      label: "Winter Semester",
    });
  });

  it("recognizes Semester 1 without claiming a season", () => {
    expect(normalizeIntake("Semester 1")).toMatchObject({
      season: null,
      label: "Semester 1",
    });
  });
});

describe("compareIntakes", () => {
  it("Fall matches Fall", () => {
    expect(compareIntakes("Fall", "Fall")).toBe("match");
  });

  it("Spring does not match Fall", () => {
    expect(compareIntakes("Spring", "Fall")).toBe("mismatch");
  });

  it("Fall 2027 matches Fall", () => {
    expect(compareIntakes("Fall 2027", "Fall")).toBe("match");
  });

  it("September 2027 matches Fall", () => {
    expect(compareIntakes("September 2027", "Fall")).toBe("match");
  });

  it("September matches September", () => {
    expect(compareIntakes("September", "September")).toBe("match");
  });

  it("September does not match Spring", () => {
    expect(compareIntakes("September", "Spring")).toBe("mismatch");
  });

  it("mismatching years do not match", () => {
    expect(compareIntakes("Fall 2027", "Fall 2028")).toBe("mismatch");
  });

  it("rolling intake matches everything", () => {
    expect(compareIntakes("Spring", "Rolling admissions")).toBe("match");
  });

  it("unparseable entries are unknown", () => {
    expect(compareIntakes("Fall", "Contact us")).toBe("unknown");
  });

  it("matches identical non-standard terms", () => {
    expect(compareIntakes("Semester 1", "Semester 1")).toBe("match");
  });

  it("does not match different non-standard terms", () => {
    expect(compareIntakes("Semester 1", "Semester 2")).toBe("unknown");
  });
});
