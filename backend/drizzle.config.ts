import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // drizzle-kit migrate/push read DATABASE_URL from the environment.
    // eslint-disable-next-line no-process-env
    url: process.env["DATABASE_URL"] ?? "",
  },
});
