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
    });
  });

  it("parses season with year", () => {
    expect(normalizeIntake("Fall 2027")).toEqual({
      season: "Fall",
      month: null,
      year: 2027,
      open: false,
    });
  });

  it("maps September 2027 to Fall", () => {
    expect(normalizeIntake("September 2027")).toEqual({
      season: "Fall",
      month: 9,
      year: 2027,
      open: false,
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
});
