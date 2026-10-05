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
    minPasswordLength: 8,
  },
  advanced: {
    cookiePrefix: "gradguide",
  },
});

export type Auth = typeof auth;
