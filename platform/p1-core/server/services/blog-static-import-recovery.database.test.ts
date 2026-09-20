import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { migrate } from "drizzle-orm/node-postgres/migrator";
const fixture = vi.hoisted(() => ({ url: process.env.BLOG_IMPORT_RECOVERY_TEST_DATABASE_URL }));
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString: fixture.url });
  return { pool, db: drizzle(pool) };
});
import { db, pool } from "../db";
import type { User } from "@shared/schema";
import { STATIC_BLOG_SOURCE_SLUGS } from "@shared/schema/blog-publications";
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
import { mutateBlogPublication } from "./blog-publication.service";
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

import { gunzipSync } from "node:zlib";
vi.mock("./backup-storage.service", () => ({
  beginBackupStorageOperation: vi.fn(),
  deleteBackupObject: vi.fn(),
  downloadBackupObject: vi.fn(),
  getBackupStorageInfo: vi.fn(),
  isBackupStorageConfigured: vi.fn(),
  listBackupObjects: vi.fn(),
  uploadBackupObject: vi.fn(),
}));
import * as backupStorage from "./backup-storage.service";
import { runSystemBackup, restoreBackupSnapshot } from "./system-backup.service";
import { listPublishedBlogSnapshots } from "./blog-publication.service";
import { listStaticBlogRoutes } from "./blog-static-import-receipts.service";
import { resolvePublicBlogMedia } from "./public-blog-media.service";
import { projectPublicBlog } from "./public-blog-projection.service";
import { protectBlogRevisionMedia } from "./blog-media-protection.service";
type Snapshot = Parameters<typeof restoreBackupSnapshot>[0];
async function capture(): Promise<Snapshot> {
  vi.mocked(backupStorage.uploadBackupObject).mockClear();
  await runSystemBackup();
  const uploaded = vi
    .mocked(backupStorage.uploadBackupObject)
    .mock.calls.find(([key]) => key.startsWith("db/"));
  if (!uploaded) throw Error("Backup snapshot was not uploaded");
  return JSON.parse(gunzipSync(uploaded[1]).toString("utf8"));
}
async function publicPayload() {
  return projectPublicBlog(
    await resolvePublicBlogMedia(await listPublishedBlogSnapshots()),
    await listStaticBlogRoutes(),
  );
}
async function exactRows() {
  const tables = [
    "blog_posts",
    "blog_publication_state",
    "blog_post_revisions",
    "blog_publication_routes",
    "blog_publication_schedules",
    "blog_static_import_receipts",
    "cms_media",
  ];
  return Object.fromEntries(
    await Promise.all(
      tables.map(async (table) => [
        table,
        (
          await pool.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`)
        ).rows.map((x) => x.row),
      ]),
    ),
  );
}
async function assertAllImagesProtected() {
  const assets = (await pool.query('SELECT id,url,r2_key AS "r2Key" FROM cms_media ORDER BY id'))
    .rows;
  expect(assets).toHaveLength(20);
  let destructiveCalls = 0;
  for (const asset of assets) {
    for (const operation of ["delete", "replace"]) {
      await expect(
        protectBlogRevisionMedia(asset, asset.url, async () => {
          destructiveCalls++;
          return operation;
        }),
      ).rejects.toMatchObject({ code: "BLOG_REVISION_MEDIA_REFERENCED" });
    }
  }
  expect(destructiveCalls).toBe(0);
}

describe.skipIf(!fixture.url)("atomic importer backup acceptance on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(fixture.url!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/blog_import_recovery_test")
      throw Error("Dedicated loopback blog_import_recovery_test required");
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
    vi.clearAllMocks();
    vi.stubEnv("CLIENT_STACK_ID", "p1-land-management");
    vi.stubEnv("SYSTEM_BACKUP_EXCLUDED_TABLES", "session,__drizzle_migrations");
    vi.mocked(backupStorage.beginBackupStorageOperation).mockResolvedValue({
      source: "env",
      bucketName: "synthetic-only",
      prefix: "test",
    });
    vi.mocked(backupStorage.isBackupStorageConfigured).mockResolvedValue(true);
    vi.mocked(backupStorage.getBackupStorageInfo).mockResolvedValue({
      source: "env",
      bucketName: "synthetic-only",
      prefix: "test",
    });
    vi.mocked(backupStorage.listBackupObjects).mockResolvedValue([]);
    vi.mocked(backupStorage.uploadBackupObject).mockImplementation(async (key) => ({ key }));
    await pool.query(
      "TRUNCATE blog_static_import_receipts,blog_publication_schedules,blog_publication_routes,blog_post_revisions,blog_publication_state,blog_posts,editor_locks,cms_media,client_site_content CASCADE",
    );
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await pool.end();
  });
  it("round-trips all five published snapshots, complete receipts and twenty protected registrations", async () => {
    const p = plan(),
      staged = storageFixture();
    const imported = await run(p, staged.storage);
    expect(imported.articles).toHaveLength(5);
    expect(staged.objects.size).toBe(20);
    const before = await exactRows(),
      payload = await publicPayload(),
      snapshot = await capture();
    expect(payload.posts).toHaveLength(5);
    expect(snapshot.tables.find((t) => t.name === "blog_static_import_receipts")?.rowCount).toBe(5);
    expect(snapshot.tables.find((t) => t.name === "cms_media")?.rowCount).toBe(20);
    await change(imported.articles[0].postId, "unpublish");
    expect((await publicPayload()).posts).toHaveLength(4);
    await restoreBackupSnapshot(snapshot);
    expect(await exactRows()).toEqual(before);
    expect(await publicPayload()).toEqual(payload);
    await assertAllImagesProtected();
    for (const file of files) {
      const key = `cms/blog-static/${file.sha256}.${file.mime === "image/png" ? "png" : "webp"}`;
      const object = staged.objects.get(key)!;
      expect(createHash("sha256").update(object.body).digest("hex")).toBe(file.sha256);
    }
    expect(await run(p, staged.storage)).toEqual({ ...imported, replay: true });
  });
  it("preserves later draft edits, renamed routes and withdrawal/deletion tombstones", async () => {
    const p = plan(),
      staged = storageFixture(),
      imported = await run(p, staged.storage);
    const ids = imported.articles;
    const edited = p.articles.find((a) => a.slug === ids[0].sourceSlug)!;
    await change(ids[0].postId, "save", {
      ...edited,
      content: "<p>Saved draft after import</p>",
      coverImageUrl: (await getBlogPublication(ids[0].postId)).coverImageUrl,
    });
    const renamed = p.articles.find((a) => a.slug === ids[1].sourceSlug)!;
    await change(ids[1].postId, "publish", {
      ...renamed,
      slug: "recovery-renamed",
      coverImageUrl: (await getBlogPublication(ids[1].postId)).coverImageUrl,
    });
    await change(ids[2].postId, "unpublish");
    await change(ids[3].postId, "delete");
    const before = await exactRows(),
      payload = await publicPayload(),
      snapshot = await capture();
    expect(payload.posts).toHaveLength(3);
    await change(ids[4].postId, "unpublish");
    await restoreBackupSnapshot(snapshot);
    expect(await exactRows()).toEqual(before);
    expect(await publicPayload()).toEqual(payload);
    expect((await getBlogPublication(ids[0].postId)).content).toContain("Saved draft after import");
    expect(
      (await pool.query("SELECT count(*) FROM blog_publication_routes WHERE state='withdrawn'"))
        .rows[0].count,
    ).not.toBe("0");
    await assertAllImagesProtected();
    expect((await run(p, staged.storage)).replay).toBe(true);
    expect(await exactRows()).toEqual(before);
  });
  it.each(["missing", "empty", "mismatched"])(
    "rejects %s receipt archive before any TRUNCATE",
    async (kind) => {
      await run(plan(), storageFixture().storage);
      const before = await exactRows(),
        snapshot = await capture();
      if (kind === "missing")
        snapshot.tables = snapshot.tables.filter((t) => t.name !== "blog_static_import_receipts");
      else {
        const receipts = snapshot.tables.find((t) => t.name === "blog_static_import_receipts")!;
        if (kind === "empty") {
          receipts.rows = [];
          receipts.rowCount = 0;
        } else receipts.rows[0].editorial_sha256 = "f".repeat(64);
      }
      // Database trigger proves preflight fails before the destructive phase,
      // rather than merely relying on a later transactional rollback.
      await pool.query(
        "CREATE OR REPLACE FUNCTION recovery_truncate_tripwire() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'destructive phase entered'; END $$",
      );
      await pool.query(
        "CREATE TRIGGER recovery_truncate_tripwire BEFORE TRUNCATE ON blog_posts FOR EACH STATEMENT EXECUTE FUNCTION recovery_truncate_tripwire()",
      );
      try {
        await expect(restoreBackupSnapshot(snapshot)).rejects.toThrow(
          "permanent static Blog ownership",
        );
      } finally {
        await pool.query("DROP TRIGGER recovery_truncate_tripwire ON blog_posts");
        await pool.query("DROP FUNCTION recovery_truncate_tripwire()");
      }
      expect(await exactRows()).toEqual(before);
    },
  );
});
