import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { migrate } from "drizzle-orm/node-postgres/migrator";
const fixture = vi.hoisted(() => ({ url: process.env.BLOG_CUTOVER_TEST_DATABASE_URL }));
vi.mock("../db", async () => {
  const pg = await import("pg"),
    { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new pg.default.Pool({ connectionString: fixture.url, max: 8 });
  return { pool, db: drizzle(pool) };
});
import { db, pool } from "../db";
import { blogPosts, cmsMedia, type User } from "@shared/schema";
import { blogPublicationSchedules } from "@shared/schema/blog-publications";
import {
  createBlogPublication,
  adoptBlogPublication,
  getBlogPublication,
  previewBlogRevision,
} from "./blog-publication-editor.service";
import {
  mutateBlogPublication as mutate,
  publishDueBlogPublications,
  listPublishedBlogSnapshots,
} from "./blog-publication.service";
import { blogPublicationLease as lease } from "./blog-publication-leases.service";
import { BlogStorage } from "../storage/blog.storage";
import { protectBlogRevisionMedia } from "./blog-media-protection.service";
import { eq } from "drizzle-orm";
const user = {
  id: "fixture-user",
  role: "admin",
  firstName: "Fixture",
  lastName: "Owner",
  email: "fixture@example.test",
} as User;
const body = {
  title: "Original",
  slug: "article",
  excerpt: null,
  content: "<p>Body</p>",
  authorName: "Author",
  coverImageUrl: null,
  coverImagePositionX: 50,
  coverImagePositionY: 50,
  category: "Care",
  categories: ["Care"],
  tags: ["Land"],
  postType: "article",
  podcastUrl: null,
  externalUrl: null,
  sidebarId: null,
  seoTitle: null,
  seoDescription: null,
  ogImageUrl: null,
  noindex: false,
};
const suite = fixture.url ? describe : describe.skip;
suite("Blog cutover actual PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(fixture.url!);
    if (url.hostname !== "127.0.0.1" || !url.pathname.includes("test"))
      throw new Error("Loopback fixture required");
    await migrate(db, { migrationsFolder: "p1-migrations" });
  }, 30000);
  beforeEach(async () => {
    await pool.query(
      "TRUNCATE blog_publication_schedules,blog_publication_routes,blog_post_revisions,blog_publication_state,blog_posts,editor_locks CASCADE",
    );
  });
  afterAll(async () => {
    await pool.end();
  });
  async function setup(data = body) {
    const instance = randomUUID();
    const post = await createBlogPublication(data, user, instance);
    return {
      post,
      proof: {
        expectedVersion: post.publication.version!,
        editorInstanceId: instance,
        leaseId: post.lease.lock!.id,
      },
    };
  }
  it("atomically creates unpublished identity, revision and exact lease", async () => {
    const x = await setup();
    expect(x.post.publication.visibility).toBe("unpublished");
    expect(x.post.lease.ownedByCurrentEditor).toBe(true);
    expect(await listPublishedBlogSnapshots()).toEqual([]);
    await expect(
      createBlogPublication({ ...body, slug: "invalid-lease" }, user, "bad"),
    ).rejects.toThrow();
    expect(await db.select().from(blogPosts)).toHaveLength(1);
  });
  it("adoption fingerprints block unseen changes and converts only same-user legacy locks", async () => {
    const [legacy] = await db
      .insert(blogPosts)
      .values({ ...body, isPublished: true })
      .returning();
    const before = await getBlogPublication(legacy.id);
    await lease("acquire", legacy.id, user, {}, true);
    await pool.query("UPDATE blog_posts SET title='Changed' WHERE id=$1", [legacy.id]);
    await expect(
      adoptBlogPublication(
        legacy.id,
        user,
        before.publication.legacyFingerprint,
        randomUUID(),
        "Explicit adoption",
      ),
    ).rejects.toMatchObject({ code: "BLOG_LEGACY_STALE" });
    const fresh = await getBlogPublication(legacy.id);
    const adopted = await adoptBlogPublication(
      legacy.id,
      user,
      fresh.publication.legacyFingerprint,
      randomUUID(),
      "Explicit adoption",
    );
    expect(adopted.isPublished).toBe(false);
    expect(adopted.lease.ownedByCurrentEditor).toBe(true);
    await expect(lease("release", legacy.id, user, {}, true)).rejects.toMatchObject({
      code: "CMS_CONCURRENCY_REQUIRED",
    });
    expect((await pool.query("SELECT id FROM editor_locks")).rows[0].id).toBe(
      adopted.lease.lock!.id,
    );
  });
  it("fails creation atomically when revision insertion rejects", async () => {
    await pool.query(
      "CREATE FUNCTION cutover_fail_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture'; END $$; CREATE TRIGGER cutover_fail_revision BEFORE INSERT ON blog_post_revisions FOR EACH ROW EXECUTE FUNCTION cutover_fail_revision()",
    );
    try {
      await expect(setup()).rejects.toThrow();
      expect(await db.select().from(blogPosts)).toHaveLength(0);
      expect((await pool.query("SELECT * FROM editor_locks")).rowCount).toBe(0);
    } finally {
      await pool.query(
        "DROP TRIGGER cutover_fail_revision ON blog_post_revisions;DROP FUNCTION cutover_fail_revision()",
      );
    }
  });
  it("pins scheduled revision while later draft edits remain private", async () => {
    const x = await setup();
    const queued = await mutate(x.post.id, user.id, x.proof, "schedule", {
      data: { ...body, title: "Pinned" },
      scheduledAt: new Date(Date.now() + 60000),
    });
    await mutate(x.post.id, user.id, { ...x.proof, expectedVersion: queued.version }, "save", {
      data: { ...body, title: "Later draft" },
    });
    await pool.query(
      "UPDATE blog_publication_schedules SET scheduled_at=clock_timestamp()-interval '1 second'",
    );
    expect(await publishDueBlogPublications()).toBe(1);
    expect(await publishDueBlogPublications()).toBe(0);
    expect((await listPublishedBlogSnapshots())[0].snapshot.title).toBe("Pinned");
    expect((await getBlogPublication(x.post.id)).title).toBe("Later draft");
  });
  it("cancel and manual publication supersede pending jobs", async () => {
    const x = await setup();
    const q = await mutate(x.post.id, user.id, x.proof, "schedule", {
      scheduledAt: new Date(Date.now() + 60000),
    });
    const c = await mutate(
      x.post.id,
      user.id,
      { ...x.proof, expectedVersion: q.version },
      "cancel_schedule",
    );
    const q2 = await mutate(
      x.post.id,
      user.id,
      { ...x.proof, expectedVersion: c.version },
      "schedule",
      { scheduledAt: new Date(Date.now() + 60000) },
    );
    await mutate(x.post.id, user.id, { ...x.proof, expectedVersion: q2.version }, "publish", {
      data: { ...body, title: "Manual" },
    });
    expect(
      (await db.select().from(blogPublicationSchedules)).every((row) => row.status === "cancelled"),
    ).toBe(true);
    expect(await publishDueBlogPublications()).toBe(0);
  });
  it("scheduler versus cancel is serialized and cannot resurrect content", async () => {
    const x = await setup();
    const q = await mutate(x.post.id, user.id, x.proof, "schedule", {
      scheduledAt: new Date(Date.now() + 60000),
    });
    await pool.query(
      "UPDATE blog_publication_schedules SET scheduled_at=clock_timestamp()-interval '1 second'",
    );
    await Promise.allSettled([
      publishDueBlogPublications(),
      mutate(x.post.id, user.id, { ...x.proof, expectedVersion: q.version }, "unpublish"),
    ]);
    const after = await getBlogPublication(x.post.id);
    await mutate(
      x.post.id,
      user.id,
      { ...x.proof, expectedVersion: after.publication.version! },
      "unpublish",
    );
    expect(await publishDueBlogPublications()).toBe(0);
    expect(await listPublishedBlogSnapshots()).toEqual([]);
  });
  it("fences legacy writes/taxonomy rewrites and public views ignore stale legacy flags", async () => {
    const x = await setup();
    const storage = new BlogStorage();
    await expect(storage.updatePost(x.post.id, { title: "Bypass" })).rejects.toMatchObject({
      code: "BLOG_PUBLICATION_REQUIRED",
    });
    await expect(storage.deletePost(x.post.id)).rejects.toMatchObject({
      code: "BLOG_PUBLICATION_REQUIRED",
    });
    await storage.renameCategoryReferences("Care", "Renamed");
    await storage.renameTagReferences("Land", null);
    expect((await getBlogPublication(x.post.id)).categories).toEqual(["Care"]);
    const p = await mutate(x.post.id, user.id, x.proof, "publish", {
      data: { ...body, slug: "new-public-slug" },
    });
    expect((await storage.getPostBySlug("new-public-slug"))?.isPublished).toBe(true);
    expect(await storage.getPostBySlug("article")).toBeUndefined();
    await mutate(x.post.id, user.id, { ...x.proof, expectedVersion: p.version }, "unpublish");
    expect(await storage.getPostBySlug("new-public-slug")).toBeUndefined();
  });
  it("sanitizes private preview and refuses another post's revision", async () => {
    const x = await setup({
      ...body,
      content: '<script>alert(1)</script><p onclick="x()">Safe</p>',
      externalUrl: "https://user:pass@example.test",
    });
    const y = await setup({ ...body, slug: "other" });
    const preview = await previewBlogRevision(x.post.id);
    expect(preview.snapshot.content).toBe("<p>Safe</p>");
    expect(preview.snapshot.externalUrl).toBeNull();
    await expect(
      previewBlogRevision(x.post.id, y.post.publication.draftRevisionId!),
    ).rejects.toMatchObject({ code: "BLOG_REVISION_NOT_FOUND" });
  });
  it("rejects unsupported action fields and whitespace-only titles", async () => {
    const x = await setup();
    await expect(
      mutate(x.post.id, user.id, x.proof, "delete", { data: body }),
    ).rejects.toMatchObject({ code: "BLOG_ACTION_PAYLOAD" });
    await expect(
      mutate(x.post.id, user.id, x.proof, "save", { data: { ...body, title: "  " } }),
    ).rejects.toThrow();
  });
  it("accepts oversized drafts but rejects publication and scheduling atomically", async () => {
    const x = await setup({ ...body, content: "x".repeat(262145) });
    for (const action of ["publish", "schedule"] as const)
      await expect(
        mutate(
          x.post.id,
          user.id,
          x.proof,
          action,
          action === "schedule" ? { scheduledAt: new Date(Date.now() + 60000) } : {},
        ),
      ).rejects.toMatchObject({ code: "BLOG_PUBLICATION_LIMIT" });
    expect((await getBlogPublication(x.post.id)).publication.version).toBe(1);
    expect(await listPublishedBlogSnapshots()).toEqual([]);
  });
  it("resolves registered R2 images for acceptance without changing immutable drafts", async () => {
    const url = `https://fixture-assets.example.test/${randomUUID()}.webp`;
    const [asset] = await db
      .insert(cmsMedia)
      .values({
        filename: "fixture.webp",
        originalName: "fixture.webp",
        url,
        mimeType: "image/webp",
        fileSize: 123,
        r2Key: "cms/fixture.webp",
      })
      .returning();
    try {
      const x = await setup({
        ...body,
        coverImageUrl: url,
        content: `<p>Photo</p><img src="${url}">`,
      });
      await mutate(x.post.id, user.id, x.proof, "publish", {});
      expect((await listPublishedBlogSnapshots())[0].snapshot.coverImageUrl).toBe(url);
      const current = await getBlogPublication(x.post.id);
      expect(current.coverImageUrl).toBe(url);
      await expect(
        mutate(
          x.post.id,
          user.id,
          { ...x.proof, expectedVersion: current.publication.version! },
          "publish",
          { data: { ...body, coverImageUrl: "https://unknown.example.test/missing.webp" } },
        ),
      ).rejects.toMatchObject({ code: "BLOG_PUBLICATION_LIMIT" });
      expect((await getBlogPublication(x.post.id)).publication.version).toBe(
        current.publication.version,
      );
    } finally {
      await db.delete(cmsMedia).where(eq(cmsMedia.id, asset.id));
    }
  });
  it("blocks destructive media operations for entity and percent encoded immutable references", async () => {
    for (const [index, src] of [
      "/r2/cms/photo&#46;webp",
      "/r2/cms/photo%2Ewebp",
      "/r2/cms/photo&period;webp",
    ].entries()) {
      await setup({ ...body, slug: `encoded-${index}`, content: `<p>Image</p><img src="${src}">` });
      const destructiveOperation = vi.fn();
      await expect(
        protectBlogRevisionMedia(
          { url: "https://assets.example.test/photo.webp", r2Key: "cms/photo.webp" },
          null,
          destructiveOperation,
        ),
      ).rejects.toMatchObject({ code: "BLOG_REVISION_MEDIA_REFERENCED" });
      expect(destructiveOperation).not.toHaveBeenCalled();
      // Isolate each spelling so an earlier matching revision cannot hide a miss.
      await pool.query(
        "TRUNCATE blog_publication_schedules,blog_publication_routes,blog_post_revisions,blog_publication_state,blog_posts,editor_locks CASCADE",
      );
    }
  });
  it("retains all revision media against replacement/delete after withdrawal", async () => {
    const x = await setup({ ...body, coverImageUrl: "/uploads/cms/keep.webp" });
    const operation = vi.fn();
    await expect(
      protectBlogRevisionMedia(
        { url: "https://www.p1landmanagement.com/uploads/cms/keep.webp", r2Key: null },
        null,
        operation,
      ),
    ).rejects.toMatchObject({ code: "BLOG_REVISION_MEDIA_REFERENCED" });
    expect(operation).not.toHaveBeenCalled();
    await protectBlogRevisionMedia(
      { url: "/uploads/cms/unused.webp", r2Key: null },
      null,
      async () => {
        operation();
      },
    );
    expect(operation).toHaveBeenCalledOnce();
  });
  it("fails a due job safely when another post acquires its pinned slug", async () => {
    const x = await setup();
    const q = await mutate(x.post.id, user.id, x.proof, "schedule", {
      data: { ...body, slug: "reserved-later" },
      scheduledAt: new Date(Date.now() + 60000),
    });
    const y = await setup({ ...body, slug: "second" });
    await mutate(y.post.id, user.id, y.proof, "publish", {
      data: { ...body, slug: "reserved-later" },
    });
    await pool.query(
      "UPDATE blog_publication_schedules SET scheduled_at=clock_timestamp()-interval '1 second'",
    );
    expect(await publishDueBlogPublications()).toBe(0);
    expect(await publishDueBlogPublications()).toBe(0);
    const failed = await getBlogPublication(x.post.id);
    expect(failed.publication.schedule).toMatchObject({
      status: "failed",
      failureCode: "BLOG_SLUG_OWNED",
    });
    expect(failed.publication.version).toBe(q.version + 1);
    expect((await listPublishedBlogSnapshots())[0].id).toBe(y.post.id);
  });
  it("does not publish adopted rows through the legacy scheduler", async () => {
    const legacy = new BlogStorage();
    const row = await legacy.createPost({
      ...body,
      isPublished: false,
      scheduledAt: new Date(Date.now() - 60000),
    });
    const env = await getBlogPublication(row.id);
    await adoptBlogPublication(
      row.id,
      user,
      env.publication.legacyFingerprint,
      randomUUID(),
      "Adopt scheduled legacy draft",
    );
    expect(await legacy.publishScheduledPosts()).toBe(0);
    expect(await listPublishedBlogSnapshots()).toEqual([]);
  });
  it("retains first publication date while modified date advances", async () => {
    const x = await setup();
    const p = await mutate(x.post.id, user.id, x.proof, "publish");
    const first = (await listPublishedBlogSnapshots())[0];
    await mutate(x.post.id, user.id, { ...x.proof, expectedVersion: p.version }, "publish", {
      data: { ...body, title: "Updated" },
    });
    const second = (await listPublishedBlogSnapshots())[0];
    expect(second.publishedAt).toEqual(first.publishedAt);
    expect(second.modifiedAt!.getTime()).toBeGreaterThanOrEqual(first.modifiedAt!.getTime());
  });
  it("does not allow publication to steal an unadopted legacy slug", async () => {
    const x = await setup();
    await new BlogStorage().createPost({ ...body, slug: "legacy-owned" });
    await expect(
      mutate(x.post.id, user.id, x.proof, "publish", { data: { ...body, slug: "legacy-owned" } }),
    ).rejects.toMatchObject({ code: "BLOG_SLUG_OWNED" });
  });
  it("allows one simultaneous adoption and rejects foreign legacy lock ownership", async () => {
    const legacy = new BlogStorage();
    const row = await legacy.createPost(body);
    const env = await getBlogPublication(row.id);
    await lease("acquire", row.id, { ...user, id: "another-user" }, {}, true);
    await expect(
      adoptBlogPublication(row.id, user, env.publication.legacyFingerprint, randomUUID(), "Adopt"),
    ).rejects.toMatchObject({ code: "BLOG_LEASE_LOST" });
    await lease("release", row.id, { ...user, id: "another-user" }, {}, true);
    const outcomes = await Promise.allSettled(
      [randomUUID(), randomUUID()].map((instance) =>
        adoptBlogPublication(
          row.id,
          user,
          env.publication.legacyFingerprint,
          instance,
          "Explicit concurrent adoption",
        ),
      ),
    );
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect((await pool.query("SELECT * FROM blog_publication_state")).rowCount).toBe(1);
  });
});
