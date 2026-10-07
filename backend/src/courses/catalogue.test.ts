import "dotenv/config";

import { afterAll, describe, expect, it } from "vitest";

import { closePool } from "../db/index.js";
import { catalogueFacets, listCatalogue } from "../courses/details.js";

describe.skipIf(!process.env["DATABASE_URL"])("catalogue listing (live database)", () => {
  afterAll(async () => {
    await closePool();
  });

  it("filters by country without leaking others", async () => {
    const { total, courses } = await listCatalogue({ country: "UK", limit: 200 });
    expect(total).toBeGreaterThan(0);
    expect(courses.length).toBe(total);
    expect(courses.every((c) => c.country === "UK")).toBe(true);
  });

  it("searches across course and university names", async () => {
    const { courses } = await listCatalogue({ search: "Rochester", limit: 200 });
    expect(courses.length).toBeGreaterThan(0);
    expect(
      courses.every(
        (c) =>
          c.universityName.includes("Rochester") ||
          c.courseName.includes("Rochester")
      )
    ).toBe(true);
  });

  it("combines filters and paginates", async () => {
    const first = await listCatalogue({ country: "USA", limit: 2, offset: 0 });
    const second = await listCatalogue({ country: "USA", limit: 2, offset: 2 });
    expect(first.courses).toHaveLength(2);
    const ids = new Set(first.courses.map((c) => c.id));
    for (const course of second.courses) {
      expect(ids.has(course.id)).toBe(false);
    }
  });

  it("exposes facet values covering both countries", async () => {
    const facets = await catalogueFacets();
    expect(facets.countries).toContain("USA");
    expect(facets.countries).toContain("UK");
    expect(facets.degrees.length).toBeGreaterThan(0);
    expect(facets.fields.length).toBeGreaterThan(0);
  });

  it("reports a total consistent with the listing", async () => {
    const facets = await catalogueFacets();
    const listed = await listCatalogue({});
    expect(facets.total).toBe(listed.total);
    expect(facets.total).toBeGreaterThan(0);
  });
});
