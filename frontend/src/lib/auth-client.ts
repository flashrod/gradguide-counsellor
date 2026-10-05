import { createAuthClient } from "better-auth/client";

/**
 * better-auth client (Milestone 11). Points at the backend Express
 * instance, which owns sessions and cookies. No auth logic lives here —
 * sign-in/out and useSession all round-trip to the backend.
 */
export const authClient = createAuthClient({
  baseURL:
    process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000",
});

export const { signIn, signOut, useSession } = authClient;
