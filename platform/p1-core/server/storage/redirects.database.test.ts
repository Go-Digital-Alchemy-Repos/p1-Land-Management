import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const testUrl = process.env.REDIRECT_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/p1_redirect_test")
    throw new Error("Redirect tests require an isolated local p1_redirect_test database");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString: process.env.REDIRECT_TEST_DATABASE_URL });
  return { pool, db: drizzle(pool) };
});
import { pool } from "../db";
import { RedirectsStorage } from "./redirects.storage";
const store = new RedirectsStorage();
const rule = (fromPath: string, toPath: string) => ({
  fromPath,
  toPath,
  statusCode: 301 as const,
  isActive: true,
});

describe.skipIf(!testUrl)("isolated redirect writes", () => {
  beforeAll(async () => {
    await pool.query(
      `CREATE TABLE redirects (id varchar PRIMARY KEY DEFAULT gen_random_uuid(), from_path text NOT NULL, to_path text NOT NULL, status_code integer NOT NULL DEFAULT 301, is_active boolean NOT NULL DEFAULT true, note text, created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now())`,
    );
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE redirects");
  });
  afterAll(async () => {
    await pool.end();
  });
  it("serializes competing creates of the same source", async () => {
    const results = await Promise.allSettled([
      store.create(rule("/old", "/first")),
      store.create(rule("/old", "/second")),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(await store.getAll()).toHaveLength(1);
  });
  it("prevents a cycle created by concurrent requests", async () => {
    const results = await Promise.allSettled([
      store.create(rule("/a", "/b")),
      store.create(rule("/b", "/a")),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await store.getAll()).toHaveLength(1);
  });
  it("rejects unsafe updates without changing saved data", async () => {
    const row = await store.create(rule("/a", "/b"));
    await expect(store.update(row.id, { toPath: "//external.test" })).rejects.toThrow();
    expect((await store.getById(row.id))?.toPath).toBe("/b");
    await expect(store.update(row.id, { toPath: "/a" })).rejects.toThrow();
  });
  it("deactivates invalid historical rules independently without deleting metadata", async () => {
    const result = await pool.query(
      "INSERT INTO redirects(from_path,to_path,note) VALUES('/old-a','https://external.test','keep-a'),('/old-b','//external.test','keep-b') RETURNING id",
    );
    const first = await store.update(result.rows[0].id, { isActive: false });
    expect(first?.isActive).toBe(false);
    expect(first?.note).toBe("keep-a");
    await expect(store.create(rule("/good", "/target"))).rejects.toThrow();
    await store.update(result.rows[1].id, { isActive: false });
    expect(await store.create(rule("/good", "/target"))).toMatchObject({ fromPath: "/good" });
    await expect(store.update(result.rows[0].id, { isActive: true })).rejects.toThrow();
  });
  it("allows deletion of invalid historical rules and valid empty state", async () => {
    const result = await pool.query(
      "INSERT INTO redirects(from_path,to_path) VALUES('/old','https://external.test') RETURNING id",
    );
    await expect(store.create(rule("/good", "/target"))).rejects.toThrow();
    expect(await store.delete(result.rows[0].id)).toBe(true);
    expect(await store.getAll()).toEqual([]);
    const row = await store.create(rule("/good", "/target"));
    expect((await store.update(row.id, { isActive: false }))?.isActive).toBe(false);
    expect(await store.getActiveForPath("/good")).toBeUndefined();
  });
});
