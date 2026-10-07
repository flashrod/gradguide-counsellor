import "dotenv/config";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { auth } from "../auth.js";
import { closePool, db } from "../db/index.js";
import { authUser, students, visaChecklist } from "../db/schema.js";
import { StudentNotFoundError } from "../recommendations/service.js";
import { createStudentProfile } from "../students/service.js";
import { getVisaChecklist, setVisaStep } from "./service.js";

const runId = Date.now().toString(36);
const email = `visa-${runId}@gradguide.local`;
let counsellorId = "";
let studentId = "";

describe.skipIf(!process.env["DATABASE_URL"])("visa checklist (live database)", () => {
  beforeAll(async () => {
    counsellorId = (
      await auth.api.signUpEmail({
        body: { email, password: "test-password-1", name: email },
      })
    ).user.id;
    studentId = (await createStudentProfile({ name: `Visa ${runId}` })).id;
  });

  afterAll(async () => {
    await db.delete(visaChecklist).where(eq(visaChecklist.counsellorId, counsellorId));
    await db.delete(students).where(eq(students.id, studentId));
    await db.delete(authUser).where(eq(authUser.email, email));
    await closePool();
  });

  it("starts all steps unchecked for every guide country", async () => {
    const countries = await getVisaChecklist(counsellorId, studentId, []);
    expect(countries.map((c) => c.country)).toEqual(["UK", "USA", "Canada", "Germany"]);
    for (const country of countries) {
      expect(country.doneCount).toBe(0);
      expect(country.steps.length).toBeGreaterThan(0);
      expect(country.steps.every((s) => !s.done)).toBe(true);
    }
  });

  it("toggles one step without touching the others", async () => {
    const after = await setVisaStep(counsellorId, studentId, "UK", "cas", true);
    const uk = after.find((c) => c.country === "UK");
    expect(uk?.doneCount).toBe(1);
    expect(uk?.steps.find((s) => s.key === "cas")?.done).toBe(true);
    const usa = after.find((c) => c.country === "USA");
    expect(usa?.doneCount).toBe(0);
  });

  it("rejects unknown students and steps", async () => {
    await expect(
      getVisaChecklist(counsellorId, "00000000-0000-4000-8000-000000000000", [])
    ).rejects.toThrow(StudentNotFoundError);
    await expect(
      setVisaStep(counsellorId, studentId, "UK", "nope", true)
    ).rejects.toThrow();
  });
});
