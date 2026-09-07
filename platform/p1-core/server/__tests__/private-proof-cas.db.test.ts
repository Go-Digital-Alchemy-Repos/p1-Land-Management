import { afterAll, beforeAll, expect, it, vi } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
vi.mock("../db", () => ({ db: {} }));
import { SettingsStorage } from "../storage/settings.storage";
const url = process.env.SETTINGS_TEST_DATABASE_URL;
let pool: pg.Pool;
beforeAll(async () => {
  if (!url) return;
  const parsed = new URL(url);
  if (
    !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
    parsed.pathname !== "/core_settings_test"
  )
    throw new Error("Dedicated local test database required");
  pool = new pg.Pool({ connectionString: url });
  await pool.query(
    "CREATE TABLE IF NOT EXISTS system_settings (id varchar PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE, value text NOT NULL, category text NOT NULL, is_secret boolean NOT NULL DEFAULT false, updated_at timestamp DEFAULT now())",
  );
});
afterAll(async () => {
  if (pool) await pool.end();
});
it.skipIf(!url)(
  "encrypted CAS serializes absent-row writers, rolls back conflicts and bypasses cache",
  async () => {
    const settings = new SettingsStorage(60000, drizzle(pool, { schema }));
    const key = "p1-private-proof-test-" + crypto.randomUUID();
    try {
      const results = await Promise.allSettled(
        Array.from({ length: 8 }, () =>
          settings.updatePrivateJson(key, "private", (current) => {
            if (current) throw new Error("Conflict");
            return { revision: 1, privateMarker: "never public" };
          }),
        ),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(7);
      const raw = (await pool.query("SELECT * FROM system_settings WHERE key=$1", [key])).rows[0];
      expect(raw.is_secret).toBe(true);
      expect(raw.value).not.toContain("never public");
      expect(raw.value).not.toContain("revision");
      expect(await settings.readPrivateJson(key, "private")).toEqual({
        revision: 1,
        privateMarker: "never public",
      });
      await settings.getSetting(key);
      const other = new SettingsStorage(60000, drizzle(pool, { schema }));
      await other.updatePrivateJson(key, "private", () => ({ revision: 2 }));
      expect(await settings.readPrivateJson(key, "private")).toEqual({ revision: 2 });
      await expect(
        settings.updatePrivateJson(key, "wrong", () => ({ revision: 3 })),
      ).rejects.toThrow("boundary");
      expect(await settings.readPrivateJson(key, "private")).toEqual({ revision: 2 });
    } finally {
      await pool.query("DELETE FROM system_settings WHERE key=$1", [key]);
    }
  },
);
