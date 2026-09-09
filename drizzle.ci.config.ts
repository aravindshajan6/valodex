import { defineConfig } from "drizzle-kit";

// CI-only: non-interactive so `drizzle-kit push` applies the (additive) schema
// to the throwaway Postgres without waiting for a confirmation prompt.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: false,
  verbose: false,
});
