import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import express from "express";
import type { AddressInfo } from "node:net";
const fixture = vi.hoisted(() => ({ url: process.env.CMS_SECTION_TEST_DATABASE_URL }));
vi.mock("../db", async () => {
  const { default: pg } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new pg.Pool({ connectionString: fixture.url, max: 8 });
  return { pool, db: drizzle(pool) };
});
vi.mock("../storage", async () => {
  const { CmsSectionsStorage } = await import("../storage/cms-sections.storage");
  return { storage: { cmsSections: new CmsSectionsStorage() } };
});
vi.mock("../middleware/auth", () => ({
  requireBusinessCapability: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
import { pool } from "../db";
import { CmsSectionsStorage } from "../storage/cms-sections.storage";
import { sectionLease } from "./cms-section-leases.service";
import { sectionPreconditions } from "./cms-section-concurrency";
import sectionsRouter from "../routes/admin/cms-sections.routes";
import type { User } from "@shared/schema";
const user = { id: "fixture-editor", role: "admin", email: "fixture@example.test" } as User;
const store = new CmsSectionsStorage();
async function http(
  app: ReturnType<typeof express>,
  method: string,
  path: string,
  body: unknown,
  status: number,
) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    expect(response.status).toBe(status);
    return { body: await response.json() };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
const suite = fixture.url ? describe : describe.skip;
suite("Sections exact leases and CAS on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(fixture.url!);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.pathname !== "/sections_concurrency_test"
    )
      throw Error("Dedicated loopback sections fixture required");
    await pool.query(`CREATE TABLE IF NOT EXISTS cms_sections(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,description text,category text DEFAULT 'general',blocks jsonb NOT NULL DEFAULT '[]',thumbnail_url text,created_by varchar,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now());
      CREATE TABLE IF NOT EXISTS editor_locks(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),resource_type text NOT NULL,resource_id text NOT NULL,editor_instance_id text,locked_by_user_id text NOT NULL,locked_by_name text NOT NULL,locked_at timestamp NOT NULL DEFAULT now(),last_heartbeat_at timestamp NOT NULL DEFAULT now(),expires_at timestamp NOT NULL,created_at timestamp NOT NULL DEFAULT now(),updated_at timestamp NOT NULL DEFAULT now(),UNIQUE(resource_type,resource_id));`);
    await pool.query(
      "INSERT INTO cms_sections(id,name,blocks) VALUES('legacy','Preserved','[{\"legacy\":true}]') ON CONFLICT DO NOTHING",
    );
    const sql = readFileSync(
      new URL("../../p1-migrations/0007_cms_section_concurrency.sql", import.meta.url),
      "utf8",
    );
    await pool.query(sql);
    await pool.query(sql);
    expect(
      (await pool.query("SELECT name,blocks,version FROM cms_sections WHERE id='legacy'")).rows[0],
    ).toEqual({ name: "Preserved", blocks: [{ legacy: true }], version: 1 });
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE cms_sections,editor_locks");
  });
  afterAll(async () => {
    await pool.end();
  });
  async function setup(name = "Original") {
    const section = await store.createSection({ name, blocks: [{ unknown: { retained: true } }] });
    const editorInstanceId = randomUUID();
    const lease = await sectionLease("acquire", section.id, user, { editorInstanceId });
    return {
      section,
      proof: { expectedVersion: section.version, editorInstanceId, leaseId: lease.lock!.id },
    };
  }
  const team = { name: "Team", blocks: [] };
  const starters = [
    { name: "Starter - A", blocks: [{ text: "original" }] },
    { name: "Starter - B", blocks: [] },
  ];
  it("requires explicit proof and does not trust a caller version on create", async () => {
    expect(() => sectionPreconditions({})).toThrow(/Reload/);
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
    app.use(sectionsRouter);
    const created = await http(
      app,
      "POST",
      "/sections",
      { name: "New", blocks: [], version: 999, createdBy: "other" },
      201,
    );
    expect(created.body.version).toBe(1);
    expect(created.body.createdBy).toBe(user.id);
    await http(app, "PUT", `/sections/${created.body.id}`, { name: "Unfenced" }, 400);
    await http(app, "DELETE", `/sections/${created.body.id}`, undefined, 400);
    expect((await store.getSection(created.body.id))?.name).toBe("New");
  });
  it("updates once, preserves unknown blocks and refuses stale update/delete", async () => {
    const { section, proof } = await setup();
    const updated = await store.updateSection(section.id, { name: "Saved" }, user.id, proof);
    expect(updated.version).toBe(2);
    expect(updated.blocks).toEqual(section.blocks);
    await expect(
      store.updateSection(section.id, { name: "Stale" }, user.id, proof),
    ).rejects.toMatchObject({ code: "CMS_SECTION_STALE" });
    await expect(store.deleteSection(section.id, user.id, proof)).rejects.toMatchObject({
      code: "CMS_SECTION_STALE",
    });
    expect((await store.getSection(section.id))?.name).toBe("Saved");
  });
  it("fences same-user tabs and stale lease generations after takeover", async () => {
    const { section, proof } = await setup();
    const second = randomUUID();
    const denied = await sectionLease("acquire", section.id, user, { editorInstanceId: second });
    expect(denied.ownedByCurrentUser).toBe(true);
    expect(denied.ownedByCurrentEditor).toBe(false);
    await expect(
      store.updateSection(section.id, { name: "Wrong tab" }, user.id, {
        ...proof,
        editorInstanceId: second,
      }),
    ).rejects.toMatchObject({ code: "CMS_SECTION_LEASE_LOST" });
    await pool.query("UPDATE editor_locks SET expires_at=clock_timestamp()-interval '1 second'");
    const next = await sectionLease("acquire", section.id, user, { editorInstanceId: second });
    expect(next.lock!.id).not.toBe(proof.leaseId);
    await sectionLease("release", section.id, user, proof);
    await expect(store.deleteSection(section.id, user.id, proof)).rejects.toMatchObject({
      code: "CMS_SECTION_LEASE_LOST",
    });
    expect(
      (
        await sectionLease("heartbeat", section.id, user, {
          editorInstanceId: second,
          leaseId: next.lock!.id,
        })
      ).ownedByCurrentEditor,
    ).toBe(true);
  });
  it("checks expiry after waiting for a conflicting section row lock", async () => {
    const { section, proof } = await setup();
    const blocker = await pool.connect();
    await blocker.query("BEGIN");
    await blocker.query("SELECT id FROM cms_sections WHERE id=$1 FOR UPDATE", [section.id]);
    const pending = store
      .updateSection(section.id, { name: "Late" }, user.id, proof)
      .catch((error) => error);
    try {
      for (let attempt = 0; attempt < 100; attempt++) {
        const waiting = await pool.query(
          "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%cms_sections%'",
        );
        if (waiting.rowCount) break;
        if (attempt === 99) throw Error("Mutation did not reach conflicting lock");
        await pool.query("SELECT pg_sleep(0.01)");
      }
      await pool.query("UPDATE editor_locks SET expires_at=clock_timestamp()-interval '1 second'");
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
    }
    expect(await pending).toMatchObject({ code: "CMS_SECTION_LEASE_LOST" });
    expect((await store.getSection(section.id))?.version).toBe(1);
  });
  it("serializes competing acquisitions and denies cross-user proof", async () => {
    const row = await store.createSection({ name: "Race" });
    const results = await Promise.all(
      [randomUUID(), randomUUID()].map((editorInstanceId) =>
        sectionLease("acquire", row.id, user, { editorInstanceId }),
      ),
    );
    expect(results.filter((result) => result.ownedByCurrentEditor)).toHaveLength(1);
    const owned = results.find((result) => result.ownedByCurrentEditor)!;
    await expect(
      store.deleteSection(row.id, "other-user", {
        expectedVersion: 1,
        editorInstanceId: owned.lock!.editorInstanceId!,
        leaseId: owned.lock!.id,
      }),
    ).rejects.toMatchObject({ code: "CMS_SECTION_LEASE_LOST" });
  });
  it("DELETE accepts exact JSON proof and removes only template and its lease", async () => {
    const { section, proof } = await setup();
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
    app.use(sectionsRouter);
    await http(app, "DELETE", `/sections/${section.id}`, proof, 200);
    expect(await store.getSection(section.id)).toBeUndefined();
    expect((await pool.query("SELECT * FROM editor_locks")).rowCount).toBe(0);
  });
  it("seed is idempotent and never replaces custom edits without explicit reset", async () => {
    expect(await store.ensureSystemSections(team, starters, false)).toMatchObject({
      created: 3,
      updated: 0,
    });
    const row = (await store.getAllSections()).find((row) => row.name === starters[0].name)!;
    await pool.query("UPDATE cms_sections SET blocks='[{\"custom\":true}]' WHERE id=$1", [row.id]);
    expect(await store.ensureSystemSections(team, starters, false)).toMatchObject({
      created: 0,
      updated: 0,
      deleted: 0,
    });
    expect((await store.getSection(row.id))?.blocks).toEqual([{ custom: true }]);
  });
  it("reset refuses active leases without creating, deleting or updating anything", async () => {
    const { section } = await setup("Starter - Obsolete");
    const before = await store.getAllSections();
    await expect(store.ensureSystemSections(team, starters, true)).rejects.toMatchObject({
      code: "CMS_SECTION_RESERVED",
    });
    expect(await store.getAllSections()).toEqual(before);
    await pool.query("UPDATE editor_locks SET expires_at=clock_timestamp()-interval '1 second'");
    expect(await store.ensureSystemSections(team, starters, true)).toMatchObject({
      created: 3,
      deleted: 1,
    });
    expect(await store.getSection(section.id)).toBeUndefined();
    await store.ensureSystemSections(team, starters, true);
    expect(
      (await store.getAllSections())
        .filter((row) => row.name.startsWith("Starter"))
        .map((row) => row.version),
    ).toEqual([2, 2]);
  });
  it("rolls back the entire reset when the final template write fails", async () => {
    await store.ensureSystemSections(team, starters, false);
    const before = await store.getAllSections();
    await pool.query(
      `CREATE OR REPLACE FUNCTION reject_last_section() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.name='Starter - B' THEN RAISE EXCEPTION 'fixture rejection'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_section BEFORE UPDATE ON cms_sections FOR EACH ROW EXECUTE FUNCTION reject_last_section()`,
    );
    try {
      await expect(store.ensureSystemSections(team, starters, true)).rejects.toThrow();
      expect(await store.getAllSections()).toEqual(before);
    } finally {
      await pool.query(
        "DROP TRIGGER reject_section ON cms_sections; DROP FUNCTION reject_last_section()",
      );
    }
  });
  it("reset holds off new acquisitions and leaves their subsequent writes version-fenced", async () => {
    await store.ensureSystemSections(team, starters, false);
    const row = (await store.getAllSections()).find((row) => row.name === starters[0].name)!;
    const blocker = await pool.connect();
    await blocker.query("BEGIN");
    await blocker.query("SELECT id FROM cms_sections WHERE id=$1 FOR UPDATE", [row.id]);
    const reset = store.ensureSystemSections(team, starters, true);
    for (let attempt = 0; attempt < 100; attempt++) {
      const waiting = await pool.query(
        "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%cms_sections%'",
      );
      if (waiting.rowCount) break;
      if (attempt === 99) throw Error("Reset did not reach conflicting row lock");
      await pool.query("SELECT pg_sleep(0.01)");
    }
    const instance = randomUUID();
    const pending = sectionLease("acquire", row.id, user, { editorInstanceId: instance });
    try {
      for (let attempt = 0; attempt < 100; attempt++) {
        const waiting = await pool.query(
          "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%pg_advisory_xact_lock_shared%'",
        );
        if (waiting.rowCount) break;
        if (attempt === 99) throw Error("Acquire did not wait on library fence");
        await pool.query("SELECT pg_sleep(0.01)");
      }
      await blocker.query("COMMIT");
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
    }
    expect(await reset).toMatchObject({ updated: 2 });
    const lease = await pending;
    expect(lease.ownedByCurrentEditor).toBe(true);
    await expect(
      store.updateSection(row.id, { name: "Old draft" }, user.id, {
        expectedVersion: row.version,
        editorInstanceId: instance,
        leaseId: lease.lock!.id,
      }),
    ).rejects.toMatchObject({ code: "CMS_SECTION_STALE" });
  });
});
