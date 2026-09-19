import { afterAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, writeFile, mkdir, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
const fixture = vi.hoisted(() => ({ url: process.env.CMS_MIGRATION_TEST_DATABASE_URL }));
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
      !/test|fixture|acceptance/.test(url.pathname)
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
      const previous = journal.entries.filter((entry: { idx: number }) => entry.idx < 3);
      expect(previous.map((entry: { tag: string }) => entry.tag)).toEqual([
        "0000_p1_foundation",
        "0001_commercial_handoff",
        "0002_identity_federation",
      ]);
      await mkdir(path.join(folder, "meta"));
      await writeFile(
        path.join(folder, "meta/_journal.json"),
        JSON.stringify({ ...journal, entries: previous }),
      );
      for (const entry of previous)
        await copyFile(path.join(root, entry.tag + ".sql"), path.join(folder, entry.tag + ".sql"));
      await migrate(db, { migrationsFolder: folder });
      expect((await pool.query("SELECT * FROM drizzle.__drizzle_migrations")).rowCount).toBe(3);
      await pool.query(
        "INSERT INTO cms_pages(id,title,slug,content) VALUES ('legacy-page','Retained page','retained','{\"blocks\":[]}'); INSERT INTO cms_menus(id,name,items) VALUES ('legacy-menu','Retained menu','[]'); INSERT INTO editor_locks(id,resource_type,resource_id,locked_by_user_id,locked_by_name,expires_at) VALUES ('legacy-lock','cms_page','legacy-page','fixture-user','Retained editor',clock_timestamp()+interval '5 minutes')",
      );
      await runMigrations();
      await runMigrations();
      expect((await pool.query("SELECT * FROM drizzle.__drizzle_migrations")).rowCount).toBe(4);
      expect(
        (await pool.query("SELECT title,version,content FROM cms_pages WHERE id='legacy-page'"))
          .rows[0],
      ).toEqual({ title: "Retained page", version: 1, content: { blocks: [] } });
      expect(
        (await pool.query("SELECT name,version,items FROM cms_menus WHERE id='legacy-menu'"))
          .rows[0],
      ).toEqual({ name: "Retained menu", version: 1, items: [] });
      expect(
        (
          await pool.query(
            "SELECT locked_by_name,editor_instance_id FROM editor_locks WHERE id='legacy-lock'",
          )
        ).rows[0],
      ).toEqual({ locked_by_name: "Retained editor", editor_instance_id: null });
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  }, 30000);
});
