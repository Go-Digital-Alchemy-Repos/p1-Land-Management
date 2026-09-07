import { pool } from "../db";
import { runMigrations } from "../migrate";

try {
  await runMigrations();
  console.log("Migration verification completed successfully.");
} finally {
  await pool.end();
}
