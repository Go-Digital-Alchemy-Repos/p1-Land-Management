import { defineConfig } from "drizzle-kit";
import { loadLocalEnv } from "./server/load-env";

loadLocalEnv();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Add it to .env or export it before running db commands.");
}

export default defineConfig({
  out: "./p1-migrations",
  schema: "./shared/p1-database-schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
