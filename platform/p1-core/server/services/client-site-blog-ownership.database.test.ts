import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { eq } from "drizzle-orm";
const fixture = vi.hoisted(() => ({ url: process.env.WEBSITE_GUARD_TEST_DATABASE_URL }));
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({ connectionString: fixture.url, max: 6 });
  return { pool, db: drizzle(pool, { schema }) };
});
import { db, pool } from "../db";
import { users, blogPosts } from "@shared/schema";
import { blogPostRevisions } from "@shared/schema/blog-publications";
import { ClientSiteContentStorage } from "../storage/client-site-content.storage";
import { getClientSiteBlogOwnership, staticBlogSource } from "./client-site-blog-ownership.service";
import { initializeBlogPublication, lockBlogPublication } from "./blog-publication.service";
import {
  recordStaticBlogImportReceipt,
  hashStaticBlogEditorial,
} from "./blog-static-import-receipts.service";
import { STATIC_BLOG_SLUGS } from "@shared/public-blog";
const slug = STATIC_BLOG_SLUGS[0];
const identity = {
  stackId: "p1-land-management",
  routeId: `blog-${slug}`,
  componentKey: `blog-${slug}-content`,
};
const storage = new ClientSiteContentStorage();
const suite = fixture.url ? describe : describe.skip;
suite("Website permanent Blog ownership actual PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(fixture.url!);
    if (
      url.hostname !== "127.0.0.1" ||
      url.port !== "55444" ||
      url.pathname !== "/blog_website_guard_test"
    )
      throw Error("Dedicated loopback guard test database required");
    await migrate(db, { migrationsFolder: "p1-migrations" });
  }, 30000);
  beforeEach(async () => {
    await pool.query(
      "TRUNCATE blog_static_import_receipts,blog_publication_routes,blog_post_revisions,blog_publication_state,blog_posts,editor_locks,client_site_content_revisions,client_site_content,users CASCADE",
    );
    await db.insert(users).values({
      id: "guard-editor",
      email: "guard@example.test",
      password: "fixture-only",
      role: "admin",
    });
  });
  afterAll(async () => {
    await pool.end();
  });
  async function receipt() {
    const [post] = await db
      .insert(blogPosts)
      .values({ title: "Fixture article", slug, content: "<p>Fixture</p>", authorName: "Fixture" })
      .returning();
    const state = await initializeBlogPublication(post.id, "guard-editor", {
      kind: "legacy-adoption",
      sourceReference: "fixture",
      reason: "Review fixture",
    });
    const [revision] = await db
      .select()
      .from(blogPostRevisions)
      .where(eq(blogPostRevisions.id, state.draftRevisionId!));
    return {
      sourceSlug: slug,
      postId: post.id,
      receiptId: "fixture-receipt",
      importedRevisionId: revision.id,
      bundleSha256: "a".repeat(64),
      editorialSha256: hashStaticBlogEditorial(revision.snapshot),
      actorId: "guard-editor",
      sourceManifest: { fixture: true },
    };
  }
  it("matches only the five exact identities, not shared chrome or another stack", () => {
    for (const slug of STATIC_BLOG_SLUGS)
      expect(
        staticBlogSource({
          stackId: identity.stackId,
          routeId: `blog-${slug}`,
          componentKey: `blog-${slug}-content`,
        }),
      ).toBe(slug);
    expect(staticBlogSource({ ...identity, componentKey: "site-chrome" })).toBeUndefined();
    expect(staticBlogSource({ ...identity, stackId: "another-site" })).toBeUndefined();
    expect(staticBlogSource({ ...identity, componentKey: "home-content" })).toBeUndefined();
  });
  it("retains archived draft/history and rejects save, publish and restore after permanent ownership", async () => {
    const saved = await storage.saveDraft(
      identity,
      { heading: "Archived draft" },
      0,
      "guard-editor",
    );
    const proof = await receipt();
    await db.transaction((tx) => recordStaticBlogImportReceipt(tx, proof));
    expect(await getClientSiteBlogOwnership(identity)).toEqual({
      postId: proof.postId,
      sourceSlug: slug,
    });
    for (const operation of [
      () => storage.saveDraft(identity, { heading: "Changed" }, 1, "guard-editor"),
      () => storage.publish(identity, 1, "guard-editor"),
      () => storage.saveDraft(identity, { heading: "Restored" }, 1, "guard-editor", "restore"),
    ])
      await expect(operation()).rejects.toThrow("managed in Blog");
    expect((await storage.get(identity))?.draftContent).toEqual({ heading: "Archived draft" });
    expect(await storage.listRevisions(saved.id)).toHaveLength(1);
    const ordinary = { ...identity, routeId: "home", componentKey: "home-content" };
    await expect(
      storage.saveDraft(ordinary, { heading: "Home" }, 0, "guard-editor"),
    ).resolves.toMatchObject({ draftRevision: 1 });
  });
  it("serializes an already-open Website save behind import and checks committed ownership", async () => {
    await storage.saveDraft(identity, { heading: "Archived" }, 0, "guard-editor");
    const proof = await receipt();
    let entered!: () => void, release!: () => void;
    const locked = new Promise<void>((resolve) => (entered = resolve)),
      gate = new Promise<void>((resolve) => (release = resolve));
    const importing = db.transaction(async (tx) => {
      await lockBlogPublication(tx);
      await recordStaticBlogImportReceipt(tx, proof);
      entered();
      await gate;
    });
    await locked;
    let finished = false;
    const writing = storage
      .saveDraft(identity, { heading: "Must not save" }, 1, "guard-editor")
      .then(
        () => "saved",
        (error) => error.message,
      )
      .finally(() => (finished = true));
    await new Promise((resolve) => setTimeout(resolve, 75));
    expect(finished).toBe(false);
    release();
    await importing;
    expect(await writing).toContain("managed in Blog");
    expect((await storage.get(identity))?.draftContent).toEqual({ heading: "Archived" });
  });
});
