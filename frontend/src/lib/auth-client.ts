import { createAuthClient } from "better-auth/client";

/**
 * better-auth client (Milestone 11). Points at the backend Express
 * instance, which owns sessions and cookies. No auth logic lives here —
 * sign-in/out and useSession all round-trip to the backend.
 */
export const authClient = createAuthClient({
  // Same-origin proxy (see next.config.ts rewrites): the browser never
  // talks to the backend domain directly, so auth cookies are first-party.
  // better-auth requires an absolute URL, hence window.location.origin.
  // The server-side fallback below only runs during prerendering, where
  // no request is ever made.
  baseURL:
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth`
      : (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000"),
});

export const { signIn, signUp, signOut, useSession } = authClient;
