import { startStoppableWorker, type StoppableWorker } from "../utils/runtime-lifecycle";
import { gzipSync, gunzipSync } from "zlib";
import type { PoolClient } from "pg";
import { pool } from "../db";
import { logger } from "../utils/logger";
import { recordDomainOutcome } from "../utils/metrics";
import {
  deleteBackupObject,
  downloadBackupObject,
  getBackupStorageInfo,
  isBackupStorageConfigured,
  listBackupObjects,
  uploadBackupObject,
} from "./backup-storage.service";
import { assertBackupRestoreIdentity } from "./backup-restore-identity";

declare const __APP_VERSION__: string;

type BackupRunReason = "scheduled" | "manual" | "startup";

interface BackupTableSnapshot {
  name: string;
  rowCount: number;
  rows: Record<string, unknown>[];
}

interface BackupSequenceSnapshot {
  tableName: string;
  columnName: string;
  sequenceName: string;
}

interface BackupManifest {
  schemaVersion: 1;
  clientStackId?: string | null;
  createdAt: string;
  key: string;
  reason: BackupRunReason;
  appVersion: string;
  gitCommitSha: string | null;
  environment: string;
  railwayEnvironment: string | null;
  railwayProjectId: string | null;
  railwayServiceId: string | null;
  storageSource: "env" | "settings";
  bucketName: string;
  bucketPrefix: string;
  tableCount: number;
  totalRowCount: number;
  mediaAssetCount: number;
  restoreOrder: string[];
}

interface DatabaseBackupSnapshot {
  manifest: BackupManifest;
  sequences: BackupSequenceSnapshot[];
  tables: BackupTableSnapshot[];
}

interface RestoreBackupSnapshotOptions {
  allowLegacyBackup?: boolean;
}

interface BackupStatus {
  enabled: boolean;
  configured: boolean;
  intervalHours: number;
  retentionDays: number;
  maxSnapshots: number;
  storage: Awaited<ReturnType<typeof getBackupStorageInfo>>;
  latest: BackupManifest | null;
  recent: BackupManifest[];
}

const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown";
const MANIFEST_LATEST_KEY = "manifests/latest.json";
const SNAPSHOT_PREFIX = "db";
const ADVISORY_LOCK_ID = 880_120_441;
const DEFAULT_EXCLUDED_TABLES = new Set(["session", "__drizzle_migrations"]);
let backupWorker: StoppableWorker | undefined;

function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function serializeRestoreValue(
  value: unknown,
  jsonColumns: ReadonlySet<string>,
  column: string,
) {
  if (value === null || value === undefined || !jsonColumns.has(column)) return value ?? null;
  return JSON.stringify(value);
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getBackupIntervalHours() {
  return parsePositiveInt(process.env.SYSTEM_BACKUP_INTERVAL_HOURS, 24);
}

function getRetentionDays() {
  return parsePositiveInt(process.env.SYSTEM_BACKUP_RETENTION_DAYS, 30);
}

function getMaxSnapshots() {
  return parsePositiveInt(process.env.SYSTEM_BACKUP_MAX_SNAPSHOTS, 30);
}

function shouldEnableBackups() {
  if (process.env.SYSTEM_BACKUPS_ENABLED === "false") return false;
  if (process.env.SYSTEM_BACKUPS_ENABLED === "true") return true;
  return process.env.NODE_ENV === "production";
}

function getExcludedTables() {
  const envValue = process.env.SYSTEM_BACKUP_EXCLUDED_TABLES;
  if (!envValue) {
    return new Set(DEFAULT_EXCLUDED_TABLES);
  }
  return new Set(
    envValue
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

function buildSnapshotKey(createdAt: Date, reason: BackupRunReason) {
  const isoStamp = createdAt.toISOString().replace(/[:.]/g, "-");
  return `${SNAPSHOT_PREFIX}/${isoStamp}-${reason}.json.gz`;
}

async function queryAllTableNames(client: PoolClient) {
  const excludedTables = getExcludedTables();
  const result = await client.query<{ table_name: string }>(`
    SELECT tablename AS table_name
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename ASC
  `);

  return result.rows
    .map((row) => row.table_name)
    .filter((tableName) => !excludedTables.has(tableName));
}

async function queryForeignKeyGraph(client: PoolClient) {
  const result = await client.query<{ child_table: string; parent_table: string }>(`
    SELECT
      tc.table_name AS child_table,
      ccu.table_name AS parent_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.constraint_schema = ccu.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
  `);

  return result.rows;
}

function topologicallySortTables(
  tables: string[],
  edges: Array<{ child_table: string; parent_table: string }>,
) {
  const tableSet = new Set(tables);
  const inbound = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();

  for (const table of tables) {
    inbound.set(table, new Set());
    outgoing.set(table, new Set());
  }

  for (const edge of edges) {
    if (!tableSet.has(edge.child_table) || !tableSet.has(edge.parent_table)) continue;
    inbound.get(edge.child_table)?.add(edge.parent_table);
    outgoing.get(edge.parent_table)?.add(edge.child_table);
  }

  const ready = tables.filter((table) => (inbound.get(table)?.size ?? 0) === 0).sort();
  const order: string[] = [];

  while (ready.length > 0) {
    const table = ready.shift()!;
    order.push(table);
    const children = Array.from(outgoing.get(table) ?? []).sort();
    for (const child of children) {
      const parents = inbound.get(child);
      if (!parents) continue;
      parents.delete(table);
      if (parents.size === 0) {
        ready.push(child);
        ready.sort();
      }
    }
  }

  if (order.length !== tables.length) {
    const remaining = tables.filter((table) => !order.includes(table)).sort();
    logger.backup.warn(
      "Detected cyclic or unresolved table dependencies during backup ordering; appending remaining tables alphabetically",
      {
        remainingTables: remaining,
      },
    );
    order.push(...remaining);
  }

  return order;
}

async function querySequenceColumns(client: PoolClient) {
  const result = await client.query<BackupSequenceSnapshot>(`
    SELECT
      cols.table_name AS "tableName",
      cols.column_name AS "columnName",
      pg_get_serial_sequence(format('%I.%I', cols.table_schema, cols.table_name), cols.column_name) AS "sequenceName"
    FROM information_schema.columns cols
    WHERE cols.table_schema = 'public'
      AND cols.column_default LIKE 'nextval(%'
  `);

  return result.rows.filter((row) => Boolean(row.sequenceName));
}

async function captureTable(client: PoolClient, tableName: string): Promise<BackupTableSnapshot> {
  const result = await client.query<Record<string, unknown>>(
    `SELECT * FROM public.${quoteIdent(tableName)}`,
  );

  return {
    name: tableName,
    rowCount: result.rowCount ?? result.rows.length,
    rows: result.rows,
  };
}

async function writeLatestManifest(manifest: BackupManifest) {
  await uploadBackupObject(
    MANIFEST_LATEST_KEY,
    Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
    "application/json",
  );
}

async function pruneExpiredBackups(retentionDays: number, maxSnapshots: number) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const objects = await listBackupObjects(SNAPSHOT_PREFIX, 500);

  for (const [index, object] of objects.entries()) {
    const modifiedAt = object.lastModified ? new Date(object.lastModified).getTime() : 0;
    const overCountLimit = index >= maxSnapshots;
    const overAgeLimit = Boolean(modifiedAt) && modifiedAt < cutoff;

    if (!overCountLimit && !overAgeLimit) continue;
    await deleteBackupObject(object.key);
  }
}

// Session advisory locks must stay on a checked-out connection until the entire
// operation finishes, including object upload/download and retention work.
async function withBackupLock<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let acquired = false;
  let acquisitionCompleted = false;
  let discardConnection = false;
  let outcome: { ok: true; value: T } | { ok: false; error: unknown };
  try {
    const result = await client.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS acquired",
      [ADVISORY_LOCK_ID],
    );
    acquisitionCompleted = true;
    acquired = Boolean(result.rows[0]?.acquired);
    if (!acquired) throw new Error("Another backup or restore is already running");
    outcome = { ok: true, value: await operation(client) };
  } catch (error) {
    // An acquisition query may have reached the server even if its reply failed.
    discardConnection = !acquisitionCompleted;
    outcome = { ok: false, error };
  }

  try {
    if (acquired) {
      const result = await client.query<{ released: boolean }>(
        "SELECT pg_advisory_unlock($1) AS released",
        [ADVISORY_LOCK_ID],
      );
      if (!result.rows[0]?.released) throw new Error("Backup lock release failed");
    }
  } catch (error) {
    discardConnection = true;
    logger.backup.error("Backup lock cleanup failed; discarding connection", error);
    if (outcome.ok) outcome = { ok: false, error };
  } finally {
    client.release(discardConnection);
  }
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

async function withBackupTransaction<T>(
  client: PoolClient,
  begin: string,
  operation: () => Promise<T>,
): Promise<T> {
  await client.query(begin);
  try {
    const result = await operation();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    // Preserve the original failure. An unusable session will be discarded by
    // withBackupLock when its unlock query fails.
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

export async function runSystemBackup(reason: BackupRunReason = "manual") {
  if (!(await isBackupStorageConfigured())) {
    throw new Error("Backup storage is not configured");
  }

  const storageInfo = await getBackupStorageInfo();
  if (!storageInfo) {
    throw new Error("Backup storage is not available");
  }

  return withBackupLock(async (client) => {
    try {
      const createdAt = new Date();
      const { restoreOrder, sequences, tableSnapshots } = await withBackupTransaction(
        client,
        "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
        async () => {
          const tables = await queryAllTableNames(client);
          const edges = await queryForeignKeyGraph(client);
          const restoreOrder = topologicallySortTables(tables, edges);
          const sequences = await querySequenceColumns(client);
          const tableSnapshots: BackupTableSnapshot[] = [];
          for (const tableName of tables) {
            tableSnapshots.push(await captureTable(client, tableName));
          }
          return { restoreOrder, sequences, tableSnapshots };
        },
      );

      const totalRowCount = tableSnapshots.reduce((sum, table) => sum + table.rowCount, 0);
      const mediaAssetTable = tableSnapshots.find((table) => table.name === "cms_media");
      const mediaAssetCount = mediaAssetTable?.rowCount ?? 0;

      const manifest: BackupManifest = {
        schemaVersion: 1,
        clientStackId: process.env.CLIENT_STACK_ID?.trim() || null,
        createdAt: createdAt.toISOString(),
        key: buildSnapshotKey(createdAt, reason),
        reason,
        appVersion: APP_VERSION,
        gitCommitSha: process.env.RAILWAY_GIT_COMMIT_SHA || null,
        environment: process.env.NODE_ENV || "development",
        railwayEnvironment: process.env.RAILWAY_ENVIRONMENT_NAME || null,
        railwayProjectId: process.env.RAILWAY_PROJECT_ID || null,
        railwayServiceId: process.env.RAILWAY_SERVICE_ID || null,
        storageSource: storageInfo.source,
        bucketName: storageInfo.bucketName,
        bucketPrefix: storageInfo.prefix,
        tableCount: tableSnapshots.length,
        totalRowCount,
        mediaAssetCount,
        restoreOrder,
      };

      const snapshot: DatabaseBackupSnapshot = {
        manifest,
        sequences,
        tables: tableSnapshots,
      };

      const compressed = gzipSync(Buffer.from(JSON.stringify(snapshot), "utf8"));
      const uploaded = await uploadBackupObject(manifest.key, compressed, "application/json", {
        contentEncoding: "gzip",
        metadata: {
          createdAt: manifest.createdAt,
          reason: manifest.reason,
          appVersion: manifest.appVersion,
        },
      });

      if (!uploaded) {
        throw new Error("Backup upload failed");
      }

      manifest.key = uploaded.key;
      await writeLatestManifest(manifest);
      await pruneExpiredBackups(getRetentionDays(), getMaxSnapshots());

      logger.backup.info("System backup completed", {
        key: manifest.key,
        totalRowCount,
        tableCount: manifest.tableCount,
        reason,
      });
      recordDomainOutcome("backup", "completed");

      return manifest;
    } catch (error) {
      recordDomainOutcome("backup", "failed");
      throw error;
    }
  });
}

export async function listRecentBackupManifests(limit = 10): Promise<BackupManifest[]> {
  const objects = await listBackupObjects(SNAPSHOT_PREFIX, Math.max(limit, 20));
  const manifests: BackupManifest[] = [];

  for (const object of objects.slice(0, limit)) {
    try {
      const buffer = await downloadBackupObject(object.key);
      if (!buffer) continue;
      const snapshot = JSON.parse(gunzipSync(buffer).toString("utf8")) as DatabaseBackupSnapshot;
      if (snapshot?.manifest?.schemaVersion === 1) {
        manifests.push(snapshot.manifest);
      }
    } catch (error) {
      logger.backup.warn("Failed to read backup object while listing manifests", {
        key: object.key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return manifests.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const configured = await isBackupStorageConfigured();
  const storage = configured ? await getBackupStorageInfo() : null;
  const latest = configured
    ? await listRecentBackupManifests(1).then((items) => items[0] ?? null)
    : null;
  const recent = configured ? await listRecentBackupManifests(10) : [];

  return {
    enabled: shouldEnableBackups(),
    configured,
    intervalHours: getBackupIntervalHours(),
    retentionDays: getRetentionDays(),
    maxSnapshots: getMaxSnapshots(),
    storage,
    latest,
    recent,
  };
}

export async function loadBackupSnapshotFromKey(key: string): Promise<DatabaseBackupSnapshot> {
  const buffer = await downloadBackupObject(key);
  if (!buffer) {
    throw new Error(`Backup not found: ${key}`);
  }

  return JSON.parse(gunzipSync(buffer).toString("utf8")) as DatabaseBackupSnapshot;
}

async function restoreBackupSnapshotWithClient(
  client: PoolClient,
  snapshot: DatabaseBackupSnapshot,
  options: RestoreBackupSnapshotOptions = {},
) {
  const identity = assertBackupRestoreIdentity(snapshot.manifest, {
    targetStackId: process.env.CLIENT_STACK_ID,
    allowLegacyBackup: options.allowLegacyBackup,
  });
  try {
    await withBackupTransaction(client, "BEGIN", async () => {
      const tableNames = snapshot.tables.map((table) => table.name);
      if (tableNames.length > 0) {
        await client.query(
          `TRUNCATE TABLE ${tableNames.map((table) => `public.${quoteIdent(table)}`).join(", ")} RESTART IDENTITY CASCADE`,
        );
      }

      const tablesByName = new Map(snapshot.tables.map((table) => [table.name, table] as const));
      for (const tableName of snapshot.manifest.restoreOrder) {
        const table = tablesByName.get(tableName);
        if (!table || table.rows.length === 0) continue;

        const columns = Object.keys(table.rows[0]);
        if (columns.length === 0) continue;
        const jsonColumnResult = await client.query<{ column_name: string }>(
          `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = $1
           AND data_type IN ('json', 'jsonb')`,
          [tableName],
        );
        const jsonColumns = new Set(jsonColumnResult.rows.map((row) => row.column_name));

        const chunkSize = 100;
        for (let offset = 0; offset < table.rows.length; offset += chunkSize) {
          const chunk = table.rows.slice(offset, offset + chunkSize);
          const values: unknown[] = [];
          const placeholders = chunk.map((row, rowIndex) => {
            const rowPlaceholders = columns.map((column, columnIndex) => {
              values.push(
                serializeRestoreValue(
                  (row as Record<string, unknown>)[column],
                  jsonColumns,
                  column,
                ),
              );
              return `$${rowIndex * columns.length + columnIndex + 1}`;
            });
            return `(${rowPlaceholders.join(", ")})`;
          });

          await client.query(
            `INSERT INTO public.${quoteIdent(tableName)} (${columns.map(quoteIdent).join(", ")}) VALUES ${placeholders.join(", ")}`,
            values,
          );
        }
      }

      for (const sequence of snapshot.sequences) {
        await client.query(
          `SELECT setval($1::regclass, COALESCE((SELECT MAX(${quoteIdent(sequence.columnName)})::bigint FROM public.${quoteIdent(sequence.tableName)}), 1), COALESCE((SELECT MAX(${quoteIdent(sequence.columnName)}) IS NOT NULL FROM public.${quoteIdent(sequence.tableName)}), false))`,
          [sequence.sequenceName],
        );
      }
    });
    // A same-process admin restore must not keep serving pre-restore settings.
    // Invalidate only after the transaction commits; rollback retains its cache.
    const { storage: applicationStorage } = await import("../storage/index");
    applicationStorage.settings.invalidateAll();
    logger.backup.info("Backup restore completed", {
      key: snapshot.manifest.key,
      createdAt: snapshot.manifest.createdAt,
      tableCount: snapshot.manifest.tableCount,
      identity: identity.kind,
    });
    recordDomainOutcome("restore", "completed");
  } catch (error) {
    recordDomainOutcome("restore", "failed");
    throw error;
  }
}

export async function restoreBackupSnapshot(
  snapshot: DatabaseBackupSnapshot,
  options: RestoreBackupSnapshotOptions = {},
) {
  // Keep identity rejection ahead of all database activity for direct/file restores.
  assertBackupRestoreIdentity(snapshot.manifest, {
    targetStackId: process.env.CLIENT_STACK_ID,
    allowLegacyBackup: options.allowLegacyBackup,
  });
  return withBackupLock((client) => restoreBackupSnapshotWithClient(client, snapshot, options));
}

export async function restoreSystemBackupFromKey(key: string) {
  return withBackupLock(async (client) => {
    const snapshot = await loadBackupSnapshotFromKey(key);
    await restoreBackupSnapshotWithClient(client, snapshot);
    return snapshot.manifest;
  });
}

export function startSystemBackupService() {
  if (backupWorker) return backupWorker;

  if (!shouldEnableBackups()) {
    logger.backup.info("System backups are disabled");
    return;
  }

  const intervalMs = getBackupIntervalHours() * 60 * 60 * 1000;

  const tick = async (isStopping: () => boolean) => {
    try {
      const configured = await isBackupStorageConfigured();
      if (!configured) {
        logger.backup.warn("Skipping scheduled backup because backup storage is not configured");
        return;
      }

      if (isStopping()) return;
      const latest = await listRecentBackupManifests(1).then((items) => items[0] ?? null);
      const latestAgeMs = latest
        ? Date.now() - new Date(latest.createdAt).getTime()
        : Number.POSITIVE_INFINITY;

      if (latest && latestAgeMs < intervalMs) {
        return;
      }

      if (isStopping()) return;
      await runSystemBackup(latest ? "scheduled" : "startup");
    } catch (error) {
      logger.backup.error("Scheduled backup run failed", error);
    }
  };

  const worker = startStoppableWorker({
    intervalMs: Math.min(intervalMs, 60 * 60 * 1000),
    run: tick,
    unref: true,
    onError: (error) => logger.backup.error("Scheduled backup run failed", error),
  });
  backupWorker = { stop: () => worker.stop() };

  logger.backup.info("System backup service started", {
    intervalHours: getBackupIntervalHours(),
    retentionDays: getRetentionDays(),
    maxSnapshots: getMaxSnapshots(),
  });
  return backupWorker;
}
