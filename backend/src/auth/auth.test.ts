import "dotenv/config";

import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { auth } from "../auth.js";
import { closePool, db } from "../db/index.js";
import { authUser } from "../db/schema.js";

/**
 * Authentication behavior tests (Milestone 11). Exercise the real
 * better-auth email+password flow: sign-up, sign-in, session resolution,
 * invalid credentials, logout. No mocks.
 */

const runId = Date.now().toString(36);
const email = `auth-behavior-${runId}@gradguide.local`;
const password = "behavior-password-1";

describe.skipIf(!process.env["DATABASE_URL"])("authentication (live database)", () => {
  afterAll(async () => {
    await db.delete(authUser).where(eq(authUser.email, email));
    await closePool();
  });

  it("signs up a counsellor with an id, email, and name", async () => {
    const result = await auth.api.signUpEmail({
      body: { email, password, name: "Behavior Counsellor" },
    });
    expect(result.user.id).toBeTypeOf("string");
    expect(result.user.email).toBe(email);
    expect(result.user.name).toBe("Behavior Counsellor");
  });

  it("rejects duplicate registration", async () => {
    await expect(
      auth.api.signUpEmail({ body: { email, password, name: "Dup" } })
    ).rejects.toThrow();
  });

  it("signs in and resolves the session identity from the cookie", async () => {
    const response = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("session_token");
    const headers = new Headers();
    headers.set("cookie", (setCookie ?? "").split(";")[0] ?? "");
    const session = await auth.api.getSession({ headers });
    expect(session?.user.email).toBe(email);
    expect(session?.user.id).toBeTypeOf("string");
    expect(session?.user.name).toBe("Behavior Counsellor");
  });

  it("rejects invalid credentials", async () => {
    await expect(
      auth.api.signInEmail({ body: { email, password: "wrong-password-1" } })
    ).rejects.toThrow();
  });

  it("resolves no session without a cookie", async () => {
    expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
  });

  it("destroys the session on logout", async () => {
    const response = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });
    const headers = new Headers();
    headers.set(
      "cookie",
      (response.headers.get("set-cookie") ?? "").split(";")[0] ?? ""
    );
    expect(await auth.api.getSession({ headers })).not.toBeNull();
    await auth.api.signOut({ headers });
    expect(await auth.api.getSession({ headers })).toBeNull();
  });
});
