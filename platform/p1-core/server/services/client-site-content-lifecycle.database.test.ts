import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { and, eq } from "drizzle-orm";

const fixture = vi.hoisted(() => ({
  url: process.env.CLIENT_SITE_CONTENT_TEST_DATABASE_URL,
  allowDestructiveFixture: process.env.CLIENT_SITE_CONTENT_TEST_ALLOW_DESTRUCTIVE_FIXTURE,
}));

vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({ connectionString: fixture.url, max: 8 });
  return { pool, db: drizzle(pool, { schema }) };
});

import { db, pool } from "../db";
import { clientSiteContent, users } from "@shared/schema";
import { ClientSiteContentStorage } from "../storage/client-site-content.storage";
import { ClientSiteContentConflictError } from "./client-site-content-workflow";

const identity = {
  stackId: "p1-land-management",
  routeId: "cms-lifecycle-fixture",
  componentKey: "cms-lifecycle-fixture-content",
};
const storage = new ClientSiteContentStorage();
const suite = fixture.url ? describe : describe.skip;

suite("Client Site Content lifecycle on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(fixture.url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
      throw Error("Loopback fixture database required");
    if (url.pathname !== "/p1_client_site_content_lifecycle_test")
      throw Error("Exact dedicated lifecycle fixture database required");
    if (fixture.allowDestructiveFixture !== "true")
      throw Error("Explicit CLIENT_SITE_CONTENT_TEST_ALLOW_DESTRUCTIVE_FIXTURE=true required");
    await migrate(db, { migrationsFolder: "p1-migrations" });
  }, 30000);

  beforeEach(async () => {
    await db
      .delete(clientSiteContent)
      .where(
        and(
          eq(clientSiteContent.stackId, identity.stackId),
          eq(clientSiteContent.routeId, identity.routeId),
          eq(clientSiteContent.componentKey, identity.componentKey),
        ),
      );
    await db.delete(users).where(eq(users.id, "cms-lifecycle-editor"));
    await db.insert(users).values({
      id: "cms-lifecycle-editor",
      email: "cms-lifecycle@example.test",
      password: "fixture-only",
      role: "admin",
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("persists draft, simultaneous-editor conflict, publish, and restore history", async () => {
    const initial = await storage.saveDraft(
      identity,
      { heading: "Initial fixture heading" },
      0,
      "cms-lifecycle-editor",
    );
    expect(initial).toMatchObject({ draftRevision: 1, publishedRevision: null });

    const concurrent = await Promise.allSettled(
      ["Editor one", "Editor two"].map((heading) =>
        storage.saveDraft(identity, { heading }, 1, "cms-lifecycle-editor"),
      ),
    );
    expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = concurrent.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(rejected?.reason).toBeInstanceOf(ClientSiteContentConflictError);

    const afterConcurrentSave = await storage.get(identity);
    expect(afterConcurrentSave).toMatchObject({ draftRevision: 2, publishedRevision: null });
    const published = await storage.publish(
      identity,
      afterConcurrentSave!.draftRevision,
      "cms-lifecycle-editor",
    );
    expect(published).toMatchObject({ draftRevision: 3, publishedRevision: 3 });
    expect(published.publishedContent).toEqual(afterConcurrentSave!.draftContent);

    const originalRevision = await storage.getRevision(initial.id, 1);
    expect(originalRevision?.content).toEqual({ heading: "Initial fixture heading" });
    const restored = await storage.saveDraft(
      identity,
      originalRevision!.content as Record<string, unknown>,
      published.draftRevision,
      "cms-lifecycle-editor",
      "restore",
    );
    expect(restored).toMatchObject({ draftRevision: 4, publishedRevision: 3 });
    expect(restored.publishedContent).toEqual(afterConcurrentSave!.draftContent);

    await expect(
      storage.publish(identity, published.draftRevision, "cms-lifecycle-editor"),
    ).rejects.toBeInstanceOf(ClientSiteContentConflictError);
    expect(
      (await storage.listRevisions(initial.id)).map(({ revision, kind }) => ({ revision, kind })),
    ).toEqual([
      { revision: 4, kind: "restore" },
      { revision: 3, kind: "publish" },
      { revision: 2, kind: "draft-save" },
      { revision: 1, kind: "draft-save" },
    ]);
  });
});
