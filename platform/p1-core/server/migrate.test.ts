import { beforeEach, describe, expect, it, vi } from "vitest";
const { migrate } = vi.hoisted(() => ({ migrate: vi.fn() }));
vi.mock("./db", () => ({ db: {} }));
vi.mock("drizzle-orm/node-postgres/migrator", () => ({ migrate }));
import { runMigrations } from "./migrate";
describe("P1 migration boundary", () => {
 beforeEach(() => { migrate.mockReset(); });
 it("applies only the P1 migration journal", async () => {
  await runMigrations(); expect(migrate).toHaveBeenCalledWith({}, { migrationsFolder: expect.stringMatching(/p1-migrations$/) });
 });
 it("propagates failure instead of silently assuming legacy tables are compatible", async () => {
  migrate.mockRejectedValue(new Error("migration failed")); await expect(runMigrations()).rejects.toThrow("migration failed");
 });
});
