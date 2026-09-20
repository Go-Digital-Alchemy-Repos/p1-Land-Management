import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { eq } from "drizzle-orm";
const fixture = vi.hoisted(() => ({ url: process.env.BLOG_COVER_TEST_DATABASE_URL }));
vi.mock("../db", async () => {
  const { Pool } = await import("pg"),
    { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString: fixture.url });
  return { pool, db: drizzle(pool) };
});
import { db, pool } from "../db";
import { cmsMedia, blogPosts, type User } from "@shared/schema";
import {
  blogPostRevisions,
  blogPublicationState,
  STATIC_BLOG_SOURCE_SLUGS,
} from "@shared/schema/blog-publications";
import {
  type BlogCoverImageSet,
  validateBlogCoverImageSet,
  validateBlogResponsiveCover,
} from "@shared/blog-cover-image-set";
import { createBlogPublication, getBlogPublication } from "./blog-publication-editor.service";
import {
  recordStaticBlogImportReceipt,
  hashStaticBlogEditorial,
} from "./blog-static-import-receipts.service";
import { mutateBlogPublication, listPublishedBlogSnapshots } from "./blog-publication.service";
import { resolvePublicBlogMedia } from "./public-blog-media.service";
import { projectPublicBlog } from "./public-blog-projection.service";
import { protectBlogRevisionMedia } from "./blog-media-protection.service";
const user = {
  id: "fixture",
  role: "admin",
  firstName: "Fixture",
  lastName: "Owner",
  email: "fixture@example.test",
} as User;
const set: BlogCoverImageSet = {
  schemaVersion: 1,
  sourceFingerprint: "a".repeat(64),
  mediaReviewSha256: "b".repeat(64),
  original: {
    mediaId: "original",
    url: "/r2/cms/blog-static/source.png",
    sha256: "c".repeat(64),
    bytes: 1000,
    mime: "image/png",
    width: 1408,
    height: 768,
    quality: null,
  },
  defaultMediaId: "v1280",
  variants: [480, 768, 1280].map((width) => ({
    mediaId: `v${width}`,
    url: `/r2/cms/blog-static/${width}.webp`,
    sha256: "d".repeat(64),
    bytes: width,
    mime: "image/webp",
    width,
    height: Math.round((768 * width) / 1408),
    quality: 78,
  })),
};
const body = {
  title: "Imported",
  slug: STATIC_BLOG_SOURCE_SLUGS[0],
  excerpt: null,
  content: "<p>Body</p>",
  authorName: "P1",
  coverImageUrl: set.variants[2].url,
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
async function stage(ledger: unknown = set) {
  const editorInstanceId = randomUUID(),
    post = await createBlogPublication(body, user, editorInstanceId),
    revisionId = randomUUID();
  await db.transaction(async (tx) => {
    for (const image of [set.original, ...set.variants])
      await tx.insert(cmsMedia).values({
        id: image.mediaId,
        filename: image.mediaId,
        originalName: image.mediaId,
        url: `https://cdn.example.test/${image.mediaId}`,
        r2Key: image.url.slice(4),
        mimeType: image.mime,
        fileSize: image.bytes,
      });
    const snapshot = { ...body, coverImageSet: set };
    await tx.insert(blogPostRevisions).values({
      id: revisionId,
      postId: post.id,
      version: 2,
      snapshot,
      action: "save",
      actorId: user.id,
      provenance: {},
    });
    await tx
      .update(blogPublicationState)
      .set({ version: 2, draftRevisionId: revisionId })
      .where(eq(blogPublicationState.postId, post.id));
    await recordStaticBlogImportReceipt(tx, {
      sourceSlug: body.slug,
      postId: post.id,
      receiptId: "receipt",
      importedRevisionId: revisionId,
      bundleSha256: "e".repeat(64),
      editorialSha256: hashStaticBlogEditorial(snapshot),
      actorId: user.id,
      sourceManifest: { coverImageSet: ledger },
    });
  });
  return { post, proof: { editorInstanceId, leaseId: post.lease.lock!.id, expectedVersion: 2 } };
}
describe.skipIf(!fixture.url)("receipt-bound responsive covers on PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(fixture.url!);
    if (url.hostname !== "127.0.0.1" || !url.pathname.includes("test"))
      throw Error("Disposable loopback required");
    await migrate(db, { migrationsFolder: "p1-migrations" });
  });
  beforeEach(async () => {
    await pool.query(
      "TRUNCATE blog_static_import_receipts,blog_publication_schedules,blog_publication_routes,blog_post_revisions,blog_publication_state,blog_posts,editor_locks,cms_media CASCADE",
    );
  });
  afterAll(async () => {
    await pool.end();
  });
  it("refuses arbitrary regular API creation while preserving absent and null", async () => {
    await expect(
      createBlogPublication({ ...body, coverImageSet: set }, user, randomUUID()),
    ).rejects.toMatchObject({ code: "BLOG_COVER_SET_UNTRUSTED" });
    expect(await db.select().from(blogPosts)).toHaveLength(0);
    const absent = await createBlogPublication(body, user, randomUUID());
    expect(absent).not.toHaveProperty("coverImageSet");
    const cleared = await createBlogPublication(
      { ...body, slug: "clear", coverImageSet: null },
      user,
      randomUUID(),
    );
    expect(cleared.coverImageSet).toBeNull();
  });
  it("records revision then receipt atomically and emits only verified responsive fields", async () => {
    const x = await stage();
    await mutateBlogPublication(x.post.id, user.id, x.proof, "publish");
    const projected = projectPublicBlog(
      await resolvePublicBlogMedia(await listPublishedBlogSnapshots()),
      [{ slug: body.slug, postId: x.post.id }],
    );
    const cover = projected.posts[0].snapshot.responsiveCover!;
    expect(validateBlogResponsiveCover(cover, body.coverImageUrl)).toBe(true);
    expect(cover.width).toBe(1280);
    expect(JSON.stringify(cover)).not.toMatch(/mediaId|sha256|sourceFingerprint|source.png/);
  });
  it("preserves omission, rejects older-client cover replacement, and permits explicit clear", async () => {
    const x = await stage();
    const saved = await mutateBlogPublication(x.post.id, user.id, x.proof, "save", { data: body });
    expect((await getBlogPublication(x.post.id)).coverImageSet).toEqual(set);
    await expect(
      mutateBlogPublication(
        x.post.id,
        user.id,
        { ...x.proof, expectedVersion: saved.version },
        "save",
        { data: { ...body, coverImageUrl: null } },
      ),
    ).rejects.toMatchObject({ code: "BLOG_COVER_SET_CHANGED" });
    await mutateBlogPublication(
      x.post.id,
      user.id,
      { ...x.proof, expectedVersion: saved.version },
      "save",
      { data: { ...body, coverImageUrl: null, coverImageSet: null } },
    );
    expect((await getBlogPublication(x.post.id)).coverImageSet).toBeNull();
  });
  it("restores the original verified set after an explicit cover clear", async () => {
    const x = await stage();
    const initial = await getBlogPublication(x.post.id);
    const cleared = await mutateBlogPublication(x.post.id, user.id, x.proof, "save", {
      data: { ...body, coverImageUrl: null, coverImageSet: null },
    });
    await mutateBlogPublication(
      x.post.id,
      user.id,
      { ...x.proof, expectedVersion: cleared.version },
      "restore",
      { revisionId: initial.publication.draftRevisionId! },
    );
    expect((await getBlogPublication(x.post.id)).coverImageSet).toEqual(set);
  });
  it("rejects substituted ledgers and registered asset metadata without partial receipt state", async () => {
    await expect(stage({ ...set, sourceFingerprint: "f".repeat(64) })).rejects.toMatchObject({
      code: "BLOG_COVER_SET_UNTRUSTED",
    });
    expect(await db.select().from(cmsMedia)).toHaveLength(0);
    expect(await db.select().from(blogPostRevisions)).toHaveLength(1);
  });
  it("revalidates registered rows and rejects modified or receipt-free sets", async () => {
    const x = await stage();
    await db.update(cmsMedia).set({ fileSize: 999 }).where(eq(cmsMedia.id, "v480"));
    await expect(
      mutateBlogPublication(x.post.id, user.id, x.proof, "publish"),
    ).rejects.toMatchObject({ code: "BLOG_COVER_SET_UNTRUSTED" });
    await db.update(cmsMedia).set({ fileSize: 480 }).where(eq(cmsMedia.id, "v480"));
    await expect(
      mutateBlogPublication(x.post.id, user.id, x.proof, "save", {
        data: { ...body, coverImageSet: { ...set, mediaReviewSha256: "f".repeat(64) } },
      }),
    ).rejects.toMatchObject({ code: "BLOG_COVER_SET_UNTRUSTED" });
    const other = await createBlogPublication({ ...body, slug: "other" }, user, randomUUID());
    await expect(
      mutateBlogPublication(
        other.id,
        user.id,
        {
          expectedVersion: 1,
          editorInstanceId: other.lease.lock!.editorInstanceId!,
          leaseId: other.lease.lock!.id,
        },
        "save",
        { data: { ...body, slug: "other", coverImageSet: set } },
      ),
    ).rejects.toMatchObject({ code: "BLOG_COVER_SET_UNTRUSTED" });
  });
  it("protects immutable asset IDs even if mutable registry URLs and keys drift", async () => {
    await stage();
    const [changed] = await db
      .update(cmsMedia)
      .set({ url: "https://changed.example.test/new.png", r2Key: "cms/unrelated/new.png" })
      .where(eq(cmsMedia.id, set.original.mediaId))
      .returning();
    const operation = vi.fn();
    await expect(protectBlogRevisionMedia(changed, null, operation)).rejects.toMatchObject({
      code: "BLOG_REVISION_MEDIA_REFERENCED",
    });
    expect(operation).not.toHaveBeenCalled();
  });
  it("blocks deletion and replacement of every original and derivative after clearing", async () => {
    const x = await stage();
    await mutateBlogPublication(x.post.id, user.id, x.proof, "save", {
      data: { ...body, coverImageUrl: null, coverImageSet: null },
    });
    for (const image of [set.original, ...set.variants]) {
      const operation = vi.fn();
      await expect(
        protectBlogRevisionMedia(
          { url: `https://cdn.example.test/${image.mediaId}`, r2Key: image.url.slice(4) },
          null,
          operation,
        ),
      ).rejects.toMatchObject({ code: "BLOG_REVISION_MEDIA_REFERENCED" });
      expect(operation).not.toHaveBeenCalled();
    }
  });
});
describe("bounded responsive cover shape", () => {
  it("rejects unsafe URLs, duplicate identities, incorrect default and size metadata", () => {
    expect(validateBlogCoverImageSet(set, body.coverImageUrl)).toBe(true);
    for (const change of [
      (s: BlogCoverImageSet) => (s.variants[0].url = "/r2/cms/../bad.webp"),
      (s: BlogCoverImageSet) => (s.variants[0].mediaId = s.original.mediaId),
      (s: BlogCoverImageSet) => (s.defaultMediaId = "v480"),
      (s: BlogCoverImageSet) => (s.variants[0].height = 263),
      (s: BlogCoverImageSet) => s.variants.reverse(),
    ]) {
      const altered = structuredClone(set);
      change(altered);
      expect(validateBlogCoverImageSet(altered, body.coverImageUrl)).toBe(false);
    }
  });
});
