import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const fixture = vi.hoisted(() => ({ url: process.env.CMS_CONCURRENCY_TEST_DATABASE_URL }));
vi.mock("../db", async () => {
  const pg = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new pg.default.Pool({ connectionString: fixture.url, max: 8 });
  return { db: drizzle(pool), pool };
});
vi.mock("../storage", () => ({ storage: {} }));
import { pool } from "../db";
import { createPageWithRevision, mutateCmsPage } from "./cms-page-mutations.service";
import { pageLease } from "./cms-page-leases.service";
import { mutateCmsMenu } from "./cms-menu-mutations.service";
import { CmsPagesStorage } from "../storage/cms-pages.storage";
import type { User, CmsPage, CmsMenu } from "@shared/schema";
const user = {
  id: "fixture-user",
  role: "admin",
  email: "fixture@example.test",
  firstName: "Fixture",
  lastName: "Editor",
} as User;
const suite = fixture.url ? describe : describe.skip;
suite("CMS concurrency on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(fixture.url!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !/test|fixture|acceptance/.test(url.pathname)
    )
      throw new Error("Loopback named fixture database required");
    await pool.query(`CREATE TABLE IF NOT EXISTS cms_pages(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,slug text NOT NULL UNIQUE,status text NOT NULL DEFAULT 'draft',page_type text NOT NULL DEFAULT 'custom',template text NOT NULL DEFAULT 'full-width',sidebar_id varchar,content jsonb DEFAULT '{}',seo_title text,seo_description text,seo_keywords text,og_image_url text,canonical_url text,noindex boolean DEFAULT false,created_by varchar,updated_by varchar,scheduled_at timestamp,published_at timestamp,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now());
  CREATE TABLE IF NOT EXISTS cms_page_revisions(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),page_id varchar NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,title text NOT NULL,content jsonb DEFAULT '{}',status text NOT NULL,changed_by varchar,change_note text,created_at timestamp DEFAULT now());
  CREATE TABLE IF NOT EXISTS cms_menus(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,location text NOT NULL DEFAULT 'unassigned',items jsonb DEFAULT '[]',created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now());
  CREATE TABLE IF NOT EXISTS editor_locks(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),resource_type text NOT NULL,resource_id text NOT NULL,locked_by_user_id text NOT NULL,locked_by_name text NOT NULL,locked_at timestamp NOT NULL DEFAULT now(),last_heartbeat_at timestamp NOT NULL DEFAULT now(),expires_at timestamp NOT NULL,created_at timestamp NOT NULL DEFAULT now(),updated_at timestamp NOT NULL DEFAULT now(),UNIQUE(resource_type,resource_id));`);
    const migration = readFileSync(
      new URL("../../p1-migrations/0003_cms_page_concurrency.sql", import.meta.url),
      "utf8",
    );
    await pool.query(migration);
    await pool.query(migration);
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE cms_pages,cms_page_revisions,cms_menus,editor_locks CASCADE");
  });
  afterAll(async () => {
    await pool.end();
  });
  async function setup() {
    const page = await createPageWithRevision({
      title: "Original",
      slug: "original",
      content: { blocks: [] },
    });
    const instance = randomUUID();
    const lease = await pageLease("acquire", page.id, user, { editorInstanceId: instance });
    return {
      page,
      proof: { expectedVersion: page.version, editorInstanceId: instance, leaseId: lease.lock!.id },
    };
  }
  async function menu(page: CmsPage) {
    return (await mutateCmsMenu(null, {
      name: "Main",
      location: "main_navigation",
      items: [
        {
          id: "link",
          label: page.title,
          url: "/" + page.slug,
          pageId: page.id,
          labelSource: "page",
          openInNewTab: false,
          children: [],
        },
      ],
    })) as CmsMenu;
  }
  it("allows exactly one simultaneous save and atomically updates revisions and navigation", async () => {
    const { page, proof } = await setup();
    const m = await menu(page);
    const results = await Promise.allSettled(
      ["First", "Second"].map((title) =>
        mutateCmsPage(page.id, user.id, proof, "save", {
          data: { title, slug: title.toLowerCase() },
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason.code,
    ).toBe("CMS_PAGE_STALE");
    const saved = (await pool.query("SELECT * FROM cms_pages")).rows[0];
    const nav = (await pool.query("SELECT * FROM cms_menus")).rows[0];
    expect(saved.version).toBe(2);
    expect(nav.version).toBe(2);
    expect(nav.items[0].label).toBe(saved.title);
    expect(nav.items[0].url).toBe("/" + saved.slug);
    expect((await pool.query("SELECT * FROM cms_page_revisions")).rowCount).toBe(2);
    await expect(mutateCmsMenu(m.id, { items: m.items as any }, 1)).rejects.toMatchObject({
      code: "CMS_MENU_STALE",
    });
  });
  it("fences same-user tabs, expired lease generations, and delayed heartbeat/release", async () => {
    const { page, proof } = await setup();
    const other = randomUUID();
    const denied = await pageLease("acquire", page.id, user, { editorInstanceId: other });
    expect(denied.ownedByCurrentUser).toBe(true);
    expect(denied.ownedByCurrentEditor).toBe(false);
    await expect(
      mutateCmsPage(page.id, user.id, { ...proof, editorInstanceId: other }, "publish"),
    ).rejects.toMatchObject({ code: "CMS_PAGE_LEASE_LOST" });
    await pool.query("UPDATE editor_locks SET expires_at=clock_timestamp()-interval '1 second'");
    const next = await pageLease("acquire", page.id, user, { editorInstanceId: other });
    expect(next.lock!.id).not.toBe(proof.leaseId);
    expect((await pageLease("heartbeat", page.id, user, proof)).ownedByCurrentEditor).toBe(false);
    await pageLease("release", page.id, user, proof);
    expect((await pool.query("SELECT id FROM editor_locks")).rows[0].id).toBe(next.lock!.id);
    await expect(
      mutateCmsPage(page.id, user.id, proof, "delete", { force: true }),
    ).rejects.toMatchObject({ code: "CMS_PAGE_LEASE_LOST" });
  });
  it("rolls page, revision, and menu writes back when relationship write fails", async () => {
    const { page, proof } = await setup();
    await menu(page);
    await pool.query(
      "CREATE OR REPLACE FUNCTION fixture_fail_menu() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture relationship failure'; END $$; CREATE TRIGGER fixture_fail_menu BEFORE UPDATE ON cms_menus FOR EACH ROW EXECUTE FUNCTION fixture_fail_menu()",
    );
    try {
      await expect(
        mutateCmsPage(page.id, user.id, proof, "save", { data: { title: "Changed" } }),
      ).rejects.toMatchObject({ cause: { message: "fixture relationship failure" } });
      expect((await pool.query("SELECT title,version FROM cms_pages")).rows[0]).toEqual({
        title: "Original",
        version: 1,
      });
      expect((await pool.query("SELECT * FROM cms_page_revisions")).rowCount).toBe(1);
      expect((await pool.query("SELECT version FROM cms_menus")).rows[0].version).toBe(1);
    } finally {
      await pool.query(
        "DROP TRIGGER fixture_fail_menu ON cms_menus; DROP FUNCTION fixture_fail_menu()",
      );
    }
  });
  it("restores title/content only and rejects stale lifecycle actions", async () => {
    const { page, proof } = await setup();
    const rev = (await pool.query("SELECT id FROM cms_page_revisions")).rows[0].id;
    const saved = (await mutateCmsPage(page.id, user.id, proof, "save", {
      data: { title: "New", slug: "new", seoTitle: "Retain SEO" },
    })) as CmsPage;
    for (const action of [
      "publish",
      "unpublish",
      "schedule",
      "restore",
      "delete",
      "remove-menu-items",
    ] as const)
      await expect(
        mutateCmsPage(page.id, user.id, proof, action, {
          force: true,
          revisionId: rev,
          scheduledAt: new Date(Date.now() + 60000),
        }),
      ).rejects.toMatchObject({ code: "CMS_PAGE_STALE" });
    const restored = (await mutateCmsPage(
      page.id,
      user.id,
      { ...proof, expectedVersion: saved.version },
      "restore",
      { revisionId: rev },
    )) as CmsPage;
    expect(restored).toMatchObject({
      title: "Original",
      slug: "new",
      seoTitle: "Retain SEO",
      version: 3,
      status: "draft",
    });
  });
  it("scheduler publishes once, records revision and invalidates loaded editor version", async () => {
    const { page, proof } = await setup();
    await mutateCmsPage(page.id, user.id, proof, "schedule", {
      scheduledAt: new Date(Date.now() + 60000),
    });
    await pool.query("UPDATE cms_pages SET scheduled_at=clock_timestamp()-interval '1 second'");
    const storage = new CmsPagesStorage();
    const counts = await Promise.all([
      storage.publishScheduledPages(),
      storage.publishScheduledPages(),
    ]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
    expect((await pool.query("SELECT status,version,scheduled_at FROM cms_pages")).rows[0]).toEqual(
      { status: "published", version: 3, scheduled_at: null },
    );
    expect((await pool.query("SELECT * FROM cms_page_revisions")).rowCount).toBe(3);
    await expect(
      mutateCmsPage(page.id, user.id, { ...proof, expectedVersion: 2 }, "save", {
        data: { title: "Stale" },
      }),
    ).rejects.toMatchObject({ code: "CMS_PAGE_STALE" });
  });
  it("menu location displacement increments version and concurrent menu CAS has one winner", async () => {
    const first = (await mutateCmsMenu(null, {
      name: "First",
      location: "main_navigation",
    })) as CmsMenu;
    await mutateCmsMenu(null, { name: "Second", location: "main_navigation" });
    await expect(mutateCmsMenu(first.id, { name: "Stale" }, 1)).rejects.toMatchObject({
      code: "CMS_MENU_STALE",
    });
    const results = await Promise.allSettled(
      ["A", "B"].map((name) => mutateCmsMenu(first.id, { name }, 2)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  it("rechecks lease expiry after waiting for a menu writer without partial changes", async () => {
    const { page, proof } = await setup();
    await menu(page);
    await pool.query("UPDATE editor_locks SET expires_at=clock_timestamp()+interval '1 second'");
    const blocker = await pool.connect();
    await blocker.query("BEGIN");
    await blocker.query("SELECT pg_advisory_xact_lock(hashtextextended('cms-menu-writes',0))");
    const pending = mutateCmsPage(page.id, user.id, proof, "save", {
      data: { title: "Expired write" },
    });
    const rejected = expect(pending).rejects.toMatchObject({ code: "CMS_PAGE_LEASE_LOST" });
    try {
      let waiting = false;
      for (let attempt = 0; attempt < 40; attempt++) {
        const row = (
          await pool.query(
            "SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted) AS waiting,(SELECT expires_at>clock_timestamp() FROM editor_locks LIMIT 1) AS valid",
          )
        ).rows[0];
        if (row.waiting) {
          expect(row.valid).toBe(true);
          waiting = true;
          break;
        }
        await blocker.query("SELECT pg_sleep(0.01)");
      }
      expect(waiting).toBe(true);
      await blocker.query("SELECT pg_sleep(1.1)");
      await blocker.query("COMMIT");
      await rejected;
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
    }
    expect((await pool.query("SELECT title,version FROM cms_pages")).rows[0]).toEqual({
      title: "Original",
      version: 1,
    });
    expect((await pool.query("SELECT * FROM cms_page_revisions")).rowCount).toBe(1);
  });
  it("cleanup preserves page version, advances affected menu, and legacy blind requests fail", async () => {
    const { page, proof } = await setup();
    await menu(page);
    expect(await mutateCmsPage(page.id, user.id, proof, "remove-menu-items")).toMatchObject({
      success: true,
      version: 1,
      menusUpdated: 1,
      itemsRemoved: 1,
    });
    expect((await pool.query("SELECT version,items FROM cms_menus")).rows[0]).toEqual({
      version: 2,
      items: [],
    });
    for (const action of ["acquire", "heartbeat", "release"] as const)
      await expect(pageLease(action, page.id, user, {})).rejects.toMatchObject({
        code: "CMS_CONCURRENCY_REQUIRED",
        status: 400,
      });
  });

  it("serializes scheduled publication against reschedule and unpublish", async () => {
    for (const action of ["schedule", "unpublish"] as const) {
      await pool.query("TRUNCATE cms_pages,cms_page_revisions,cms_menus,editor_locks CASCADE");
      const { page, proof } = await setup();
      await mutateCmsPage(page.id, user.id, proof, "schedule", {
        scheduledAt: new Date(Date.now() + 60000),
      });
      await pool.query("UPDATE cms_pages SET scheduled_at=clock_timestamp()-interval '1 second'");
      const results = await Promise.allSettled([
        new CmsPagesStorage().publishScheduledPages(),
        mutateCmsPage(page.id, user.id, { ...proof, expectedVersion: 2 }, action, {
          scheduledAt: new Date(Date.now() + 120000),
        }),
      ]);
      const saved = (await pool.query("SELECT status,version FROM cms_pages")).rows[0];
      expect(saved.version).toBe(3);
      expect((await pool.query("SELECT * FROM cms_page_revisions")).rowCount).toBe(3);
      if (results[1].status === "fulfilled")
        expect(saved.status).toBe(action === "schedule" ? "scheduled" : "draft");
      else {
        expect(results[1].reason.code).toBe("CMS_PAGE_STALE");
        expect(saved.status).toBe("published");
      }
    }
  });
  it("canonicalizes slug leases and rejects another user's otherwise exact proof", async () => {
    const { page, proof } = await setup();
    const same = await pageLease("acquire", page.slug, user, {
      editorInstanceId: proof.editorInstanceId,
    });
    expect(same.resourceId).toBe(page.id);
    expect(same.lock!.id).toBe(proof.leaseId);
    expect((await pageLease("status", page.slug, user)).ownedByCurrentEditor).toBe(false);
    await expect(
      mutateCmsPage(page.slug, "other-user", proof, "save", { data: { title: "Wrong user" } }),
    ).rejects.toMatchObject({ code: "CMS_PAGE_LEASE_LOST" });
    const saved = (await mutateCmsPage(page.slug, user.id, proof, "save", {
      data: { title: "Slug write" },
    })) as CmsPage;
    expect(saved.id).toBe(page.id);
    expect(saved.version).toBe(2);
  });
  it("rolls creation and duplication back if initial revision fails", async () => {
    await pool.query(
      "CREATE OR REPLACE FUNCTION fixture_fail_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture revision failure'; END $$; CREATE TRIGGER fixture_fail_revision BEFORE INSERT ON cms_page_revisions FOR EACH ROW EXECUTE FUNCTION fixture_fail_revision()",
    );
    try {
      for (const note of ["Initial creation", "Duplicated from Original"])
        await expect(
          createPageWithRevision({ title: "New", slug: randomUUID() }, note),
        ).rejects.toMatchObject({ cause: { message: "fixture revision failure" } });
      expect((await pool.query("SELECT * FROM cms_pages")).rowCount).toBe(0);
    } finally {
      await pool.query(
        "DROP TRIGGER fixture_fail_revision ON cms_page_revisions; DROP FUNCTION fixture_fail_revision()",
      );
    }
  });
});
