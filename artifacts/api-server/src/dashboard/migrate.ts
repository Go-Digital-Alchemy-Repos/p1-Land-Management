import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { pool, transaction } from "./database";
if (!process.env.DASHBOARD_DATABASE_URL)
  throw new Error("DASHBOARD_DATABASE_URL is required");
try {
  await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(918277)");
    await c.query(
      "CREATE TABLE IF NOT EXISTS dashboard_migration (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const dir = resolve(
      process.env.DASHBOARD_MIGRATIONS_DIR || "migrations/dashboard",
    );
    for (const name of (await readdir(dir))
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      const sql = await readFile(resolve(dir, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const old = await c.query(
        "SELECT checksum FROM dashboard_migration WHERE name=$1",
        [name],
      );
      if (old.rowCount) {
        if (old.rows[0].checksum !== checksum)
          throw new Error(`Migration changed: ${name}`);
        continue;
      }
      await c.query(sql);
      await c.query(
        "INSERT INTO dashboard_migration(name,checksum) VALUES($1,$2)",
        [name, checksum],
      );
      console.log(`Applied ${name}`);
    }
  });
} finally {
  await pool.end();
}
