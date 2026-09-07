import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ pool: { connect: vi.fn(), query: vi.fn() } }));
vi.mock("../utils/logger", () => ({
  logger: { backup: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } },
}));
vi.mock("./backup-storage.service", () => ({
  deleteBackupObject: vi.fn(),
  downloadBackupObject: vi.fn(),
  getBackupStorageInfo: vi.fn(),
  isBackupStorageConfigured: vi.fn(),
  listBackupObjects: vi.fn(),
  uploadBackupObject: vi.fn(),
}));

import type { PoolClient } from "pg";
import { pool } from "../db";
import * as storage from "./backup-storage.service";
import { runSystemBackup, serializeRestoreValue } from "./system-backup.service";

describe("serializeRestoreValue", () => {
  it("preserves JSON arrays and objects as JSON parameters during restore", () => {
    const jsonColumns = new Set(["items", "metadata"]);

    expect(serializeRestoreValue([{ id: "home" }], jsonColumns, "items")).toBe('[{"id":"home"}]');
    expect(serializeRestoreValue({ enabled: true }, jsonColumns, "metadata")).toBe(
      '{"enabled":true}',
    );
  });

  it("leaves ordinary values and JSON nulls unchanged", () => {
    const jsonColumns = new Set(["items"]);

    expect(serializeRestoreValue("navigation", jsonColumns, "name")).toBe("navigation");
    expect(serializeRestoreValue(null, jsonColumns, "items")).toBeNull();
  });
});

describe("backup session cleanup failures", () => {
  const query = vi.fn();
  const release = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pool.connect as () => Promise<PoolClient>).mockResolvedValue({
      query,
      release,
    } as unknown as PoolClient);
    vi.mocked(storage.isBackupStorageConfigured).mockResolvedValue(true);
    vi.mocked(storage.getBackupStorageInfo).mockResolvedValue({
      source: "env",
      bucketName: "test",
      prefix: "test",
    });
    vi.mocked(storage.listBackupObjects).mockResolvedValue([]);
    vi.mocked(storage.uploadBackupObject).mockImplementation(async (key) => ({ key }));
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ acquired: true }] };
      if (sql.includes("pg_advisory_unlock")) return { rows: [{ released: true }] };
      return { rows: [] };
    });
  });

  it("discards a session when unlock reports that it did not release the lock", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ acquired: true }] };
      if (sql.includes("pg_advisory_unlock")) return { rows: [{ released: false }] };
      return { rows: [] };
    });
    await expect(runSystemBackup()).rejects.toThrow("Backup lock release failed");
    expect(release).toHaveBeenCalledExactlyOnceWith(true);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("preserves an export failure when unlock also fails and evicts the connection", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ acquired: true }] };
      if (sql.includes("FROM pg_tables")) throw new Error("read failed");
      if (sql.includes("pg_advisory_unlock")) throw new Error("unlock failed");
      return { rows: [] };
    });
    await expect(runSystemBackup()).rejects.toThrow("read failed");
    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(storage.uploadBackupObject).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("evicts the session if lock acquisition has an uncertain outcome", async () => {
    query.mockRejectedValueOnce(new Error("connection interrupted"));
    await expect(runSystemBackup()).rejects.toThrow("connection interrupted");
    expect(release).toHaveBeenCalledExactlyOnceWith(true);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("returns a healthy session after a denied lock without running an export", async () => {
    query.mockResolvedValueOnce({ rows: [{ acquired: false }] });
    await expect(runSystemBackup()).rejects.toThrow("Another backup or restore");
    expect(release).toHaveBeenCalledExactlyOnceWith(false);
    expect(query).toHaveBeenCalledTimes(1);
    expect(storage.uploadBackupObject).not.toHaveBeenCalled();
  });
});
