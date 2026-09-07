import { gunzipSync, gzipSync } from "zlib";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Opt in only with a disposable local database; never use DATABASE_URL or .env.
const testUrl = process.env.BACKUP_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/core_backup_test"
  ) {
    throw new Error("BACKUP_TEST_DATABASE_URL must target local disposable core_backup_test");
  }
}

vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({ connectionString: process.env.BACKUP_TEST_DATABASE_URL, max: 6 });
  return { pool, db: drizzle(pool, { schema }) };
});
vi.mock("../utils/logger", () => ({
  logger: {
    backup: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    app: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    db: { warn: vi.fn() },
  },
}));
vi.mock("./backup-storage.service", () => ({
  deleteBackupObject: vi.fn(),
  downloadBackupObject: vi.fn(),
  getBackupStorageInfo: vi.fn(),
  isBackupStorageConfigured: vi.fn(),
  listBackupObjects: vi.fn(),
  uploadBackupObject: vi.fn(),
}));

vi.mock("../storage", async () => {
  const { SettingsStorage } = await import("../storage/settings.storage");
  return { storage: { settings: new SettingsStorage() } };
});

// The application uses both directory and explicit-index imports for this singleton.
vi.mock("../storage/index", async () => import("../storage"));

import { pool } from "../db";
import { storage as applicationStorage } from "../storage";
import {
  CRM_PIPELINE_COLORS,
  CRM_PIPELINE_SETTING_KEY,
  DEFAULT_CRM_PIPELINE_CONFIG,
  crmPipelineConfigSchema,
} from "@shared/crm-pipeline-settings";
import { CRM_LEAD_STAGES } from "@shared/schema/crm";
import { SettingsStorage } from "../storage/settings.storage";
import { getCrmPipelineSettings, saveCrmPipelineSettings } from "./crm-pipeline-settings.service";
import * as storage from "./backup-storage.service";
import {
  restoreBackupSnapshot,
  restoreSystemBackupFromKey,
  runSystemBackup,
} from "./system-backup.service";

type Snapshot = Parameters<typeof restoreBackupSnapshot>[0];

function exportedSnapshot(): Snapshot {
  const call = vi
    .mocked(storage.uploadBackupObject)
    .mock.calls.find(([key]) => key.startsWith("db/"));
  if (!call) throw new Error("No uploaded snapshot");
  return JSON.parse(gunzipSync(call[1]).toString("utf8")) as Snapshot;
}

async function assertLockAvailable() {
  const locks = await pool.query(
    "SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND objid = 880120441 AND database = (SELECT oid FROM pg_database WHERE datname = current_database())",
  );
  expect(locks.rowCount).toBe(0);
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT pg_try_advisory_lock(880120441) AS acquired");
    expect(result.rows[0].acquired).toBe(true);
    await client.query("SELECT pg_advisory_unlock(880120441)");
  } finally {
    client.release();
  }
}

describe.skipIf(!testUrl)("system backup disposable PostgreSQL", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv("CLIENT_STACK_ID", "backup-test");
    vi.stubEnv("SYSTEM_BACKUP_EXCLUDED_TABLES", "session,__drizzle_migrations");
    vi.mocked(storage.isBackupStorageConfigured).mockResolvedValue(true);
    vi.mocked(storage.getBackupStorageInfo).mockResolvedValue({
      source: "env",
      bucketName: "test",
      prefix: "test",
    });
    vi.mocked(storage.listBackupObjects).mockResolvedValue([]);
    vi.mocked(storage.uploadBackupObject).mockImplementation(async (key) => ({ key }));
    applicationStorage.settings.invalidateAll();
    await pool.query("DROP TABLE IF EXISTS system_settings, z_children, a_parents CASCADE");
    await pool.query("CREATE TABLE a_parents (id integer PRIMARY KEY)");
    await pool.query(
      "CREATE TABLE z_children (id integer PRIMARY KEY, parent_id integer REFERENCES a_parents(id))",
    );
    await pool.query("INSERT INTO a_parents VALUES (1)");
    await pool.query("INSERT INTO z_children VALUES (1, 1)");
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await pool.end();
  });

  it("exports and restores one snapshot while a parent/child transaction commits between table reads", async () => {
    const writer = await pool.connect();
    let backup: ReturnType<typeof runSystemBackup> | undefined;
    try {
      await writer.query("BEGIN");
      await writer.query("LOCK TABLE z_children IN ACCESS EXCLUSIVE MODE");
      backup = runSystemBackup();
      await vi.waitFor(
        async () => {
          const waiting = await pool.query(
            "SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND query = 'SELECT * FROM public.\"z_children\"' AND wait_event_type = 'Lock'",
          );
          expect(waiting.rowCount).toBe(1);
        },
        { timeout: 5000 },
      );
      await writer.query("INSERT INTO a_parents VALUES (2)");
      await writer.query("INSERT INTO z_children VALUES (2, 2)");
      await writer.query("COMMIT");
      await backup;
      const snapshot = exportedSnapshot();
      expect(snapshot.tables.find((table) => table.name === "a_parents")?.rows).toEqual([
        { id: 1 },
      ]);
      expect(snapshot.tables.find((table) => table.name === "z_children")?.rows).toEqual([
        { id: 1, parent_id: 1 },
      ]);
      await restoreBackupSnapshot(snapshot);
      expect((await pool.query("SELECT * FROM a_parents")).rows).toEqual([{ id: 1 }]);
      expect((await pool.query("SELECT * FROM z_children")).rows).toEqual([
        { id: 1, parent_id: 1 },
      ]);
      await assertLockAvailable();
    } finally {
      await writer.query("ROLLBACK");
      writer.release();
      await backup?.catch(() => undefined);
    }
  });

  it("excludes concurrent backups and both restore entry points throughout upload", async () => {
    let releaseUpload!: () => void;
    const pendingUpload = new Promise<void>((resolve) => {
      releaseUpload = resolve;
    });
    vi.mocked(storage.uploadBackupObject).mockImplementation(async (key) => {
      if (key.startsWith("db/")) await pendingUpload;
      return { key };
    });
    const first = runSystemBackup();
    try {
      await vi.waitFor(() => expect(storage.uploadBackupObject).toHaveBeenCalled());
      await expect(runSystemBackup()).rejects.toThrow("Another backup or restore");
      await expect(restoreBackupSnapshot(exportedSnapshot())).rejects.toThrow(
        "Another backup or restore",
      );
      await expect(restoreSystemBackupFromKey("db/test")).rejects.toThrow(
        "Another backup or restore",
      );
      expect(storage.downloadBackupObject).not.toHaveBeenCalled();
    } finally {
      releaseUpload();
      await first;
    }
    await assertLockAvailable();
  });

  it("rolls back an export read failure and releases its session lock", async () => {
    // A blocked table read exceeds the backup session's short statement timeout.
    const client = await pool.connect();
    const originalConnect = pool.connect.bind(pool);
    await client.query("SET statement_timeout = 50");
    const blocker = await originalConnect();
    await blocker.query("BEGIN");
    await blocker.query("LOCK TABLE z_children IN ACCESS EXCLUSIVE MODE");
    const connect = vi.spyOn(pool, "connect");
    connect.mockImplementationOnce((() => Promise.resolve(client)) as typeof pool.connect);
    try {
      await expect(runSystemBackup()).rejects.toThrow("statement timeout");
      expect(storage.uploadBackupObject).not.toHaveBeenCalled();
    } finally {
      connect.mockRestore();
      await blocker.query("ROLLBACK");
      blocker.release();
      await pool.query("SET statement_timeout = 0");
    }
    await assertLockAvailable();
    await expect(runSystemBackup()).resolves.toMatchObject({ tableCount: 2 });
  });

  it("releases the lock after upload or download failure", async () => {
    vi.mocked(storage.uploadBackupObject).mockRejectedValueOnce(new Error("upload failed"));
    await expect(runSystemBackup()).rejects.toThrow("upload failed");
    await assertLockAvailable();
    vi.mocked(storage.downloadBackupObject).mockRejectedValueOnce(new Error("download failed"));
    await expect(restoreSystemBackupFromKey("db/test")).rejects.toThrow("download failed");
    await assertLockAvailable();
  });

  it("rolls back a failed restore, retains existing data, and frees the lock", async () => {
    await runSystemBackup();
    const snapshot = exportedSnapshot();
    snapshot.tables.find((table) => table.name === "z_children")!.rows = [
      { id: 2, parent_id: 999 },
    ];
    await expect(restoreBackupSnapshot(snapshot)).rejects.toThrow("foreign key constraint");
    expect((await pool.query("SELECT * FROM z_children")).rows).toEqual([{ id: 1, parent_id: 1 }]);
    await assertLockAvailable();
  });

  it("restores from object storage using one lock lifecycle", async () => {
    await runSystemBackup();
    const snapshot = exportedSnapshot();
    vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify(snapshot)));
    await pool.query("INSERT INTO a_parents VALUES (2)");
    await expect(restoreSystemBackupFromKey("db/test")).resolves.toMatchObject({
      schemaVersion: 1,
    });
    expect((await pool.query("SELECT * FROM a_parents")).rows).toEqual([{ id: 1 }]);
    await assertLockAvailable();
  });

  it("restores saved CRM stage presentation and immutable keys through real settings reads", async () => {
    await pool.query(`CREATE TABLE system_settings (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      key text NOT NULL UNIQUE,
      value text NOT NULL,
      category text NOT NULL,
      is_secret boolean NOT NULL DEFAULT false,
      updated_at timestamp DEFAULT now()
    )`);
    const savedConfig = crmPipelineConfigSchema.parse({
      version: 1,
      stages: DEFAULT_CRM_PIPELINE_CONFIG.stages
        .map((stage, index) => ({
          key: stage.key,
          label: `Saved stage ${index + 1} & ready`,
          color: CRM_PIPELINE_COLORS[(index + 2) % CRM_PIPELINE_COLORS.length],
        }))
        .reverse(),
    });
    const changedConfig = crmPipelineConfigSchema.parse({
      version: 1,
      stages: DEFAULT_CRM_PIPELINE_CONFIG.stages.map((stage, index) => ({
        ...stage,
        label: `Changed stage ${index + 1}`,
      })),
    });
    await saveCrmPipelineSettings(savedConfig, "synthetic-backup-admin");
    expect(await getCrmPipelineSettings()).toEqual({
      config: savedConfig,
      source: "stored",
      issue: null,
    });
    await runSystemBackup();
    const snapshot = exportedSnapshot();
    const savedRow = snapshot.tables
      .find((table) => table.name === "system_settings")
      ?.rows.find((row) => row.key === CRM_PIPELINE_SETTING_KEY);
    expect(savedRow).toMatchObject({
      category: "crm",
      is_secret: false,
      value: JSON.stringify(savedConfig),
    });

    await saveCrmPipelineSettings(changedConfig, "synthetic-backup-admin");
    expect((await getCrmPipelineSettings()).config).toEqual(changedConfig);
    // Prime both the key cache and category cache before restoring in this process.
    expect(
      (await applicationStorage.settings.getDecryptedCategory("crm"))[CRM_PIPELINE_SETTING_KEY],
    ).toBe(JSON.stringify(changedConfig));
    vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify(snapshot)));
    await restoreSystemBackupFromKey("db/synthetic-crm-config");

    const restoredRow = (
      await pool.query("SELECT value FROM system_settings WHERE key=$1", [CRM_PIPELINE_SETTING_KEY])
    ).rows[0];
    expect(JSON.parse(restoredRow.value)).toEqual(savedConfig);
    // A new process and the current admin process must both observe restored data.
    const freshSettings = new SettingsStorage();
    expect(JSON.parse((await freshSettings.getSetting(CRM_PIPELINE_SETTING_KEY))!)).toEqual(
      savedConfig,
    );
    expect(await getCrmPipelineSettings()).toEqual({
      config: savedConfig,
      source: "stored",
      issue: null,
    });
    expect(
      (await applicationStorage.settings.getDecryptedCategory("crm"))[CRM_PIPELINE_SETTING_KEY],
    ).toBe(JSON.stringify(savedConfig));
    expect([...savedConfig.stages.map((stage) => stage.key)].sort()).toEqual(
      [...CRM_LEAD_STAGES].sort(),
    );
    await assertLockAvailable();
  });
});
