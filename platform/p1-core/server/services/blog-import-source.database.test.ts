import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { STATIC_BLOG_SLUGS } from "@shared/public-blog";
import type { ClientSiteManifest } from "@shared/client-site-manifest";
import {
  assertBlogImportSource,
  hashBlogImportJson,
  type BlogImportSourceAdmission,
} from "./blog-import-source.service";
const fixture = vi.hoisted(() => ({ url: process.env.BLOG_IMPORT_SOURCE_TEST_DATABASE_URL }));
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString: fixture.url });
  return { pool, db: drizzle(pool) };
});
import { db, pool } from "../db";
let manifest: ClientSiteManifest;
function admission(): BlogImportSourceAdmission {
  return {
    schemaVersion: 1,
    stackId: "p1-land-management",
    websiteManifestSha256: hashBlogImportJson(manifest),
    components: [
      ...STATIC_BLOG_SLUGS.map((slug) => ({
        routeId: `blog-${slug}`,
        componentKey: `blog-${slug}-content`,
      })),
      { routeId: "home", componentKey: "site-chrome" },
    ].map((identity) => {
      const defaults = manifest.puck.editableComponents.find(
        (c) => c.key === identity.componentKey,
      )!.defaultContent;
      return {
        ...identity,
        mode: "absent",
        rowId: null,
        draftRevision: null,
        publishedRevision: null,
        publishedContentSha256: null,
        defaultContentSha256: hashBlogImportJson(defaults),
        effectiveContentSha256: hashBlogImportJson(defaults),
        capturedRevision: 0,
      };
    }),
  };
}
async function insert(published = false) {
  const a = admission(),
    c = a.components[0];
  const definition = manifest.puck.editableComponents.find((d) => d.key === c.componentKey)!;
  const content = { ...definition.defaultContent };
  const field = definition.fields.find((f) => f.type === "text")!;
  content[field.path] = "Reviewed source text";
  await pool.query(
    "INSERT INTO client_site_content(id,stack_id,route_id,component_key,draft_content,draft_revision,published_content,published_revision) VALUES ('source',$1,$2,$3,$4,2,$5,$6)",
    [
      a.stackId,
      c.routeId,
      c.componentKey,
      JSON.stringify(content),
      published ? JSON.stringify(content) : null,
      published ? 2 : null,
    ],
  );
  Object.assign(c, {
    mode: published ? "published" : "unpublished",
    rowId: "source",
    draftRevision: 2,
    publishedRevision: published ? 2 : null,
    publishedContentSha256: published ? hashBlogImportJson(content) : null,
    capturedRevision: published ? 2 : 0,
    effectiveContentSha256: hashBlogImportJson(published ? content : definition.defaultContent),
  });
  return a;
}
function check(a = admission(), m = manifest) {
  return db.transaction((tx) => assertBlogImportSource(tx, a, m));
}

describe("Blog import canonical JSON", () => {
  it("sorts recursively without altering array order or accepting non-JSON values", () => {
    expect(hashBlogImportJson({ b: 2, a: { y: 1, x: 0 } })).toBe(
      hashBlogImportJson({ a: { x: 0, y: 1 }, b: 2 }),
    );
    expect(hashBlogImportJson([1, 2])).not.toBe(hashBlogImportJson([2, 1]));
    for (const value of [undefined, new Date(), NaN, { a: undefined }, new Array(2)])
      expect(() => hashBlogImportJson(value)).toThrow();
  });
});
describe.skipIf(!fixture.url)("Blog import source admission on PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(fixture.url!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/blog_import_source_test")
      throw new Error("Dedicated loopback source-test DB required");
    await migrate(db, { migrationsFolder: "p1-migrations" });
    manifest = JSON.parse(await readFile("config/p1-client-site-manifest.json", "utf8"));
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE client_site_content CASCADE");
  });
  afterAll(async () => {
    await pool.end();
  });
  it("rejects REPEATABLE READ before source admission", async () => {
    await expect(
      db.transaction((tx) => assertBlogImportSource(tx, admission(), manifest), {
        isolationLevel: "repeatable read",
      }),
    ).rejects.toMatchObject({ code: "BLOG_IMPORT_ISOLATION_REQUIRED" });
    expect((await pool.query("SELECT count(*) FROM client_site_content")).rows[0].count).toBe("0");
  });
  it("admits all six absent sources without writing rows", async () => {
    await check();
    expect((await pool.query("SELECT count(*) FROM client_site_content")).rows[0].count).toBe("0");
  });
  it("admits unpublished defaults and published reviewed content", async () => {
    await check(await insert(false));
    await pool.query("TRUNCATE client_site_content CASCADE");
    await check(await insert(true));
  });
  it("rejects changed source, draft revision, publication hash and inconsistent null pairs", async () => {
    const a = await insert(true);
    await pool.query("UPDATE client_site_content SET draft_revision=3");
    await expect(check(a)).rejects.toMatchObject({ code: "BLOG_IMPORT_SOURCE_CHANGED" });
    await pool.query("UPDATE client_site_content SET draft_revision=2,published_content='{}'");
    await expect(check(a)).rejects.toMatchObject({ code: "BLOG_IMPORT_SOURCE_CHANGED" });
    await pool.query("UPDATE client_site_content SET published_content=NULL");
    await expect(check(a)).rejects.toMatchObject({ code: "BLOG_IMPORT_SOURCE_CHANGED" });
  });
  it("rejects wrong manifest, defaults, effective content, captured revision and duplicate identities", async () => {
    for (const alter of [
      (a: BlogImportSourceAdmission) => {
        a.websiteManifestSha256 = "a".repeat(64);
      },
      (a: BlogImportSourceAdmission) => {
        a.components[0].defaultContentSha256 = "a".repeat(64);
      },
      (a: BlogImportSourceAdmission) => {
        a.components[0].effectiveContentSha256 = "a".repeat(64);
      },
      (a: BlogImportSourceAdmission) => {
        a.components[0].capturedRevision = 1;
      },
      (a: BlogImportSourceAdmission) => {
        a.components[1] = { ...a.components[0] };
      },
    ]) {
      const a = admission();
      alter(a);
      await expect(check(a)).rejects.toMatchObject({ code: "BLOG_IMPORT_SOURCE_CHANGED" });
    }
  });
  it("rejects content accepted by Core but rejected by the Website flat-string contract", async () => {
    const a = await insert(true);
    const c = a.components[0];
    const definition = manifest.puck.editableComponents.find((d) => d.key === c.componentKey)!;
    const field = definition.fields.find((f) => !f.required)!;
    const content = { ...definition.defaultContent, [field.path]: null };
    await pool.query("UPDATE client_site_content SET published_content=$1", [
      JSON.stringify(content),
    ]);
    c.publishedContentSha256 = hashBlogImportJson(content);
    c.effectiveContentSha256 = hashBlogImportJson(content);
    await expect(check(a)).rejects.toMatchObject({ code: "BLOG_IMPORT_SOURCE_CHANGED" });
  });
  it("does not mistake an existing unpublished row for captured absence", async () => {
    const a = admission();
    await insert(false);
    await expect(check(a)).rejects.toMatchObject({ code: "BLOG_IMPORT_SOURCE_CHANGED" });
  });
  it.each([false, true])(
    "blocks absent-row insertion until transaction completion (rollback=%s)",
    async (rollback) => {
      let entered!: () => void, release!: () => void;
      const ready = new Promise<void>((r) => {
          entered = r;
        }),
        finish = new Promise<void>((r) => {
          release = r;
        });
      const transaction = db.transaction(async (tx) => {
        await assertBlogImportSource(tx, admission(), manifest);
        entered();
        await finish;
        if (rollback) throw new Error("deliberate rollback");
      });
      const outcome = transaction.then(
        () => null,
        (error) => error,
      );
      await ready;
      const writer = await pool.connect();
      let pending: Promise<unknown> | undefined;
      try {
        const pid = (await writer.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
        const c = admission().components[0];
        pending = writer.query(
          "INSERT INTO client_site_content(stack_id,route_id,component_key) VALUES ('p1-land-management',$1,$2)",
          [c.routeId, c.componentKey],
        );
        let blocked = false;
        const deadline = Date.now() + 2000;
        while (Date.now() < deadline) {
          blocked =
            (await pool.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1", [pid]))
              .rows[0]?.wait_event_type === "Lock";
          if (blocked) break;
          await new Promise((r) => setTimeout(r, 10));
        }
        expect(blocked).toBe(true);
        expect((await pool.query("SELECT count(*) FROM client_site_content")).rows[0].count).toBe(
          "0",
        );
      } finally {
        release();
        await outcome;
        await pending;
        writer.release();
      }
      expect((await pool.query("SELECT count(*) FROM client_site_content")).rows[0].count).toBe(
        "1",
      );
      await expect(check()).rejects.toMatchObject({ code: "BLOG_IMPORT_SOURCE_CHANGED" });
    },
  );
  it("times out a conflicting source writer within the configured five-second bound", async () => {
    const writer = await pool.connect();
    try {
      await writer.query("BEGIN");
      await writer.query("LOCK TABLE client_site_content IN ROW EXCLUSIVE MODE");
      const start = Date.now();
      await expect(check()).rejects.toMatchObject({ cause: { code: "55P03" } });
      expect(Date.now() - start).toBeGreaterThanOrEqual(4500);
      expect(Date.now() - start).toBeLessThan(8000);
    } finally {
      await writer.query("ROLLBACK");
      writer.release();
    }
    await check();
  }, 10000);
});
