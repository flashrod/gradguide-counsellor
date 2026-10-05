import { describe, expect, it } from "vitest";

import { compareGpa, formatGpa, isValidGpa, normalizeGpa } from "./gpa.js";

describe("normalizeGpa", () => {
  it("normalizes 8.4/10 to 0.84", () => {
    expect(normalizeGpa({ value: 8.4, scale: 10 })).toBeCloseTo(0.84, 10);
  });

  it("normalizes 3.0/4 to 0.75", () => {
    expect(normalizeGpa({ value: 3.0, scale: 4 })).toBeCloseTo(0.75, 10);
  });

  it("returns null for null input", () => {
    expect(normalizeGpa(null)).toBeNull();
  });

  it("returns null for zero scale", () => {
    expect(normalizeGpa({ value: 3.0, scale: 0 })).toBeNull();
  });

  it("returns null for negative scale", () => {
    expect(normalizeGpa({ value: 3.0, scale: -4 })).toBeNull();
  });

  it("returns null for NaN value", () => {
    expect(normalizeGpa({ value: NaN, scale: 4 })).toBeNull();
  });

  it("returns null for negative value", () => {
    expect(normalizeGpa({ value: -1, scale: 4 })).toBeNull();
  });
});

describe("compareGpa", () => {
  it("8.4/10 satisfies 3.0/4 (0.84 >= 0.75)", () => {
    expect(
      compareGpa({ value: 8.4, scale: 10 }, { value: 3.0, scale: 4 })
    ).toBe("pass");
  });

  it("7.0/10 does not satisfy 3.0/4 (0.70 < 0.75)", () => {
    expect(
      compareGpa({ value: 7.0, scale: 10 }, { value: 3.0, scale: 4 })
    ).toBe("fail");
  });

  it("3.5/4 satisfies 3.0/4", () => {
    expect(
      compareGpa({ value: 3.5, scale: 4 }, { value: 3.0, scale: 4 })
    ).toBe("pass");
  });

  it("passes on the exact normalized threshold", () => {
    expect(
      compareGpa({ value: 7.5, scale: 10 }, { value: 3.0, scale: 4 })
    ).toBe("pass");
  });

  it("fails below the threshold", () => {
    expect(
      compareGpa({ value: 2.9, scale: 4 }, { value: 3.0, scale: 4 })
    ).toBe("fail");
  });

  it("is unknown when the student scale is missing", () => {
    expect(compareGpa(null, { value: 3.0, scale: 4 })).toBe("unknown");
  });

  it("is unknown when the course scale is missing", () => {
    expect(
      compareGpa({ value: 8.4, scale: 10 }, { value: 3.0, scale: null })
    ).toBe("unknown");
  });

  it("is unknown for a malformed scale", () => {
    expect(
      compareGpa({ value: 3.0, scale: 0 }, { value: 3.0, scale: 4 })
    ).toBe("unknown");
  });

  it("passes when the course has no minimum", () => {
    expect(compareGpa(null, null)).toBe("pass");
  });
});

describe("formatGpa", () => {
  it("preserves the original value and scale", () => {
    expect(formatGpa({ value: 8.4, scale: 10 })).toBe("8.4/10");
    expect(formatGpa({ value: 3.0, scale: 4 })).toBe("3/4");
  });

  it("renders unknown for missing data", () => {
    expect(formatGpa(null)).toBe("unknown");
  });

  it("exposes validity checking", () => {
    expect(isValidGpa({ value: 3.0, scale: 4 })).toBe(true);
    expect(isValidGpa({ value: 3.0, scale: 0 })).toBe(false);
    expect(isValidGpa(null)).toBe(false);
  });
});
