import { gunzipSync } from "zlib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Opt in only with a disposable local database; never use DATABASE_URL or .env.
const testUrl = process.env.BACKUP_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/core_backup_test"
  ) {
    throw new Error("BACKUP_TEST_DATABASE_URL must target local disposable core_backup_test");
  }
}

vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({ connectionString: process.env.BACKUP_TEST_DATABASE_URL, max: 6 });
  return { pool, db: drizzle(pool, { schema }) };
});
vi.mock("../utils/logger", () => ({
  logger: {
    backup: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    app: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    db: { warn: vi.fn() },
  },
}));
vi.mock("./backup-storage.service", () => ({
  beginBackupStorageOperation: vi.fn(),
  deleteBackupObject: vi.fn(),
  downloadBackupObject: vi.fn(),
  getBackupStorageInfo: vi.fn(),
  isBackupStorageConfigured: vi.fn(),
  listBackupObjects: vi.fn(),
  uploadBackupObject: vi.fn(),
}));

vi.mock("../storage", async () => {
  const { SettingsStorage } = await import("../storage/settings.storage");
  return { storage: { settings: new SettingsStorage() } };
});

// The application uses both directory and explicit-index imports for this singleton.
vi.mock("../storage/index", async () => import("../storage"));

import { pool } from "../db";
import * as storage from "./backup-storage.service";
import {
  restoreBackupSnapshot,
  runSystemBackup,
} from "./system-backup.service";

type Snapshot = Parameters<typeof restoreBackupSnapshot>[0];

function exportedSnapshot(): Snapshot {
  const call = vi
    .mocked(storage.uploadBackupObject)
    .mock.calls.find(([key]) => key.startsWith("db/"));
  if (!call) throw new Error("No uploaded snapshot");
  return JSON.parse(gunzipSync(call[1]).toString("utf8")) as Snapshot;
}

import { readFileSync } from "node:fs";
describe.skipIf(!testUrl)("Blog publication system backup recovery on PostgreSQL", () => {
  beforeAll(async () => {
    vi.stubEnv("CLIENT_STACK_ID", "backup-test");
    vi.mocked(storage.beginBackupStorageOperation).mockResolvedValue({
      source: "env",
      bucketName: "test",
      prefix: "test",
    });
    vi.mocked(storage.isBackupStorageConfigured).mockResolvedValue(true);
    vi.mocked(storage.getBackupStorageInfo).mockResolvedValue({
      source: "env",
      bucketName: "test",
      prefix: "test",
    });
    vi.mocked(storage.listBackupObjects).mockResolvedValue([]);
    vi.mocked(storage.uploadBackupObject).mockImplementation(async (key) => ({ key }));
    const tables = (await pool.query("SELECT * FROM pg_tables WHERE schemaname='public'")).rows;
    if (tables.length) throw new Error("Fresh empty disposable core_backup_test required");
    await pool.query(
      "CREATE TABLE blog_posts(id text PRIMARY KEY, content text); INSERT INTO blog_posts VALUES ('legacy','Retained legacy content')",
    );
    await pool.query(
      readFileSync(
        new URL("../../p1-migrations/0004_blog_publications.sql", import.meta.url),
        "utf8",
      ),
    );
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "INSERT INTO blog_publication_state(post_id,version,draft_revision_id,published_revision_id,last_published_revision_id,publication_generation,visibility,legacy_fingerprint) VALUES ('published',2,'r1','r2','r2',1,'published','fingerprint'),('withdrawn',3,'r3',NULL,'r4',2,'unpublished','fingerprint')",
      );
      await c.query(
        "INSERT INTO blog_post_revisions(id,post_id,version,snapshot,action,actor_id,provenance) VALUES ('r1','published',1,'{\"title\":\"Retained draft\"}','initialize','actor','{\"source\":\"fixture\"}'),('r2','published',2,'{\"title\":\"Retained published\"}','publish','actor','{}'),('r3','withdrawn',1,'{}','initialize','actor','{}'),('r4','withdrawn',2,'{}','publish','actor','{}'),('r5','withdrawn',3,'{}','unpublish','actor','{}')",
      );
      await c.query(
        "INSERT INTO blog_publication_routes(slug,post_id,generation,revision_id,state) VALUES ('active','published',1,'r2','published'),('removed','withdrawn',2,NULL,'withdrawn')",
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await pool.end();
  });
  it("captures and restores populated cyclic publication references without losing tombstones or provenance", async () => {
    await runSystemBackup();
    const snapshot = exportedSnapshot();
    expect(snapshot.manifest.restoreOrder.indexOf("blog_post_revisions")).toBeLessThan(
      snapshot.manifest.restoreOrder.indexOf("blog_publication_state"),
    );
    const before = (await pool.query("SELECT * FROM blog_publication_state ORDER BY post_id")).rows;
    await restoreBackupSnapshot(snapshot);
    expect(
      (await pool.query("SELECT * FROM blog_publication_state ORDER BY post_id")).rows,
    ).toEqual(before);
    expect(
      (await pool.query("SELECT slug,state,revision_id FROM blog_publication_routes ORDER BY slug"))
        .rows,
    ).toEqual([
      { slug: "active", state: "published", revision_id: "r2" },
      { slug: "removed", state: "withdrawn", revision_id: null },
    ]);
    expect(
      (await pool.query("SELECT snapshot,provenance FROM blog_post_revisions WHERE id='r1'"))
        .rows[0],
    ).toEqual({ snapshot: { title: "Retained draft" }, provenance: { source: "fixture" } });
    await expect(pool.query("UPDATE blog_post_revisions SET action='save'")).rejects.toThrow(
      "immutable",
    );
  });
  it("rejects corrupt archived pointers at commit and restores pre-attempt data by rollback", async () => {
    const snapshot = structuredClone(exportedSnapshot());
    const table = snapshot.tables.find((t) => t.name === "blog_post_revisions")!;
    table.rows = table.rows.filter((row: any) => row.id !== "r2");
    await expect(restoreBackupSnapshot(snapshot)).rejects.toThrow("foreign key constraint");
    expect(
      (await pool.query("SELECT count(*)::int count FROM blog_post_revisions")).rows[0].count,
    ).toBe(5);
    expect(
      (
        await pool.query(
          "SELECT published_revision_id FROM blog_publication_state WHERE post_id='published'",
        )
      ).rows[0].published_revision_id,
    ).toBe("r2");
  });
  it("rejects historical archives before changing populated publication or legacy data", async () => {
    const historical = structuredClone(exportedSnapshot());
    historical.tables = historical.tables.filter((t) => t.name === "blog_posts");
    historical.manifest.restoreOrder = ["blog_posts"];
    historical.tables[0].rows = [{ id: "old", content: "Old archive" }];
    await expect(restoreBackupSnapshot(historical)).rejects.toThrow(
      "omits Blog publication history",
    );
    expect((await pool.query("SELECT * FROM blog_posts")).rows).toEqual([
      { id: "legacy", content: "Retained legacy content" },
    ]);
    expect(
      (await pool.query("SELECT count(*)::int count FROM blog_post_revisions")).rows[0].count,
    ).toBe(5);
  });

  it("waits for the publication transaction lock before restore preflight", async () => {
    const writer = await pool.connect();
    let completed = false;
    await writer.query("BEGIN");
    await writer.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('blog-publication-writes',0))",
    );
    const restoring = restoreBackupSnapshot(structuredClone(exportedSnapshot())).finally(() => {
      completed = true;
    });
    try {
      let waiting = false;
      for (let attempt = 0; attempt < 40; attempt++) {
        waiting = Boolean(
          (
            await pool.query(
              "SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted AND database=(SELECT oid FROM pg_database WHERE datname=current_database())",
            )
          ).rowCount,
        );
        if (waiting) break;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      expect(waiting).toBe(true);
      expect(completed).toBe(false);
    } finally {
      await writer.query("COMMIT");
      writer.release();
      await restoring;
    }
  });
  it("allows historical restore when all sidecars are empty", async () => {
    await pool.query("TRUNCATE blog_publication_routes,blog_post_revisions,blog_publication_state");
    const historical = structuredClone(exportedSnapshot());
    historical.tables = historical.tables.filter((t) => t.name === "blog_posts");
    historical.manifest.restoreOrder = ["blog_posts"];
    historical.tables[0].rows = [{ id: "old", content: "Old archive" }];
    await restoreBackupSnapshot(historical);
    expect((await pool.query("SELECT * FROM blog_posts")).rows).toEqual([
      { id: "old", content: "Old archive" },
    ]);
  });
});
