import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
const fixture = vi.hoisted(() => ({ url: process.env.BLOG_RECEIPTS_TEST_DATABASE_URL }));
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString: fixture.url });
  return { pool, db: drizzle(pool) };
});
import { db, pool } from "../db";
import {
  hashStaticBlogEditorial,
  recordStaticBlogImportReceipt,
  listStaticBlogRoutes,
} from "./blog-static-import-receipts.service";
import { STATIC_BLOG_SLUGS } from "@shared/public-blog";
import { STATIC_BLOG_SOURCE_SLUGS } from "@shared/schema/blog-publications";
const editorial = {
  title: "Reviewed source",
  slug: STATIC_BLOG_SOURCE_SLUGS[0],
  excerpt: null,
  content: "<p>Reviewed content</p>",
  authorName: "P1",
  coverImageUrl: null,
  coverImagePositionX: 50,
  coverImagePositionY: 50,
  category: null,
  categories: null,
  tags: null,
  postType: "article",
  podcastUrl: null,
  externalUrl: null,
  sidebarId: null,
  seoTitle: null,
  seoDescription: null,
  ogImageUrl: null,
  noindex: false,
};
const input = {
  sourceSlug: STATIC_BLOG_SOURCE_SLUGS[0],
  postId: "post",
  receiptId: "receipt",
  importedRevisionId: "revision",
  bundleSha256: "a".repeat(64),
  editorialSha256: hashStaticBlogEditorial(editorial),
  actorId: "actor",
  sourceManifest: { sourceRevision: "reviewed-build", media: [], dates: { precision: "date" } },
};
describe.skipIf(!fixture.url)("Static Blog immutable ownership receipts on PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(fixture.url!);
    if (url.hostname !== "127.0.0.1" || !url.pathname.includes("test"))
      throw new Error("Disposable loopback test DB required");
    await migrate(db, { migrationsFolder: "p1-migrations" });
  });
  beforeEach(async () => {
    await pool.query(
      "TRUNCATE blog_static_import_receipts,blog_publication_schedules,blog_publication_routes,blog_post_revisions,blog_publication_state CASCADE",
    );
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO blog_publication_state(post_id,version,draft_revision_id,visibility,legacy_fingerprint) VALUES ('post',1,'revision','unpublished','fixture')",
      );
      await client.query(
        "INSERT INTO blog_post_revisions(id,post_id,version,snapshot,action,actor_id,provenance) VALUES ('revision','post',1,$1,'initialize','actor','{}')",
        [JSON.stringify(editorial)],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
  afterAll(async () => {
    await pool.end();
  });
  it("records exact identity and replays without overwriting later publication state", async () => {
    const first = await db.transaction((tx) => recordStaticBlogImportReceipt(tx, input));
    await pool.query("UPDATE blog_publication_state SET visibility='deleted' WHERE post_id='post'");
    const replay = await db.transaction((tx) => recordStaticBlogImportReceipt(tx, input));
    expect(replay).toEqual(first);
    expect(await listStaticBlogRoutes()).toEqual([{ slug: input.sourceSlug, postId: "post" }]);
    expect(
      (await pool.query("SELECT visibility FROM blog_publication_state")).rows[0].visibility,
    ).toBe("deleted");
  });
  it("rejects mismatched editorial hash, slug, revision, provenance and replay", async () => {
    for (const patch of [
      { editorialSha256: "b".repeat(64) },
      { sourceSlug: STATIC_BLOG_SOURCE_SLUGS[1] },
      { importedRevisionId: "missing" },
      { sourceManifest: {} },
    ])
      await expect(
        db.transaction((tx) => recordStaticBlogImportReceipt(tx, { ...input, ...patch })),
      ).rejects.toThrow();
    expect(await listStaticBlogRoutes()).toEqual([]);
    await db.transaction((tx) => recordStaticBlogImportReceipt(tx, input));
    await expect(
      db.transaction((tx) =>
        recordStaticBlogImportReceipt(tx, { ...input, bundleSha256: "b".repeat(64) }),
      ),
    ).rejects.toMatchObject({ code: "BLOG_STATIC_RECEIPT_CONFLICT" });
  });
  it("serializes identical concurrent receipts into one immutable identity", async () => {
    const records = await Promise.all([
      db.transaction((tx) => recordStaticBlogImportReceipt(tx, input)),
      db.transaction((tx) => recordStaticBlogImportReceipt(tx, input)),
    ]);
    expect(records[0]).toEqual(records[1]);
    expect(await listStaticBlogRoutes()).toHaveLength(1);
  });
  it("keeps canonical editorial hashing stable across JSON key order", () => {
    expect(STATIC_BLOG_SOURCE_SLUGS).toEqual(STATIC_BLOG_SLUGS);
    expect(hashStaticBlogEditorial(Object.fromEntries(Object.entries(editorial).reverse()))).toBe(
      input.editorialSha256,
    );
    expect(() => hashStaticBlogEditorial({ slug: editorial.slug })).toThrow();
  });
  it("enforces immutable rows, deferred referential integrity and allowlisted source routes", async () => {
    await db.transaction((tx) => recordStaticBlogImportReceipt(tx, input));
    await expect(
      pool.query("UPDATE blog_static_import_receipts SET actor_id='other'"),
    ).rejects.toThrow("immutable");
    await expect(pool.query("DELETE FROM blog_static_import_receipts")).rejects.toThrow(
      "immutable",
    );
    const constraints = (
      await pool.query(
        "SELECT conname,condeferrable,condeferred FROM pg_constraint WHERE conrelid='blog_static_import_receipts'::regclass AND contype='f'",
      )
    ).rows;
    expect(constraints).toHaveLength(2);
    expect(constraints.every((row) => row.condeferrable && row.condeferred)).toBe(true);
    await expect(
      pool.query(
        "INSERT INTO blog_static_import_receipts(source_slug,post_id,receipt_id,imported_revision_id,bundle_sha256,editorial_sha256,actor_id,source_manifest) VALUES ('unknown','missing','other','missing',$1,$1,'actor','{\"source\":1}')",
        ["a".repeat(64)],
      ),
    ).rejects.toThrow("blog_static_receipt_slug_check");
    await expect(
      pool.query(
        "INSERT INTO blog_static_import_receipts(source_slug,post_id,receipt_id,imported_revision_id,bundle_sha256,editorial_sha256,actor_id,source_manifest) VALUES ($1,'missing','other','missing',$2,$2,'actor','{\"source\":1}')",
        [STATIC_BLOG_SOURCE_SLUGS[1], "a".repeat(64)],
      ),
    ).rejects.toThrow("foreign key constraint");
  });
  it("rolls back a receipt with its surrounding import transaction", async () => {
    await expect(
      db.transaction(async (tx) => {
        await recordStaticBlogImportReceipt(tx, input);
        throw new Error("import rollback");
      }),
    ).rejects.toThrow("import rollback");
    expect(await listStaticBlogRoutes()).toEqual([]);
  });
});
