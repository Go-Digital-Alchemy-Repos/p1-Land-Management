import { afterAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, writeFile, mkdir, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
const fixture = vi.hoisted(() => ({ url: process.env.CMS_SECTION_MIGRATION_TEST_DATABASE_URL }));
vi.mock("../db", async () => {
  const pg = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new pg.default.Pool({ connectionString: fixture.url });
  return { db: drizzle(pool), pool };
});
import { db, pool } from "../db";
import { runMigrations } from "../migrate";
const suite = fixture.url ? describe : describe.skip;
suite("actual P1 migration runner on fresh isolated PostgreSQL", () => {
  afterAll(async () => {
    await pool.end();
  });
  it("upgrades the prior P1 journal before reads, preserves records and is idempotent", async () => {
    const url = new URL(fixture.url!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.pathname !== "/sections_migration_test"
    )
      throw new Error("Loopback named fixture database required");
    const count = (
      await pool.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public'")
    ).rows[0].count;
    if (count !== 0)
      throw new Error("This migration acceptance test requires a fresh disposable database");
    const folder = await mkdtemp(path.join(tmpdir(), "p1-cms-migration-fixture-"));
    try {
      const root = path.resolve("p1-migrations");
      const journal = JSON.parse(await readFile(path.join(root, "meta/_journal.json"), "utf8"));
      const previous = journal.entries.filter((entry: { idx: number }) => entry.idx < 7);
      expect(previous).toHaveLength(7);
      await mkdir(path.join(folder, "meta"));
      await writeFile(
        path.join(folder, "meta/_journal.json"),
        JSON.stringify({ ...journal, entries: previous }),
      );
      for (const entry of previous)
        await copyFile(path.join(root, entry.tag + ".sql"), path.join(folder, entry.tag + ".sql"));
      await migrate(db, { migrationsFolder: folder });
      expect((await pool.query("SELECT * FROM drizzle.__drizzle_migrations")).rowCount).toBe(7);
      await pool.query(
        "INSERT INTO cms_sections(id,name,blocks) VALUES ('legacy-section','Retained section','[{\"unknown\":true}]')",
      );
      await runMigrations();
      await runMigrations();
      expect((await pool.query("SELECT * FROM drizzle.__drizzle_migrations")).rowCount).toBe(
        journal.entries.length,
      );
      expect(
        (await pool.query("SELECT name,version,blocks FROM cms_sections WHERE id='legacy-section'"))
          .rows[0],
      ).toEqual({ name: "Retained section", version: 1, blocks: [{ unknown: true }] });
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  }, 30000);
});
