import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
vi.mock("../db", () => ({ db: {} }));
import { SettingsStorage } from "../storage/settings.storage";

const url = process.env.SETTINGS_TEST_DATABASE_URL;
const enabled = Boolean(url);
const suite = enabled ? describe : describe.skip;
let pool: pg.Pool;
let settings: SettingsStorage;
const entry = (key: string, value: string, category = "ecommerce_stripe", isSecret = false) => ({
  key,
  value,
  category,
  isSecret,
});
suite("atomic settings real database", () => {
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (
      !["postgres:", "postgresql:"].includes(parsed.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
      parsed.pathname !== "/core_settings_test" ||
      parsed.search ||
      parsed.hash
    )
      throw new Error("Settings test requires dedicated loopback core_settings_test database");
    pool = new pg.Pool({ connectionString: url, max: 8 });
    await pool.query(
      `CREATE TABLE IF NOT EXISTS system_settings (id varchar PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE, value text NOT NULL, category text NOT NULL, is_secret boolean NOT NULL DEFAULT false, updated_at timestamp DEFAULT now());`,
    );
    settings = new SettingsStorage(60_000, drizzle(pool, { schema }));
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE system_settings");
    settings.invalidateAll();
  });
  afterAll(async () => {
    if (pool) await pool.end();
  });
  it("rolls back every setting when one write fails and retains warm committed cache", async () => {
    await settings.upsertSettings([
      entry("active_mode", "test"),
      entry("secret_key", "old", "ecommerce_stripe", true),
    ]);
    expect((await settings.getDecryptedCategory("ecommerce_stripe")).active_mode).toBe("test");
    await pool.query(
      "ALTER TABLE system_settings ADD CONSTRAINT fixture_reject_bad CHECK (value <> 'reject-this-value')",
    );
    try {
      await expect(
        settings.upsertSettings([
          entry("active_mode", "live"),
          entry("last_field", "reject-this-value"),
        ]),
      ).rejects.toThrow();
      expect((await settings.getDecryptedCategory("ecommerce_stripe")).active_mode).toBe("test");
      expect(
        (await pool.query("SELECT value FROM system_settings WHERE key='active_mode'")).rows[0]
          .value,
      ).toBe("test");
      expect(
        (
          await pool.query(
            "SELECT count(*)::int AS count FROM system_settings WHERE key='last_field'",
          )
        ).rows[0].count,
      ).toBe(0);
    } finally {
      await pool.query("ALTER TABLE system_settings DROP CONSTRAINT fixture_reject_bad");
    }
  });
  it("concurrent first saves upsert without duplicate errors or torn durable credential sets", async () => {
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        settings.upsertSettings([
          entry("active_mode", String(index)),
          entry("publishable_key", String(index)),
          entry("secret_key", String(index), "ecommerce_stripe", true),
        ]),
      ),
    );
    settings.invalidateAll();
    const state = await settings.getDecryptedCategory("ecommerce_stripe");
    expect(new Set(Object.values(state)).size).toBe(1);
    expect(Object.keys(state)).toHaveLength(3);
    const stored = (await pool.query("SELECT value FROM system_settings WHERE key='secret_key'"))
      .rows[0].value;
    expect(stored).not.toBe(state.secret_key);
    expect(stored).toMatch(/^[0-9a-f]{32}:/);
  });
  it("readers observe complete sets while concurrent writes run", async () => {
    await settings.upsertSettings([entry("a", "0"), entry("b", "0")]);
    const reader = await pool.connect();
    try {
      const observations = (async () => {
        for (let i = 0; i < 50; i++) {
          const { rows } = await reader.query(
            "SELECT value FROM system_settings WHERE key IN ('a','b')",
          );
          expect(new Set(rows.map((row) => row.value)).size).toBe(1);
        }
      })();
      const writers = Array.from({ length: 20 }, (_, i) =>
        settings.upsertSettings([entry("a", String(i)), entry("b", String(i))]),
      );
      await Promise.all([...writers, observations]);
    } finally {
      reader.release();
    }
  });
  it("single writes preserve return shape and invalidate old and new category caches", async () => {
    await settings.upsertSetting("moving", "before", "old", false);
    expect(await settings.getDecryptedCategory("old")).toEqual({ moving: "before" });
    expect(await settings.getDecryptedCategory("new")).toEqual({});
    const result = await settings.upsertSetting("moving", "after", "new", false);
    expect(result).toMatchObject({ key: "moving", value: "after", category: "new" });
    expect(await settings.getDecryptedCategory("old")).toEqual({});
    expect(await settings.getDecryptedCategory("new")).toEqual({ moving: "after" });
  });
  it("rejects duplicate keys before writes", async () => {
    await expect(settings.upsertSettings([entry("same", "a"), entry("same", "b")])).rejects.toThrow(
      "Duplicate",
    );
    expect(
      (await pool.query("SELECT count(*)::int AS count FROM system_settings")).rows[0].count,
    ).toBe(0);
  });
});
