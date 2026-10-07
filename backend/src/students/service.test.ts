import "dotenv/config";

import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { closePool, db } from "../db/index.js";
import { students } from "../db/schema.js";
import { StudentNotFoundError } from "../recommendations/service.js";
import {
  createStudentProfile,
  updateStudentProfile,
} from "./service.js";

const runId = Date.now().toString(36);
const createdStudentIds: string[] = [];

async function trackStudent(name: string) {
  const profile = await createStudentProfile({ name });
  createdStudentIds.push(profile.id);
  return profile;
}

describe.skipIf(!process.env["DATABASE_URL"])("student profiles (live database)", () => {
  afterAll(async () => {
    for (const id of createdStudentIds) {
      await db.delete(students).where(eq(students.id, id));
    }
    await closePool();
  });

  it("updates only the supplied keys", async () => {
    const before = await trackStudent(`Update Me ${runId}`);
    expect(before.careerGoal).toBeNull();

    const after = await updateStudentProfile(before.id, {
      careerGoal: "ML engineer",
      preferredCountries: ["UK", "Canada"],
      workExperienceMonths: 12,
    });
    expect(after.id).toBe(before.id);
    expect(after.careerGoal).toBe("ML engineer");
    expect(after.preferredCountries).toEqual(["UK", "Canada"]);
    expect(after.workExperienceMonths).toBe(12);
    // Untouched fields stay as they were.
    expect(after.name).toBe(before.name);
  });

  it("stores counsellor-entered living costs", async () => {
    const profile = await trackStudent(`Rent ${runId}`);
    expect(profile.livingCostAmount).toBeNull();
    const after = await updateStudentProfile(profile.id, {
      livingCostAmount: 1200,
      livingCostCurrency: "GBP",
    });
    expect(after.livingCostAmount).toBe(1200);
    expect(after.livingCostCurrency).toBe("GBP");
  });

  it("accepts an empty patch as a no-op", async () => {    const profile = await trackStudent(`Noop ${runId}`);
    const after = await updateStudentProfile(profile.id, {});
    expect(after.id).toBe(profile.id);
    expect(after.name).toBe(profile.name);
  });

  it("rejects unknown students", async () => {
    await expect(
      updateStudentProfile("00000000-0000-4000-8000-000000000000", {
        careerGoal: "Nobody",
      })
    ).rejects.toThrow(StudentNotFoundError);
  });
});
