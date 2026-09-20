const reviewedIdentity={operationId:"11111111-1111-4111-8111-111111111111",actorId:"synthetic-owner"};
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
  beginBackupStorageOperation: vi.fn(),
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
  reserveSystemBackupRestoreReview,
  restoreReviewedSystemBackup,
  getReviewedRestoreOutcome,
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
    await pool.query("CREATE SCHEMA IF NOT EXISTS p1_operations");
    await pool.query("DROP TABLE IF EXISTS p1_operations.restore_receipts");
    const { readFile } = await import("node:fs/promises");
    await pool.query(await readFile(new URL("../../p1-migrations/0008_restore_operation_receipts.sql",import.meta.url),"utf8"));
    await pool.query(await readFile(new URL("../../p1-migrations/0009_restore_receipt_reservations.sql",import.meta.url),"utf8"));
    vi.clearAllMocks();
    vi.stubEnv("CLIENT_STACK_ID", "backup-test");
    vi.stubEnv("SYSTEM_BACKUP_EXCLUDED_TABLES", "session,__drizzle_migrations");
    vi.mocked(storage.beginBackupStorageOperation).mockResolvedValue({ source: "env", bucketName: "test", prefix: "test" });
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

  it("rolls owned identity sequence state back when completion receipt fails after setval", async () => {
    await pool.query("ALTER TABLE a_parents ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY");
    await pool.query("SELECT setval(pg_get_serial_sequence('a_parents','id'),40,true)");
    await runSystemBackup();
    const snapshot=exportedSnapshot();
    vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify(snapshot)));
    const review=await reserveSystemBackupRestoreReview(snapshot.manifest.key,reviewedIdentity);
    expect((await pool.query("INSERT INTO a_parents DEFAULT VALUES RETURNING id")).rows).toEqual([{id:41}]);
    await pool.query(`CREATE FUNCTION p1_operations.reject_owned_sequence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic post-sequence failure'; END $$;
      CREATE TRIGGER reject_owned_sequence BEFORE UPDATE ON p1_operations.restore_receipts FOR EACH ROW WHEN (NEW.status = 'completed') EXECUTE FUNCTION p1_operations.reject_owned_sequence()`);
    try {
      await expect(restoreReviewedSystemBackup(snapshot.manifest.key,review.fingerprint,review.expiresAt,reviewedIdentity)).rejects.toThrow("Synthetic post-sequence failure");
      expect((await pool.query("SELECT last_value::text,is_called FROM a_parents_id_seq")).rows).toEqual([{last_value:"41",is_called:true}]);
      expect((await pool.query("INSERT INTO a_parents DEFAULT VALUES RETURNING id")).rows).toEqual([{id:42}]);
      expect((await pool.query("SELECT id FROM a_parents ORDER BY id")).rows).toEqual([{id:1},{id:41},{id:42}]);
      await assertLockAvailable();
    } finally {await pool.query("DROP TRIGGER reject_owned_sequence ON p1_operations.restore_receipts; DROP FUNCTION p1_operations.reject_owned_sequence()");}
  });

  it("ignores archived sequence aliases targeting excluded data, including on rollback", async () => {
    await runSystemBackup();
    const snapshot=exportedSnapshot();
    await pool.query("CREATE TABLE excluded_assets (id serial PRIMARY KEY)");
    try {
      await pool.query("INSERT INTO excluded_assets DEFAULT VALUES");
      await pool.query("SELECT setval('excluded_assets_id_seq',73,true)");
      vi.stubEnv("SYSTEM_BACKUP_EXCLUDED_TABLES","session,__drizzle_migrations,excluded_assets");
      snapshot.sequences=[{tableName:"a_parents",columnName:"id",sequenceName:"public.excluded_assets_id_seq"}];
      vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify(snapshot)));
      const review=await reserveSystemBackupRestoreReview(snapshot.manifest.key,reviewedIdentity);
      await pool.query("INSERT INTO a_parents VALUES (2)");
      await restoreReviewedSystemBackup(snapshot.manifest.key,review.fingerprint,review.expiresAt,reviewedIdentity);
      expect((await pool.query("SELECT last_value::text,is_called FROM excluded_assets_id_seq")).rows).toEqual([{last_value:"73",is_called:true}]);
      expect((await pool.query("SELECT * FROM excluded_assets")).rows).toEqual([{id:1}]);
      await pool.query("INSERT INTO a_parents VALUES (2)");
      await pool.query(`CREATE FUNCTION p1_operations.reject_sequence_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic receipt rejection'; END $$;
        CREATE TRIGGER reject_sequence_fixture BEFORE UPDATE ON p1_operations.restore_receipts FOR EACH ROW WHEN (NEW.status = 'completed') EXECUTE FUNCTION p1_operations.reject_sequence_fixture()`);
      try {
        const second=await reserveSystemBackupRestoreReview(snapshot.manifest.key,{...reviewedIdentity,operationId:"33333333-3333-4333-8333-333333333333"});
        await expect(restoreReviewedSystemBackup(snapshot.manifest.key,second.fingerprint,second.expiresAt,{...reviewedIdentity,operationId:second.operationId})).rejects.toThrow("Synthetic receipt rejection");
        expect((await pool.query("SELECT last_value::text,is_called FROM excluded_assets_id_seq")).rows).toEqual([{last_value:"73",is_called:true}]);
        expect((await pool.query("SELECT * FROM a_parents ORDER BY id")).rows).toEqual([{id:1},{id:2}]);
      } finally {await pool.query("DROP TRIGGER reject_sequence_fixture ON p1_operations.restore_receipts; DROP FUNCTION p1_operations.reject_sequence_fixture()");}
      await assertLockAvailable();
    } finally {await pool.query("DROP TABLE excluded_assets");}
  });

  it("reconciles only matched receipts under the restore lock and never changes data", async () => {
    const {reserveRestoreReceipt,admitRestoreReceipt,completeRestoreReceipt}=await import("./restore-receipt");
    const input={...reviewedIdentity,fingerprint:"a".repeat(64),expiresAt:new Date(Date.now()+60_000).toISOString()};
    expect(await getReviewedRestoreOutcome(input)).toBe("unknown");
    const c=await pool.connect();
    try { await reserveRestoreReceipt(c,input); await admitRestoreReceipt(c,input); } finally {c.release();}
    expect(await getReviewedRestoreOutcome(input)).toBe("unknown");
    input.expiresAt=new Date(Date.now()-60_000).toISOString();
    await pool.query("UPDATE p1_operations.restore_receipts SET expires_at=$1",[input.expiresAt]);
    {
      expect(await getReviewedRestoreOutcome(input)).toBe("not_applied");
      expect(await getReviewedRestoreOutcome({...input,actorId:"another-owner"})).toBe("unknown");
      const lock=await pool.connect();
      try {
        await lock.query("SELECT pg_advisory_lock(880120441)");
        await expect(getReviewedRestoreOutcome(input)).rejects.toThrow("already running");
      } finally {await lock.query("SELECT pg_advisory_unlock(880120441)");lock.release();}
    }
    const complete=await pool.connect();
    try {await expect(completeRestoreReceipt(complete,input)).rejects.toThrow("could not be completed");} finally {complete.release();}
    expect(await getReviewedRestoreOutcome(input)).toBe("not_applied");
    expect((await pool.query("SELECT * FROM a_parents")).rows).toEqual([{id:1}]);
    await assertLockAvailable();
  });

  it("migrates existing started/completed receipts without losing their evidence", async () => {
    const {readFile}=await import("node:fs/promises");
    await pool.query("DROP TABLE p1_operations.restore_receipts");
    await pool.query(await readFile(new URL("../../p1-migrations/0008_restore_operation_receipts.sql",import.meta.url),"utf8"));
    await pool.query(`INSERT INTO p1_operations.restore_receipts(operation_id,actor_id,fingerprint,expires_at,status,completed_at)
      VALUES ('11111111-1111-4111-8111-111111111111','owner',$1,now(),'started',NULL),
      ('22222222-2222-4222-8222-222222222222','owner',$1,now(),'completed',now())`,["a".repeat(64)]);
    const before=(await pool.query("SELECT * FROM p1_operations.restore_receipts ORDER BY operation_id")).rows;
    await pool.query(await readFile(new URL("../../p1-migrations/0009_restore_receipt_reservations.sql",import.meta.url),"utf8"));
    expect((await pool.query("SELECT * FROM p1_operations.restore_receipts ORDER BY operation_id")).rows).toEqual(before);
    expect((await pool.query(`INSERT INTO p1_operations.restore_receipts(operation_id,actor_id,fingerprint,expires_at)
      VALUES ('33333333-3333-4333-8333-333333333333','owner',$1,now()) RETURNING status,started_at`,["a".repeat(64)])).rows).toEqual([{status:"reserved",started_at:null}]);
  });

  it("reserves before execution and uses the database deadline despite application clock skew", async () => {
    await runSystemBackup();
    const snapshot=exportedSnapshot();
    vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify(snapshot)));
    const review=await reserveSystemBackupRestoreReview(snapshot.manifest.key,reviewedIdentity);
    const input={...reviewedIdentity,fingerprint:review.fingerprint,expiresAt:review.expiresAt};
    expect((await pool.query("SELECT status,started_at FROM p1_operations.restore_receipts")).rows).toEqual([{status:"reserved",started_at:null}]);
    await expect(reserveSystemBackupRestoreReview(snapshot.manifest.key,reviewedIdentity)).rejects.toThrow("already reserved");
    const fastClock=vi.spyOn(Date,"now").mockReturnValue(Date.parse(input.expiresAt)+60_000);
    try { expect(await getReviewedRestoreOutcome(input)).toBe("unknown"); } finally {fastClock.mockRestore();}
    expect(await getReviewedRestoreOutcome({...input,fingerprint:"b".repeat(64)})).toBe("unknown");
    const {admitRestoreReceipt}=await import("./restore-receipt");
    const client=await pool.connect();
    try {
      await expect(admitRestoreReceipt(client,{...input,actorId:"wrong-owner"})).rejects.toThrow("missing, expired or already admitted");
      input.expiresAt=new Date(Date.now()-60_000).toISOString();
      await client.query("UPDATE p1_operations.restore_receipts SET expires_at=$1",[input.expiresAt]);
      expect(await getReviewedRestoreOutcome(input)).toBe("not_applied");
      await expect(admitRestoreReceipt(client,input)).rejects.toThrow("missing, expired or already admitted");
      expect((await client.query("SELECT status FROM p1_operations.restore_receipts")).rows).toEqual([{status:"not_applied"}]);
      input.expiresAt=new Date(Date.now()+60_000).toISOString();
      await client.query("UPDATE p1_operations.restore_receipts SET expires_at=$1",[input.expiresAt]);
      expect(await getReviewedRestoreOutcome(input)).toBe("not_applied");
      await expect(admitRestoreReceipt(client,input)).rejects.toThrow("missing, expired or already admitted");
      await client.query("DELETE FROM p1_operations.restore_receipts");
      expect(await getReviewedRestoreOutcome(input)).toBe("unknown");
    } finally {client.release();}
    expect((await pool.query("SELECT * FROM a_parents")).rows).toEqual([{id:1}]);
    await assertLockAvailable();
  });

  it("restores an exact reviewed archive against PostgreSQL", async () => {
    await runSystemBackup();
    const snapshot=exportedSnapshot();
    vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify(snapshot)));
    const review=await reserveSystemBackupRestoreReview(snapshot.manifest.key,reviewedIdentity);
    await pool.query("INSERT INTO a_parents VALUES (2)");
    await restoreReviewedSystemBackup(snapshot.manifest.key,review.fingerprint,review.expiresAt,reviewedIdentity);
    expect((await pool.query("SELECT status FROM p1_operations.restore_receipts")).rows).toEqual([{status:"completed"}]);
    await pool.query("INSERT INTO a_parents VALUES (3)");
    await expect(restoreReviewedSystemBackup(snapshot.manifest.key,review.fingerprint,review.expiresAt,reviewedIdentity)).rejects.toThrow("already admitted");
    expect((await pool.query("SELECT id FROM a_parents WHERE id=3")).rowCount).toBe(1);
    // A retained public-data restore cannot overwrite operational receipts either.
    await restoreBackupSnapshot(snapshot);
    expect((await pool.query("SELECT status FROM p1_operations.restore_receipts")).rows).toEqual([{status:"completed"}]);
    expect((await pool.query("SELECT * FROM a_parents")).rows).toEqual([{id:1}]);
    expect((await pool.query("SELECT * FROM z_children")).rows).toEqual([{id:1,parent_id:1}]);
    await assertLockAvailable();
  });

  it("rolls restored data back if its completion receipt cannot commit", async () => {
    await runSystemBackup();
    const snapshot=exportedSnapshot();
    vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify(snapshot)));
    const review=await reserveSystemBackupRestoreReview(snapshot.manifest.key,reviewedIdentity);
    await pool.query("INSERT INTO a_parents VALUES (2)");
    await pool.query(`CREATE FUNCTION p1_operations.reject_completion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic receipt failure'; END $$;
      CREATE TRIGGER reject_completion BEFORE UPDATE ON p1_operations.restore_receipts FOR EACH ROW WHEN (NEW.status = 'completed') EXECUTE FUNCTION p1_operations.reject_completion()`);
    try {
      await expect(restoreReviewedSystemBackup(snapshot.manifest.key,review.fingerprint,review.expiresAt,reviewedIdentity)).rejects.toThrow("Synthetic receipt failure");
      expect((await pool.query("SELECT * FROM a_parents ORDER BY id")).rows).toEqual([{id:1},{id:2}]);
      expect((await pool.query("SELECT status FROM p1_operations.restore_receipts")).rows).toEqual([{status:"started"}]);
      await assertLockAvailable();
    } finally { await pool.query("DROP TRIGGER reject_completion ON p1_operations.restore_receipts; DROP FUNCTION p1_operations.reject_completion()"); }
  });

  it("preserves newly introduced and excluded referencing tables during reviewed rejection", async () => {
    await runSystemBackup();
    const snapshot=exportedSnapshot();
    vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify(snapshot)));
    const review=await reserveSystemBackupRestoreReview(snapshot.manifest.key,reviewedIdentity);
    await pool.query("CREATE TABLE newer_customer_data (id integer PRIMARY KEY, parent_id integer REFERENCES a_parents(id))");
    try {
      await pool.query("INSERT INTO newer_customer_data VALUES (7,1)");
      await pool.query("INSERT INTO a_parents VALUES (2)");
      const execute=async(operationId=reviewedIdentity.operationId)=>{
        const selected=operationId===reviewedIdentity.operationId?review:await reserveSystemBackupRestoreReview(snapshot.manifest.key,{...reviewedIdentity,operationId});
        return restoreReviewedSystemBackup(snapshot.manifest.key,selected.fingerprint,selected.expiresAt,{...reviewedIdentity,operationId});
      };
      await expect(execute()).rejects.toThrow("table inventory differs");
      vi.stubEnv("SYSTEM_BACKUP_EXCLUDED_TABLES","session,__drizzle_migrations,newer_customer_data");
      await expect(execute("22222222-2222-4222-8222-222222222222")).rejects.toThrow("foreign key constraint");
      expect((await pool.query("SELECT status FROM p1_operations.restore_receipts")).rows).toEqual([{status:"started"},{status:"started"}]);
      expect((await pool.query("SELECT * FROM newer_customer_data")).rows).toEqual([{id:7,parent_id:1}]);
      expect((await pool.query("SELECT * FROM a_parents ORDER BY id")).rows).toEqual([{id:1},{id:2}]);
      await assertLockAvailable();
    } finally { await pool.query("DROP TABLE newer_customer_data"); }
  });

  it("restores GENERATED ALWAYS identity IDs, foreign keys and the next generated value", async () => {
    await pool.query("DROP TABLE z_children, a_parents");
    await pool.query("CREATE TABLE a_parents (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, label text NOT NULL)");
    await pool.query("CREATE TABLE z_children (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, parent_id integer REFERENCES a_parents(id))");
    await pool.query("INSERT INTO a_parents (id,label) OVERRIDING SYSTEM VALUE VALUES (41,'archived parent')");
    await pool.query("INSERT INTO z_children (id,parent_id) OVERRIDING SYSTEM VALUE VALUES (73,41)");
    await runSystemBackup();
    const snapshot = exportedSnapshot();
    expect(snapshot.sequences.map(sequence => sequence.tableName).sort()).toEqual(["a_parents", "z_children"]);
    // Historical archives have the same rows but omitted GENERATED ALWAYS sequences.
    snapshot.sequences = [];
    await pool.query("UPDATE a_parents SET label='changed after backup'");
    await restoreBackupSnapshot(snapshot);
    expect((await pool.query("SELECT * FROM a_parents")).rows).toEqual([{ id: 41, label: "archived parent" }]);
    expect((await pool.query("SELECT * FROM z_children")).rows).toEqual([{ id: 73, parent_id: 41 }]);
    expect((await pool.query("INSERT INTO a_parents(label) VALUES ('next') RETURNING id")).rows).toEqual([{ id: 42 }]);
    expect((await pool.query("INSERT INTO z_children(parent_id) VALUES (42) RETURNING id,parent_id")).rows).toEqual([{ id: 74, parent_id: 42 }]);
    await assertLockAvailable();
  });

  it("restores an empty ALWAYS identity table with next generated value one", async () => {
    await pool.query("DROP TABLE z_children, a_parents");
    await pool.query("CREATE TABLE a_parents (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY)");
    await runSystemBackup();
    const snapshot = exportedSnapshot();
    snapshot.sequences = [];
    await pool.query("INSERT INTO a_parents DEFAULT VALUES");
    await restoreBackupSnapshot(snapshot);
    expect((await pool.query("SELECT * FROM a_parents")).rows).toEqual([]);
    expect((await pool.query("INSERT INTO a_parents DEFAULT VALUES RETURNING id")).rows).toEqual([{ id: 1 }]);
    await assertLockAvailable();
  });

  it("round trips naive timestamps without timezone conversion or microsecond loss", async () => {
    await pool.query("ALTER TABLE a_parents ADD COLUMN happened_at timestamp, ADD COLUMN calendar_day date, ADD COLUMN instant timestamptz");
    await pool.query("UPDATE a_parents SET happened_at='2026-09-19 10:11:12.123456', calendar_day='2026-09-19', instant='2026-09-19 10:11:12.123456-04'");
    const before = await pool.query("SELECT happened_at::text,calendar_day::text,extract(epoch FROM instant)::text AS instant FROM a_parents");
    await runSystemBackup();
    const snapshot = exportedSnapshot();
    const row = snapshot.tables.find(table => table.name === "a_parents")!.rows[0];
    expect(row.happened_at).toBe("2026-09-19 10:11:12.123456");
    expect(row.calendar_day).toBe("2026-09-19");
    expect(typeof row.instant).toBe("string");
    expect(row.instant).toContain(".123456");
    await pool.query("UPDATE a_parents SET happened_at='2020-01-01', calendar_day='2020-01-01', instant='2020-01-01Z'");
    await restoreBackupSnapshot(snapshot);
    const restored = await pool.query("SELECT happened_at::text,calendar_day::text,extract(epoch FROM instant)::text AS instant FROM a_parents");
    expect(restored.rows).toEqual(before.rows);
  });

  it("rolls back identity rows and generators when restore violates a foreign key", async () => {
    await pool.query("DROP TABLE z_children, a_parents");
    await pool.query("CREATE TABLE a_parents (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY)");
    await pool.query("CREATE TABLE z_children (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, parent_id integer REFERENCES a_parents(id))");
    await pool.query("INSERT INTO a_parents DEFAULT VALUES");
    await pool.query("INSERT INTO z_children(parent_id) VALUES (1)");
    await runSystemBackup();
    const snapshot = exportedSnapshot();
    // Advance the live generators beyond the archived values before the failed restore.
    await pool.query("INSERT INTO a_parents DEFAULT VALUES");
    await pool.query("INSERT INTO z_children(parent_id) VALUES (2)");
    snapshot.tables.find(table => table.name === "z_children")!.rows = [{ id: 73, parent_id: 999 }];
    await expect(restoreBackupSnapshot(snapshot)).rejects.toThrow("foreign key constraint");
    expect((await pool.query("SELECT * FROM a_parents ORDER BY id")).rows).toEqual([{ id: 1 }, { id: 2 }]);
    expect((await pool.query("SELECT * FROM z_children ORDER BY id")).rows).toEqual([{ id: 1, parent_id: 1 }, { id: 2, parent_id: 2 }]);
    expect((await pool.query("INSERT INTO a_parents DEFAULT VALUES RETURNING id")).rows).toEqual([{ id: 3 }]);
    expect((await pool.query("INSERT INTO z_children(parent_id) VALUES (3) RETURNING id")).rows).toEqual([{ id: 3 }]);
    await assertLockAvailable();
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
