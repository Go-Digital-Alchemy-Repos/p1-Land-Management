import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./db";
import { logger } from "./utils/logger";
import path from "node:path";

/** P1 uses a fresh dedicated database, never upstream legacy reconciliation. */
export async function runMigrations() {
  const migrationsFolder = path.resolve(
    process.env.NODE_ENV === "production" ? __dirname : process.cwd(),
    "p1-migrations",
  );
  await migrate(db, { migrationsFolder });
  logger.app.info("P1 database migrations completed");
}
