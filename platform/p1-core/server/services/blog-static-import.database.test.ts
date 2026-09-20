import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { migrate } from "drizzle-orm/node-postgres/migrator";
const fixture = vi.hoisted(() => ({ url: process.env.BLOG_STATIC_IMPORT_TEST_DATABASE_URL }));
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString: fixture.url });
  return { pool, db: drizzle(pool) };
});
import { db, pool } from "../db";
import type { User } from "@shared/schema";
import {
  blogStaticImportReceipts,
  STATIC_BLOG_SOURCE_SLUGS,
} from "@shared/schema/blog-publications";
import type { ClientSiteManifest } from "@shared/client-site-manifest";
import { hashBlogImportJson, type BlogImportSourceAdmission } from "./blog-import-source.service";
import {
  hashStaticBlogImportPlan,
  hashStaticBlogFileManifest,
  importStaticBlogArticles,
  type StaticBlogImportPlan,
} from "./blog-static-import.service";
import type { ReviewedBlogMediaFile } from "./blog-media-staging.service";
import type { LegacyUploadStorage, MigrationObject } from "./legacy-upload-storage";
import { getBlogPublication } from "./blog-publication-editor.service";
import { blogPublicationLease } from "./blog-publication-leases.service";
import {
  mutateBlogPublication,
  mutateBlogPublicationInTransaction,
} from "./blog-publication.service";
const actor = {
  id: "static-import-fixture",
  email: "fixture@example.test",
  role: "admin",
  firstName: "Fixture",
  lastName: "Owner",
} as User;
let manifest: ClientSiteManifest, files: ReviewedBlogMediaFile[];
function admission(): BlogImportSourceAdmission {
  return {
    schemaVersion: 1,
    stackId: "p1-land-management",
    websiteManifestSha256: hashBlogImportJson(manifest),
    components: [
      ...STATIC_BLOG_SOURCE_SLUGS.map((slug) => ({
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
function plan(): StaticBlogImportPlan {
  return {
    schemaVersion: 1,
    reviewBundleSha256: "a".repeat(64),
    sourceFingerprint: "b".repeat(64),
    mediaReviewSha256: "c".repeat(64),
    fileManifestSha256: hashStaticBlogFileManifest(files),
    sourceRevision: "d".repeat(40),
    deploymentId: "synthetic-deployment",
    datePolicy: "retain-declared",
    sourceAdmission: admission(),
    reviewedManifest: manifest,
    articles: STATIC_BLOG_SOURCE_SLUGS.map((slug) => ({
      title: `Reviewed ${slug}`,
      slug,
      excerpt: "Reviewed excerpt",
      content: "<p>Reviewed body</p>",
      authorName: "P1 Land & Property Management",
      coverImageUrl: "/assets/reviewed.png",
      coverImagePositionX: 50,
      coverImagePositionY: 50,
      category: null,
      categories: [],
      tags: [],
      postType: "article",
      podcastUrl: null,
      externalUrl: null,
      sidebarId: null,
      seoTitle: null,
      seoDescription: null,
      ogImageUrl: null,
      noindex: false,
      presentation: {
        schemaVersion: 1,
        layout: "editorial",
        eyebrow: "Insights",
        titleParts: [{ text: `Reviewed ${slug}`, emphasis: false }],
        imageAlt: "Reviewed source",
        relatedContent: '<p>Related <a href="/services">services</a></p>',
        structuredData: {
          type: "Article",
          headline: `Reviewed ${slug}`,
          description: "Reviewed description",
          authorType: "Organization",
          publishedDate: "2026-06-24",
          modifiedDate: "2026-09-14",
        },
      },
    })),
  };
}
function storageFixture() {
  const objects = new Map<string, MigrationObject>();
  let writes = 0;
  const storage: LegacyUploadStorage = {
    bucketName: "synthetic-only",
    async createOnly(key, object) {
      writes++;
      if (objects.has(key)) return "already-exists";
      objects.set(key, { ...object, body: Buffer.from(object.body) });
      return "created";
    },
    async read(key) {
      return objects.get(key) || null;
    },
  };
  return { storage, objects, writes: () => writes };
}
const run = (p: StaticBlogImportPlan, s: LegacyUploadStorage) =>
  importStaticBlogArticles(p, actor, files, s, hashStaticBlogImportPlan(p, actor.id));
async function counts() {
  const tables = [
    "blog_posts",
    "blog_publication_state",
    "blog_post_revisions",
    "blog_publication_routes",
    "blog_static_import_receipts",
    "cms_media",
    "editor_locks",
  ];
  return Object.fromEntries(
    await Promise.all(
      tables.map(async (table) => [
        table,
        Number((await pool.query(`select count(*) from ${table}`)).rows[0].count),
      ]),
    ),
  );
}
async function change(
  postId: string,
  action: "save" | "publish" | "unpublish" | "delete",
  data?: StaticBlogImportPlan["articles"][number],
) {
  const current = await getBlogPublication(postId);
  const instance = randomUUID();
  const lease = await blogPublicationLease("acquire", postId, actor, {
    editorInstanceId: instance,
  });
  const result = await mutateBlogPublication(
    postId,
    actor.id,
    {
      expectedVersion: current.publication.version!,
      editorInstanceId: instance,
      leaseId: lease.lock!.id,
    },
    action,
    data ? { data } : {},
  );
  if (action !== "delete")
    await blogPublicationLease("release", postId, actor, {
      editorInstanceId: instance,
      leaseId: lease.lock!.id,
    });
  return result;
}
describe.skipIf(!fixture.url)("atomic five-article static importer on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(fixture.url!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/blog_static_import_test")
      throw Error("Dedicated loopback blog_static_import_test required");
    await migrate(db, { migrationsFolder: "p1-migrations" });
    manifest = JSON.parse(await readFile("config/p1-client-site-manifest.json", "utf8"));
    await pool.query(
      "INSERT INTO users(id,email,password,role) VALUES ($1,$2,'synthetic-only','admin') ON CONFLICT(id) DO NOTHING",
      [actor.id, actor.email],
    );
    files = [];
    for (const [index, sourceSlug] of STATIC_BLOG_SOURCE_SLUGS.entries()) {
      for (const width of [1408, 480, 768, 1280]) {
        const original = width === 1408,
          height = Math.round((768 * width) / 1408);
        const image = sharp({
          create: { width, height, channels: 3, background: { r: 30 + index * 30, g: 80, b: 160 } },
        });
        const data = await (original ? image.png() : image.webp({ quality: 78 })).toBuffer();
        files.push({
          sourceSlug,
          role: original ? "original" : "variant",
          sha256: createHash("sha256").update(data).digest("hex"),
          bytes: data.length,
          mime: original ? "image/png" : "image/webp",
          width,
          height,
          quality: original ? null : 78,
          data,
        });
      }
    }
  });
  beforeEach(async () => {
    await pool.query(
      "TRUNCATE blog_static_import_receipts,blog_publication_schedules,blog_publication_routes,blog_post_revisions,blog_publication_state,blog_posts,editor_locks,cms_media,client_site_content CASCADE",
    );
  });
  afterAll(async () => {
    await pool.end();
  });
  it("registers twenty verified files and commits all five leased publications plus immutable provenance", async () => {
    const p = plan(),
      s = storageFixture();
    const result = await run(p, s.storage);
    expect(result.replay).toBe(false);
    expect(await counts()).toEqual({
      blog_posts: 5,
      blog_publication_state: 5,
      blog_post_revisions: 10,
      blog_publication_routes: 5,
      blog_static_import_receipts: 5,
      cms_media: 20,
      editor_locks: 0,
    });
    expect(s.objects.size).toBe(20);
    const receipt = (await db.select().from(blogStaticImportReceipts))[0];
    expect(receipt.sourceManifest).toMatchObject({
      importPlanSha256: result.planSha256,
      datePolicy: "retain-declared",
      sourceFingerprint: p.sourceFingerprint,
      sourceAdmission: {
        ...p.sourceAdmission,
        components: [...p.sourceAdmission.components].sort(
          (a, b) =>
            a.routeId.localeCompare(b.routeId) || a.componentKey.localeCompare(b.componentKey),
        ),
      },
    });
    const post = await getBlogPublication(result.articles[0].postId);
    expect(post.publication.visibility).toBe("published");
    expect(post.presentation?.structuredData.publishedDate).toBe("2026-06-24");
    expect(post.coverImageSet?.variants).toHaveLength(3);
    expect(post.publication.version).toBe(2);
    expect(post.publishedAt?.toISOString()).not.toMatch(/^2026-06-24/);
    expect(
      (
        await pool.query(
          "SELECT bool_and(NOT is_published AND published_at IS NULL AND scheduled_at IS NULL) AS safe FROM blog_posts",
        )
      ).rows[0].safe,
    ).toBe(true);
  });
  it("requires explicit date policy and clears only declared dates when requested", async () => {
    const p = plan();
    p.datePolicy = "clear-unverified";
    const result = await run(p, storageFixture().storage);
    const post = await getBlogPublication(result.articles[0].postId);
    expect(post.presentation?.structuredData).toMatchObject({
      publishedDate: null,
      modifiedDate: null,
      authorType: "Organization",
    });
    const invalid = { ...p, datePolicy: undefined };
    expect(() => hashStaticBlogImportPlan(invalid, actor.id)).toThrow();
  });
  it("rejects changed approval, media metadata, raw bytes and caller supplied ledgers before storage", async () => {
    const p = plan(),
      s = storageFixture();
    await expect(
      importStaticBlogArticles(p, actor, files, s.storage, "0".repeat(64)),
    ).rejects.toMatchObject({ code: "BLOG_STATIC_IMPORT_CONFLICT" });
    const wrong = files.map((f, i) => (i ? f : { ...f, quality: 60 }));
    await expect(
      importStaticBlogArticles(p, actor, wrong, s.storage, hashStaticBlogImportPlan(p, actor.id)),
    ).rejects.toThrow("metadata");
    const bad = files.map((f, i) => (i ? f : { ...f, data: Buffer.from("bad") }));
    await expect(
      importStaticBlogArticles(p, actor, bad, s.storage, hashStaticBlogImportPlan(p, actor.id)),
    ).rejects.toThrow("bytes");
    (p.articles[0] as any).coverImageSet = null;
    expect(() => hashStaticBlogImportPlan(p, actor.id)).toThrow("ledgers");
    expect(s.writes()).toBe(0);
  });
  it("rolls back all database writes when the last sorted article exceeds publication capacity", async () => {
    const p = plan();
    p.articles.sort((a, b) => a.slug.localeCompare(b.slug));
    p.articles[4].content = `<p>${"x".repeat(262145)}</p>`;
    const s = storageFixture();
    await expect(run(p, s.storage)).rejects.toMatchObject({ code: "BLOG_PUBLICATION_LIMIT" });
    expect(Object.values(await counts()).every((n) => n === 0)).toBe(true);
    expect(s.objects.size).toBe(20);
  });
  it("rechecks source admission after staging and leaves no database registrations on source change", async () => {
    const p = plan(),
      s = storageFixture();
    const create = s.storage.createOnly;
    let changed = false;
    s.storage.createOnly = async (key, obj) => {
      if (!changed) {
        changed = true;
        const c = p.sourceAdmission.components[0];
        await pool.query(
          "INSERT INTO client_site_content(id,stack_id,route_id,component_key,draft_content,draft_revision) VALUES ('concurrent-source',$1,$2,$3,'{}',1)",
          [p.sourceAdmission.stackId, c.routeId, c.componentKey],
        );
      }
      return create(key, obj);
    };
    await expect(run(p, s.storage)).rejects.toMatchObject({ code: "BLOG_IMPORT_SOURCE_CHANGED" });
    expect(Object.values(await counts()).every((n) => n === 0)).toBe(true);
    expect(s.objects.size).toBe(20);
  });
  it("rejects a conflicting media registration without partial imports", async () => {
    const f = files[0];
    await pool.query(
      "INSERT INTO cms_media(id,filename,original_name,url,r2_key,mime_type,file_size) VALUES ('conflict','x','x',$1,$2,$3,$4)",
      [`/r2/cms/blog-static/${f.sha256}.png`, `cms/blog-static/${f.sha256}.png`, f.mime, f.bytes],
    );
    await expect(run(plan(), storageFixture().storage)).rejects.toMatchObject({
      code: "BLOG_STATIC_IMPORT_CONFLICT",
    });
    const c = await counts();
    expect(c.cms_media).toBe(1);
    expect(c.blog_posts).toBe(0);
    expect(c.blog_static_import_receipts).toBe(0);
  });
  it("exact replay after edits, rename, unpublish and delete never resurrects or overwrites", async () => {
    const p = plan(),
      s = storageFixture();
    const imported = await run(p, s.storage);
    const ids = imported.articles;
    const edited = p.articles.find((a) => a.slug === ids[0].sourceSlug)!;
    await change(ids[0].postId, "save", {
      ...edited,
      content: "<p>Later draft</p>",
      coverImageUrl: (await getBlogPublication(ids[0].postId)).coverImageUrl,
    });
    const renamed = p.articles.find((a) => a.slug === ids[1].sourceSlug)!;
    await change(ids[1].postId, "publish", {
      ...renamed,
      slug: "later-renamed",
      coverImageUrl: (await getBlogPublication(ids[1].postId)).coverImageUrl,
    });
    await change(ids[2].postId, "unpublish");
    await change(ids[3].postId, "delete");
    const before = await counts();
    const state = (await pool.query("SELECT * FROM blog_publication_state ORDER BY post_id")).rows;
    const writes = s.writes();
    expect(await run(p, s.storage)).toEqual({ ...imported, replay: true });
    expect(await counts()).toEqual(before);
    expect(
      (await pool.query("SELECT * FROM blog_publication_state ORDER BY post_id")).rows,
    ).toEqual(state);
    expect(s.writes()).toBe(writes);
  });
  it("replay recovers a committed result lost by the caller and parallel identical calls converge", async () => {
    const p = plan(),
      s = storageFixture();
    const results = await Promise.all([run(p, s.storage), run(p, s.storage)]);
    expect(results.map((x) => x.replay).sort()).toEqual([false, true]);
    expect(results[0].articles).toEqual(results[1].articles);
    await expect(
      (async () => {
        await run(p, s.storage);
        throw Error("synthetic response loss");
      })(),
    ).rejects.toThrow("response loss");
    expect((await run(p, s.storage)).replay).toBe(true);
    expect((await counts()).blog_post_revisions).toBe(10);
  });
  it("mixed receipts and changed approved plans fail before any staging", async () => {
    const p = plan(),
      s = storageFixture();
    await run(p, s.storage);
    const receipts = await db.select().from(blogStaticImportReceipts);
    await pool.query("TRUNCATE blog_static_import_receipts");
    await db.insert(blogStaticImportReceipts).values(receipts[0]);
    const fresh = storageFixture();
    await expect(run(p, fresh.storage)).rejects.toMatchObject({
      code: "BLOG_STATIC_IMPORT_CONFLICT",
    });
    expect(fresh.writes()).toBe(0);
    await pool.query("TRUNCATE blog_static_import_receipts");
    await db.insert(blogStaticImportReceipts).values(receipts);
    p.deploymentId = "another-deployment";
    await expect(run(p, fresh.storage)).rejects.toMatchObject({
      code: "BLOG_STATIC_IMPORT_CONFLICT",
    });
    expect(fresh.writes()).toBe(0);
  });
  it("internal transaction mutation wrapper rejects missing exact instance/version proof", async () => {
    await expect(
      db.transaction((tx) =>
        mutateBlogPublicationInTransaction(tx, "missing", actor.id, null as any, "publish"),
      ),
    ).rejects.toMatchObject({ code: "CMS_CONCURRENCY_REQUIRED" });
  });
  it("retains partial staged objects after interruption and retries into exactly one import", async () => {
    const p = plan(),
      s = storageFixture();
    const create = s.storage.createOnly;
    s.storage.createOnly = async (key, object) => {
      if (s.objects.size === 7) throw Error("interrupted");
      return create(key, object);
    };
    await expect(run(p, s.storage)).rejects.toThrow("interrupted");
    expect(Object.values(await counts()).every((n) => n === 0)).toBe(true);
    expect(s.objects.size).toBe(7);
    s.storage.createOnly = create;
    expect((await run(p, s.storage)).replay).toBe(false);
    expect((await counts()).blog_static_import_receipts).toBe(5);
    expect(s.objects.size).toBe(20);
  });
  it("rejects stale source before the first provider operation", async () => {
    const p = plan(),
      s = storageFixture();
    p.sourceAdmission.components[0].capturedRevision = 1;
    await expect(run(p, s.storage)).rejects.toMatchObject({ code: "BLOG_IMPORT_SOURCE_CHANGED" });
    expect(s.writes()).toBe(0);
    expect(Object.values(await counts()).every((n) => n === 0)).toBe(true);
  });
  it("recovers an initial successful commit whose result was lost without rerunning publication", async () => {
    const p = plan(),
      s = storageFixture();
    await expect(
      (async () => {
        await run(p, s.storage);
        throw Error("initial committed response lost");
      })(),
    ).rejects.toThrow("initial committed response lost");
    const rows = await db.select().from(blogStaticImportReceipts);
    const before = await counts();
    const writes = s.writes();
    const retry = await run(p, s.storage);
    expect(retry.replay).toBe(true);
    expect(retry.articles.map((a) => a.postId).sort()).toEqual(rows.map((r) => r.postId).sort());
    expect(await counts()).toEqual(before);
    expect(s.writes()).toBe(writes);
  });
});
