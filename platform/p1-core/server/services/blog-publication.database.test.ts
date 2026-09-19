import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { migrate } from "drizzle-orm/node-postgres/migrator";
const fixture = vi.hoisted(() => ({ url: process.env.BLOG_PUBLICATION_TEST_DATABASE_URL }));
vi.mock("../db", async () => {
  const pg = await import("pg"),
    { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new pg.default.Pool({ connectionString: fixture.url, max: 8 });
  return { db: drizzle(pool), pool };
});
import { db, pool } from "../db";
import {
  initializeBlogPublication,
  mutateBlogPublication as mutate,
  readPublishedBlog as read,
} from "./blog-publication.service";
import { blogPublicationLease as lease } from "./blog-publication-leases.service";
import { blogPosts, type User } from "@shared/schema";
import { blogPostRevisions as revisions } from "@shared/schema/blog-publications";
import { eq } from "drizzle-orm";
const user = {
  id: "fixture-user",
  role: "admin",
  email: "fixture@example.test",
  firstName: "Fixture",
  lastName: "Editor",
} as User;
const provenance = {
  kind: "legacy-adoption" as const,
  sourceReference: "fixture",
  reason: "Explicit adoption",
};
const suite = fixture.url ? describe : describe.skip;
suite("Blog publication actual PostgreSQL", () => {
  beforeAll(async () => {
    const u = new URL(fixture.url!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) ||
      !/test|fixture|acceptance/.test(u.pathname)
    )
      throw new Error("Loopback fixture database required");
    await migrate(db, { migrationsFolder: "p1-migrations" });
    await migrate(db, { migrationsFolder: "p1-migrations" });
  }, 30000);
  beforeEach(async () => {
    await pool.query(
      "TRUNCATE blog_publication_routes,blog_post_revisions,blog_publication_state,blog_posts,editor_locks CASCADE",
    );
  });
  afterAll(async () => {
    await pool.end();
  });
  async function setup(slug = "test-article") {
    const [legacy] = await db
      .insert(blogPosts)
      .values({
        title: "Original",
        slug,
        content: "<p>Original</p>",
        authorName: "Author",
        categories: ["Care"],
        tags: ["Land"],
        isPublished: true,
      })
      .returning();
    const state = await initializeBlogPublication(legacy.id, user.id, provenance),
      instance = randomUUID();
    const l = await lease("acquire", legacy.id, user, { editorInstanceId: instance });
    const [r] = await db.select().from(revisions).where(eq(revisions.id, state.draftRevisionId));
    return {
      legacy,
      state,
      snapshot: r.snapshot,
      proof: { expectedVersion: 1, editorInstanceId: instance, leaseId: l.lock!.id },
    };
  }
  it("detects unsupported push planner composite-constraint churn without applying changes", async () => {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { pushSchema } = await import("drizzle-kit/api");
    const schema = await import("@shared/schema/blog-publications");
    const readOnly = new Pool({
      connectionString: fixture.url,
      options: "-c default_transaction_read_only=on",
    });
    try {
      const plan = await pushSchema(
        schema,
        drizzle(readOnly),
        ["public"],
        ["blog_publication_state", "blog_post_revisions", "blog_publication_routes"],
      );
      // Installed Drizzle introspection does not pair composite FK ordinals and
      // cannot represent deferral/triggers. A zero-drift claim would be false.
      const drops = plan.statementsToExecute.filter(
        (statement) => /DROP CONSTRAINT/i.test(statement) && /blog_/.test(statement),
      );
      expect(drops.length).toBeGreaterThan(0);
      const knownCompositeNames = [
        "blog_post_revisions_post_id_id_key",
        "blog_publication_routes_post_id_revision_id_fkey",
        "blog_draft_pointer",
        "blog_published_pointer",
        "blog_last_published_pointer",
      ];
      expect(
        drops.every((statement) =>
          knownCompositeNames.some((name) => statement.includes(`"${name}"`)),
        ),
      ).toBe(true);
      expect(
        plan.statementsToExecute.some(
          (statement) => /DROP TABLE/i.test(statement) && /blog_/.test(statement),
        ),
      ).toBe(false);
    } finally {
      await readOnly.end();
    }
  }, 30000);
  it("keeps all publication foreign keys deferred and immutability enabled in PostgreSQL", async () => {
    const fks = (
      await pool.query(
        "SELECT condeferrable,condeferred FROM pg_constraint WHERE contype='f' AND conrelid IN ('blog_publication_state'::regclass,'blog_post_revisions'::regclass,'blog_publication_routes'::regclass)",
      )
    ).rows;
    const { getTableConfig } = await import("drizzle-orm/pg-core");
    const schema = await import("@shared/schema/blog-publications");
    const declared = [
      schema.blogPublicationState,
      schema.blogPostRevisions,
      schema.blogPublicationRoutes,
    ]
      .flatMap((table) => {
        const config = getTableConfig(table);
        return [
          ...config.foreignKeys.map((key) => key.getName()),
          ...config.checks.map((check) => check.name),
          ...config.uniqueConstraints.map((key) => key.getName()),
        ];
      })
      .sort();
    const actual = (
      await pool.query(
        "SELECT conname FROM pg_constraint WHERE contype IN ('f','c','u') AND conrelid IN ('blog_publication_state'::regclass,'blog_post_revisions'::regclass,'blog_publication_routes'::regclass)",
      )
    ).rows
      .map((row) => row.conname)
      .sort();
    expect(declared).toEqual(actual);
    expect(fks).toHaveLength(6);
    expect(fks.every((row) => row.condeferrable && row.condeferred)).toBe(true);
    expect(
      (await pool.query("SELECT tgenabled FROM pg_trigger WHERE tgname='blog_revisions_immutable'"))
        .rows,
    ).toEqual([{ tgenabled: "O" }]);
  });
  it("adopts only explicitly, leaves legacy untouched/unpublished, preserves provenance", async () => {
    const x = await setup();
    expect(await read(x.legacy.slug)).toBeNull();
    expect((await db.select().from(blogPosts))[0]).toEqual(x.legacy);
    expect((await db.select().from(revisions))[0].provenance.legacyRecord).toMatchObject({
      id: x.legacy.id,
      isPublished: true,
    });
    await expect(initializeBlogPublication(x.legacy.id, user.id, provenance)).rejects.toMatchObject(
      { code: "BLOG_ALREADY_INITIALIZED" },
    );
    await expect(
      initializeBlogPublication(x.legacy.id, user.id, { ...provenance, reason: " " }),
    ).rejects.toThrow();
  });
  it("enforces strict snapshots and immutable revisions; one simultaneous save wins", async () => {
    const x = await setup();
    await expect(
      mutate(x.legacy.id, user.id, x.proof, "save", {
        data: { ...x.snapshot, unknown: true } as any,
      }),
    ).rejects.toThrow();
    const result = await Promise.allSettled(
      ["A", "B"].map((title) =>
        mutate(x.legacy.id, user.id, x.proof, "save", { data: { ...x.snapshot, title } }),
      ),
    );
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((result.find((r) => r.status === "rejected") as PromiseRejectedResult).reason.code).toBe(
      "BLOG_STALE",
    );
    expect(await db.select().from(revisions)).toHaveLength(2);
    await expect(pool.query("UPDATE blog_post_revisions SET action='save'")).rejects.toThrow(
      "immutable",
    );
    await expect(pool.query("DELETE FROM blog_post_revisions")).rejects.toThrow("immutable");
  });
  it("fences same-user other instance, stale release and expired proof", async () => {
    const x = await setup(),
      other = randomUUID();
    expect(
      (await lease("acquire", x.legacy.id, user, { editorInstanceId: other })).ownedByCurrentEditor,
    ).toBe(false);
    await lease("release", x.legacy.id, user, {
      editorInstanceId: other,
      leaseId: x.proof.leaseId,
    });
    await expect(
      mutate(x.legacy.id, user.id, { ...x.proof, editorInstanceId: other }, "publish"),
    ).rejects.toMatchObject({ code: "BLOG_LEASE_LOST" });
    await pool.query("UPDATE editor_locks SET expires_at=clock_timestamp()-interval '1 second'");
    await expect(mutate(x.legacy.id, user.id, x.proof, "publish")).rejects.toMatchObject({
      code: "BLOG_LEASE_LOST",
    });
  });
  it("save/restore remain drafts; withdrawal retains private history and durable tombstone", async () => {
    const x = await setup(),
      p = await mutate(x.legacy.id, user.id, x.proof, "publish");
    const s = await mutate(
      x.legacy.id,
      user.id,
      { ...x.proof, expectedVersion: p.version },
      "save",
      { data: { ...x.snapshot, title: "Draft" } },
    );
    expect((await read(x.legacy.slug))!.snapshot.title).toBe("Original");
    const r = await mutate(
      x.legacy.id,
      user.id,
      { ...x.proof, expectedVersion: s.version },
      "restore",
      { revisionId: x.state.draftRevisionId },
    );
    expect(r.publishedRevisionId).toBe(p.publishedRevisionId);
    expect(r.draftRevisionId).not.toBe(x.state.draftRevisionId);
    const u = await mutate(
      x.legacy.id,
      user.id,
      { ...x.proof, expectedVersion: r.version },
      "unpublish",
    );
    expect(u.publishedRevisionId).toBeNull();
    expect(u.lastPublishedRevisionId).toBe(p.publishedRevisionId);
    expect(await read(x.legacy.slug)).toBeNull();
    expect(
      (await pool.query("SELECT state,revision_id FROM blog_publication_routes")).rows,
    ).toEqual([{ state: "withdrawn", revision_id: null }]);
  });
  it("withdraws old slug atomically and refuses another post's tombstone", async () => {
    const x = await setup(),
      p = await mutate(x.legacy.id, user.id, x.proof, "publish");
    const s = await mutate(
      x.legacy.id,
      user.id,
      { ...x.proof, expectedVersion: p.version },
      "save",
      { data: { ...x.snapshot, slug: "new-slug" } },
    );
    await mutate(x.legacy.id, user.id, { ...x.proof, expectedVersion: s.version }, "publish");
    expect(await read("test-article")).toBeNull();
    expect(await read("new-slug")).not.toBeNull();
    const y = await setup("another-post"),
      ys = await mutate(y.legacy.id, user.id, y.proof, "save", {
        data: { ...y.snapshot, slug: "test-article" },
      });
    await expect(
      mutate(y.legacy.id, user.id, { ...y.proof, expectedVersion: ys.version }, "publish"),
    ).rejects.toMatchObject({ code: "BLOG_SLUG_OWNED" });
  });
  it("reserves five static article slugs", async () => {
    const x = await setup("signs-property-drainage-problem");
    await expect(mutate(x.legacy.id, user.id, x.proof, "publish")).rejects.toMatchObject({
      code: "BLOG_WEBSITE_OWNED_SLUG",
    });
  });
  it("blocks every mutation on legacy writer drift", async () => {
    const x = await setup();
    await pool.query("UPDATE blog_posts SET title='Legacy changed' WHERE id=$1", [x.legacy.id]);
    for (const action of ["save", "publish", "unpublish", "restore", "delete"] as const)
      await expect(
        mutate(
          x.legacy.id,
          user.id,
          x.proof,
          action,
          action === "save"
            ? { data: x.snapshot }
            : action === "restore"
              ? { revisionId: x.state.draftRevisionId }
              : {},
        ),
      ).rejects.toMatchObject({ code: "BLOG_LEGACY_DRIFT" });
    expect(await db.select().from(revisions)).toHaveLength(1);
  });
  it("rolls back version/revision/pointers on route insertion failure", async () => {
    const x = await setup();
    await pool.query(
      "CREATE FUNCTION fixture_fail_route() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$; CREATE TRIGGER fixture_fail_route BEFORE INSERT ON blog_publication_routes FOR EACH ROW EXECUTE FUNCTION fixture_fail_route()",
    );
    try {
      await expect(mutate(x.legacy.id, user.id, x.proof, "publish")).rejects.toThrow();
      expect(await db.select().from(revisions)).toHaveLength(1);
      expect(
        (await pool.query("SELECT version,visibility FROM blog_publication_state")).rows[0],
      ).toEqual({ version: 1, visibility: "unpublished" });
    } finally {
      await pool.query(
        "DROP TRIGGER fixture_fail_route ON blog_publication_routes; DROP FUNCTION fixture_fail_route()",
      );
    }
  });
  it("soft delete preserves history and prevents future mutation", async () => {
    const x = await setup(),
      p = await mutate(x.legacy.id, user.id, x.proof, "publish"),
      d = await mutate(x.legacy.id, user.id, { ...x.proof, expectedVersion: p.version }, "delete");
    expect(d.visibility).toBe("deleted");
    expect(await read(x.legacy.slug)).toBeNull();
    expect(await db.select().from(revisions)).toHaveLength(3);
    await expect(
      mutate(x.legacy.id, user.id, { ...x.proof, expectedVersion: d.version }, "publish"),
    ).rejects.toMatchObject({ code: "BLOG_DELETED" });
  });
  it("rolls back explicit adoption if initial revision insertion fails", async () => {
    const [legacy] = await db
      .insert(blogPosts)
      .values({ title: "Retained", slug: "retained", content: "Body", authorName: "Author" })
      .returning();
    await pool.query(
      "CREATE FUNCTION fixture_fail_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture revision failure'; END $$; CREATE TRIGGER fixture_fail_revision BEFORE INSERT ON blog_post_revisions FOR EACH ROW EXECUTE FUNCTION fixture_fail_revision()",
    );
    try {
      await expect(initializeBlogPublication(legacy.id, user.id, provenance)).rejects.toThrow();
      expect((await pool.query("SELECT * FROM blog_publication_state")).rowCount).toBe(0);
      expect((await db.select().from(blogPosts))[0]).toEqual(legacy);
    } finally {
      await pool.query(
        "DROP TRIGGER fixture_fail_revision ON blog_post_revisions; DROP FUNCTION fixture_fail_revision()",
      );
    }
  });
  it("serializes competing slug claims with one coherent winner", async () => {
    const a = await setup("alpha"),
      b = await setup("beta");
    const sa = await mutate(a.legacy.id, user.id, a.proof, "save", {
      data: { ...a.snapshot, slug: "contested" },
    });
    const sb = await mutate(b.legacy.id, user.id, b.proof, "save", {
      data: { ...b.snapshot, slug: "contested" },
    });
    const result = await Promise.allSettled(
      [
        [a, sa],
        [b, sb],
      ].map(([x, s]: any) =>
        mutate(x.legacy.id, user.id, { ...x.proof, expectedVersion: s.version }, "publish"),
      ),
    );
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((result.find((r) => r.status === "rejected") as PromiseRejectedResult).reason.code).toBe(
      "BLOG_SLUG_OWNED",
    );
    expect((await pool.query("SELECT * FROM blog_publication_routes")).rowCount).toBe(1);
    expect(await read("contested")).not.toBeNull();
  });
  it("old lease generation cannot release or mutate after expiry and reacquisition", async () => {
    const x = await setup();
    await pool.query("UPDATE editor_locks SET expires_at=clock_timestamp()-interval '1 second'");
    const next = await lease("acquire", x.legacy.id, user, {
      editorInstanceId: x.proof.editorInstanceId,
    });
    expect(next.lock!.id).not.toBe(x.proof.leaseId);
    await lease("release", x.legacy.id, user, {
      editorInstanceId: x.proof.editorInstanceId,
      leaseId: x.proof.leaseId,
    });
    await expect(mutate(x.legacy.id, user.id, x.proof, "publish")).rejects.toMatchObject({
      code: "BLOG_LEASE_LOST",
    });
    await expect(
      mutate(x.legacy.id, user.id, { ...x.proof, leaseId: next.lock!.id }, "publish"),
    ).resolves.toMatchObject({ visibility: "published" });
  });
});
