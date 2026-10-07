import "dotenv/config";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { auth } from "../auth.js";
import { closePool, db } from "../db/index.js";
import { authUser, deadlines } from "../db/schema.js";
import { StudentNotFoundError } from "../recommendations/service.js";
import {
  createDeadline,
  DeadlineNotFoundError,
  deleteDeadline,
  listDeadlines,
  setDeadlineDone,
} from "./service.js";

const runId = Date.now().toString(36);
const emailA = `deadlines-a-${runId}@gradguide.local`;
const emailB = `deadlines-b-${runId}@gradguide.local`;
let COUNSELLOR_A = "";
let COUNSELLOR_B = "";
const createdIds: string[] = [];

describe.skipIf(!process.env["DATABASE_URL"])("deadlines (live database)", () => {
  beforeAll(async () => {
    COUNSELLOR_A = (
      await auth.api.signUpEmail({
        body: { email: emailA, password: "test-password-1", name: emailA },
      })
    ).user.id;
    COUNSELLOR_B = (
      await auth.api.signUpEmail({
        body: { email: emailB, password: "test-password-1", name: emailB },
      })
    ).user.id;
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await db.delete(deadlines).where(eq(deadlines.id, id));
    }
    await db.delete(authUser).where(eq(authUser.email, emailA));
    await db.delete(authUser).where(eq(authUser.email, emailB));
    await closePool();
  });

  it("creates and lists the counsellor's own reminders, soonest first", async () => {
    const first = await createDeadline(COUNSELLOR_A, {
      title: `Later ${runId}`,
      dueDate: "2027-06-01",
    });
    const second = await createDeadline(COUNSELLOR_A, {
      title: `Sooner ${runId}`,
      dueDate: "2027-01-15",
      note: "Bring transcripts",
    });
    createdIds.push(first.id, second.id);

    const listed = await listDeadlines(COUNSELLOR_A);
    const titles = listed.map((d) => d.title);
    expect(titles).toContain(`Sooner ${runId}`);
    expect(titles).toContain(`Later ${runId}`);
    expect(titles.indexOf(`Sooner ${runId}`)).toBeLessThan(
      titles.indexOf(`Later ${runId}`)
    );
    expect(second.note).toBe("Bring transcripts");
    expect(second.done).toBe(false);
  });

  it("never leaks reminders across counsellors", async () => {
    await expect(
      setDeadlineDone(COUNSELLOR_B, createdIds[0] as string, true)
    ).rejects.toThrow(DeadlineNotFoundError);
    await expect(
      deleteDeadline(COUNSELLOR_B, createdIds[0] as string)
    ).rejects.toThrow(DeadlineNotFoundError);
    expect(await listDeadlines(COUNSELLOR_B)).toEqual([]);
  });

  it("marks done and deletes", async () => {
    const deletedId = createdIds[0] as string;
    const done = await setDeadlineDone(COUNSELLOR_A, deletedId, true);
    expect(done.done).toBe(true);
    await deleteDeadline(COUNSELLOR_A, deletedId);
    createdIds.shift();
    const listed = await listDeadlines(COUNSELLOR_A);
    expect(listed.map((d) => d.id)).not.toContain(deletedId);
  });

  it("rejects unknown students", async () => {
    await expect(
      createDeadline(COUNSELLOR_A, {
        title: `Nobody ${runId}`,
        dueDate: "2027-03-01",
        studentId: "00000000-0000-4000-8000-000000000000",
      })
    ).rejects.toThrow(StudentNotFoundError);
  });
});
