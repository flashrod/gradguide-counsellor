import { betterAuth } from "better-auth";

import { pool } from "./db/index.js";
import { loadEnv } from "./env.js";

/**
 * better-auth instance (Milestone 11). Email + password only — no OAuth,
 * no roles, no multi-tenancy. Mounted on the Express app; the Next.js
 * frontend talks to it over HTTP (same-site localhost cookies).
 *
 * Secrets come from the environment (see backend/.env.example).
 * Never hardcode credentials here.
 */

const env = loadEnv();

export const auth = betterAuth({
  database: pool,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.FRONTEND_URL],
  emailAndPassword: {
    enabled: true,
    // 6 keeps short demo passwords working; counsellor accounts are
    // created out-of-band, never via public signup.
    minPasswordLength: 6,
  },
  advanced: {
    cookiePrefix: "gradguide",
    defaultCookieAttributes: {
      sameSite: env.BETTER_AUTH_URL.startsWith("https://") ? "none" : "lax",
      secure: env.BETTER_AUTH_URL.startsWith("https://"),
    },
  },
});

export type Auth = typeof auth;
