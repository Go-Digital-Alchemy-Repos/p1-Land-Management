import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { and, eq } from "drizzle-orm";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const fixture = vi.hoisted(() => ({
  url: process.env.CLIENT_SITE_CONTENT_API_TEST_DATABASE_URL,
  allowDestructiveFixture: process.env.CLIENT_SITE_CONTENT_API_TEST_ALLOW_DESTRUCTIVE_FIXTURE,
}));

vi.mock("../../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({ connectionString: fixture.url, max: 8 });
  return { pool, db: drizzle(pool, { schema }) };
});

vi.mock("../../middleware/auth", () => ({
  requireBusinessCapability: () => (req: any, _res: any, next: () => void) => {
    req.user = { id: "cms-api-lifecycle-editor" };
    next();
  },
}));

vi.mock("../../storage", async () => {
  const { ClientSiteContentStorage } = await import("../../storage/client-site-content.storage");
  return { storage: { clientSiteContent: new ClientSiteContentStorage() } };
});

vi.mock("../../utils/logger", () => ({ logger: { cms: { error: vi.fn() } } }));

import { db, pool } from "../../db";
import { clientSiteContent, users } from "@shared/schema";
import adminRouter from "./client-site-content.routes";
import publicRouter from "../client-site-content.routes";

const fixtureUser = "cms-api-lifecycle-editor";
const suite = fixture.url ? describe : describe.skip;
let server: Server | undefined;
let base: string;

async function request(path: string, init?: RequestInit) {
  return fetch(base + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

suite("Client Site Content HTTP lifecycle on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(fixture.url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
      throw Error("Loopback fixture database required");
    if (url.pathname !== "/p1_client_site_content_api_lifecycle_test")
      throw Error("Exact dedicated API lifecycle fixture database required");
    if (fixture.allowDestructiveFixture !== "true")
      throw Error("Explicit CLIENT_SITE_CONTENT_API_TEST_ALLOW_DESTRUCTIVE_FIXTURE=true required");
    await migrate(db, { migrationsFolder: "p1-migrations" });
    const app = express();
    app.use(express.json());
    app.use("/api/admin/client-site-content", adminRouter);
    app.use("/api/client-site-content", publicRouter);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }, 30000);

  beforeEach(async () => {
    await db
      .delete(clientSiteContent)
      .where(
        and(
          eq(clientSiteContent.stackId, "p1-land-management"),
          eq(clientSiteContent.routeId, "service-areas-greer-sc"),
          eq(clientSiteContent.componentKey, "service-areas-greer-sc-content"),
        ),
      );
    await db.delete(users).where(eq(users.id, fixtureUser));
    await db.insert(users).values({
      id: fixtureUser,
      email: "cms-api-lifecycle@example.test",
      password: "fixture-only",
      role: "admin",
    });
  });

  afterAll(async () => {
    try {
      if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    } finally {
      await pool.end();
    }
  });

  it("uses the real HTTP parser, revision lifecycle, restore and public ETag projection", async () => {
    const routeId = "service-areas-greer-sc";
    const componentKey = "service-areas-greer-sc-content";
    const contentPath = `/${routeId}/${componentKey}`;
    const adminPath = `/api/admin/client-site-content${contentPath}`;
    const initial = await request(adminPath);
    expect(initial.status).toBe(200);
    const initialBody = await initial.json();
    expect(initialBody).toMatchObject({ draftRevision: 0, publishedRevision: null });
    const field = Object.entries(initialBody.draftContent).find(
      ([, value]) => typeof value === "string",
    );
    expect(field).toBeDefined();
    const firstContent = { ...initialBody.draftContent, [field![0]]: "First API fixture draft" };
    const first = await request(`${adminPath}/draft`, {
      method: "PUT",
      body: JSON.stringify({ expectedRevision: 0, content: firstContent }),
    });
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ draftRevision: 1, publishedRevision: null });

    const concurrent = await Promise.all(
      ["Editor one", "Editor two"].map((heading) =>
        request(`${adminPath}/draft`, {
          method: "PUT",
          body: JSON.stringify({
            expectedRevision: 1,
            content: { ...firstContent, [field![0]]: heading },
          }),
        }),
      ),
    );
    expect(concurrent.filter((response) => response.status === 200)).toHaveLength(1);
    expect(concurrent.filter((response) => response.status === 409)).toHaveLength(1);

    const current = await request(adminPath);
    const currentBody = await current.json();
    expect(currentBody).toMatchObject({ draftRevision: 2, publishedRevision: null });
    const published = await request(`${adminPath}/publish`, {
      method: "POST",
      body: JSON.stringify({ expectedRevision: 2 }),
    });
    expect(published.status).toBe(200);
    expect(await published.json()).toMatchObject({ draftRevision: 3, publishedRevision: 3 });

    const publicResponse = await request(`/api/client-site-content${contentPath}`);
    expect(publicResponse.status).toBe(200);
    const etag = publicResponse.headers.get("etag");
    expect(etag).toMatch(/^".+"$/);
    expect((await publicResponse.json()).content).toEqual(currentBody.draftContent);
    expect(
      (
        await request(`/api/client-site-content${contentPath}`, {
          headers: { "If-None-Match": etag! },
        })
      ).status,
    ).toBe(304);

    const revisions = await request(`${adminPath}/revisions`);
    const revisionBody = await revisions.json();
    expect(
      revisionBody.map((revision: { revision: number; kind: string }) => revision.revision),
    ).toEqual([3, 2, 1]);
    const restored = await request(`${adminPath}/revisions/1/restore`, {
      method: "POST",
      body: JSON.stringify({ expectedRevision: 3 }),
    });
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ draftRevision: 4, publishedRevision: 3 });
    expect(
      (
        await request(`${adminPath}/publish`, {
          method: "POST",
          body: JSON.stringify({ expectedRevision: 3 }),
        })
      ).status,
    ).toBe(409);
    const finalRevisions = await (await request(`${adminPath}/revisions`)).json();
    expect(
      finalRevisions.map((revision: { revision: number; kind: string }) => ({
        revision: revision.revision,
        kind: revision.kind,
      })),
    ).toEqual([
      { revision: 4, kind: "restore" },
      { revision: 3, kind: "publish" },
      { revision: 2, kind: "draft-save" },
      { revision: 1, kind: "draft-save" },
    ]);
  });
});
