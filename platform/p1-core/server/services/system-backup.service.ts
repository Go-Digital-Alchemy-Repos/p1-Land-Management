import { expireRestoreReceipt, reserveRestoreReceipt, admitRestoreReceipt, completeRestoreReceipt, readRestoreReceipt, restoreReceiptIdentity, type RestoreReceiptIdentity } from "./restore-receipt";
import { validateBackupRestoreReview } from "./backup-restore-review";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { startStoppableWorker, type StoppableWorker } from "../utils/runtime-lifecycle";
import { gzipSync, gunzipSync } from "zlib";
import type { PoolClient } from "pg";
import { types as pgTypes } from "pg";
import { pool } from "../db";
import { logger } from "../utils/logger";
import { recordDomainOutcome } from "../utils/metrics";
import {
  beginBackupStorageOperation,
  type BackupStorageOperation,
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
      AND (cols.column_default LIKE 'nextval(%' OR cols.is_identity = 'YES')
  `);

  return result.rows.filter((row) => Boolean(row.sequenceName));
}

function backupTypeParser<T>(oid: number): (value: string) => T | string;
function backupTypeParser<T>(oid: number, format: "text"): (value: string) => T | string;
function backupTypeParser<T>(oid: number, format: "binary"): (value: Buffer) => T | string;
function backupTypeParser(oid: number, format: "text" | "binary" = "text") {
  if (format === "binary") return pgTypes.getTypeParser(oid, "binary");
  if ([1082, 1114, 1184].includes(oid)) return (value: string) => value;
  return pgTypes.getTypeParser(oid, "text");
}

async function captureTable(client: PoolClient, tableName: string): Promise<BackupTableSnapshot> {
  const result = await client.query<Record<string, unknown>>({
    text: `SELECT * FROM public.${quoteIdent(tableName)}`,
    // Date objects infer the process timezone for naive timestamps and discard
    // PostgreSQL microseconds. Preserve database text in this archive query only;
    // application-wide parsers and historical archives remain unchanged.
    types: { getTypeParser: backupTypeParser },
  });

  return {
    name: tableName,
    rowCount: result.rowCount ?? result.rows.length,
    rows: result.rows,
  };
}

async function writeLatestManifest(manifest: BackupManifest, operation: BackupStorageOperation) {
  await uploadBackupObject(
    MANIFEST_LATEST_KEY,
    Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
    "application/json",
    undefined,
    operation,
  );
}

async function pruneExpiredBackups(retentionDays: number, maxSnapshots: number, operation: BackupStorageOperation) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const objects = await listBackupObjects(SNAPSHOT_PREFIX, 500, operation);

  for (const [index, object] of objects.entries()) {
    const modifiedAt = object.lastModified ? new Date(object.lastModified).getTime() : 0;
    const overCountLimit = index >= maxSnapshots;
    const overAgeLimit = Boolean(modifiedAt) && modifiedAt < cutoff;

    if (!overCountLimit && !overAgeLimit) continue;
    await deleteBackupObject(object.key, operation);
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
  const operation = await beginBackupStorageOperation();
  if (!operation) throw new Error("Backup storage is not configured");
  const storageInfo = operation;

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
      }, operation);

      if (!uploaded) {
        throw new Error("Backup upload failed");
      }

      manifest.key = uploaded.key;
      await writeLatestManifest(manifest, operation);
      await pruneExpiredBackups(getRetentionDays(), getMaxSnapshots(), operation);

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

function isBackupManifest(value: unknown): value is BackupManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const manifest = value as Record<string, unknown>;
  return manifest.schemaVersion === 1 &&
    typeof manifest.createdAt === "string" && Number.isFinite(Date.parse(manifest.createdAt)) &&
    ["key", "appVersion", "environment", "bucketName", "bucketPrefix"].every(key => typeof manifest[key] === "string" && Boolean(manifest[key])) &&
    ["scheduled", "manual", "startup"].includes(manifest.reason as string) &&
    ["env", "settings"].includes(manifest.storageSource as string) &&
    ["tableCount", "totalRowCount", "mediaAssetCount"].every(key => Number.isSafeInteger(manifest[key]) && (manifest[key] as number) >= 0) &&
    ["gitCommitSha", "railwayEnvironment", "railwayProjectId", "railwayServiceId"].every(key => manifest[key] === null || typeof manifest[key] === "string") &&
    (manifest.clientStackId === undefined || manifest.clientStackId === null || typeof manifest.clientStackId === "string") &&
    Array.isArray(manifest.restoreOrder) && manifest.restoreOrder.every(name => typeof name === "string" && Boolean(name));
}

export async function listRecentBackupManifests(limit = 10, existingOperation?: BackupStorageOperation): Promise<BackupManifest[]> {
  const operation = existingOperation ?? await beginBackupStorageOperation();
  if (!operation) throw new Error("Backup storage is not configured");
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("Invalid backup history limit");
  const objects = await listBackupObjects(SNAPSHOT_PREFIX, Math.max(limit, 20), operation);
  const manifests: BackupManifest[] = [];

  for (const object of objects.slice(0, limit)) {
    try {
      const buffer = await downloadBackupObject(object.key, operation);
      if (!buffer?.length) throw new Error("Missing backup archive");
      const snapshot = JSON.parse(gunzipSync(buffer).toString("utf8"));
      if (!isBackupManifest(snapshot?.manifest)) throw new Error("Invalid backup manifest");
      // Historical archives embed their relative pre-upload key. Project the
      // object actually read through the configured-prefix guard.
      manifests.push({ ...snapshot.manifest, key: object.key });
    } catch {
      // Never turn unreadable history into an apparently empty/older history.
      // Provider errors and archive contents must not leak through this boundary.
      logger.backup.warn("Failed to read a backup history archive");
      throw new Error("Backup history contains an unreadable or invalid archive");
    }
  }
  return manifests.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const operation = await beginBackupStorageOperation();
  const configured = operation !== null;
  const storage = operation ? await getBackupStorageInfo(operation) : null;
  const recent = operation ? await listRecentBackupManifests(10, operation) : [];
  const latest = recent[0] ?? null;

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

export async function loadBackupSnapshotFromKey(key: string, operation?: BackupStorageOperation): Promise<DatabaseBackupSnapshot> {
  const buffer = await downloadBackupObject(key, operation);
  if (!buffer) {
    throw new Error(`Backup not found: ${key}`);
  }

  return JSON.parse(gunzipSync(buffer).toString("utf8")) as DatabaseBackupSnapshot;
}

async function restoreBackupSnapshotWithClient(
  client: PoolClient,
  snapshot: DatabaseBackupSnapshot,
  options: RestoreBackupSnapshotOptions = {},
  validateReviewedDeadline?: () => void,
  beforeCommit?: () => Promise<void>,
) {
  const identity = assertBackupRestoreIdentity(snapshot.manifest, {
    targetStackId: process.env.CLIENT_STACK_ID,
    allowLegacyBackup: options.allowLegacyBackup,
  });
  try {
    await withBackupTransaction(client, "BEGIN", async () => {
      // Publication adoption and restore must not interleave. Historical archives
      // cannot silently leave newer published content beside restored legacy rows.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('blog-publication-writes', 0))");
      const tableNames = snapshot.tables.map((table) => table.name);
      const receiptRelation = await client.query(
        "SELECT to_regclass('public.blog_static_import_receipts') AS relation",
      );
      if (receiptRelation.rows[0]?.relation) {
        const permanent = await client.query<Record<string, unknown>>(
          "SELECT receipt.*, receipt.imported_at::text AS imported_at FROM public.blog_static_import_receipts receipt",
        );
        const archived = snapshot.tables.find((table) => table.name === "blog_static_import_receipts");
        for (const owned of permanent.rows) {
          const matches = archived?.rows.filter((row) => row.source_slug === owned.source_slug) ?? [];
          const { imported_at: currentTime, ...currentIdentity } = owned;
          const { imported_at: archiveTime, ...archiveIdentity } = matches[0] ?? {};
          let sameTime = false;
          if (matches.length === 1 && (typeof archiveTime === "string" || archiveTime instanceof Date)) {
            // Let PostgreSQL compare instants with full microsecond precision.
            // Invalid timestamp input aborts before any TRUNCATE occurs.
            const compared = await client.query<{ equal: boolean }>(
              "SELECT $1::timestamptz = $2::timestamptz AS equal",
              [currentTime, archiveTime instanceof Date ? archiveTime.toISOString() : archiveTime],
            );
            sameTime = compared.rows[0]?.equal === true;
          }
          if (matches.length !== 1 || !sameTime || !isDeepStrictEqual(archiveIdentity, currentIdentity)) {
            throw new Error(
              "This archive would erase or change permanent static Blog ownership. Restore an archive retaining every existing complete import receipt, including its source mapping, revision, hashes, actor, provenance and import time; relinquishing ownership requires a separately reviewed website rollback.",
            );
          }
        }
      }
      const blogSidecars = ["blog_publication_state", "blog_post_revisions", "blog_publication_routes", "blog_publication_schedules"];
      if ([...blogSidecars, "blog_posts"].some((name) => !tableNames.includes(name))) {
        for (const name of blogSidecars) {
          const exists = await client.query("SELECT to_regclass($1) AS relation", [`public.${name}`]);
          if (exists.rows[0]?.relation) {
            const populated = await client.query(`SELECT 1 FROM public.${quoteIdent(name)} LIMIT 1`);
            if (populated.rowCount) {
              throw new Error("This archive omits Blog publication history. Restore an archive containing blog_posts and all Blog publication tables, or complete an explicit publication reconciliation before restoring this historical archive.");
            }
          }
        }
      }
      if (validateReviewedDeadline) {
        validateReviewedDeadline();
        const currentTables = await queryAllTableNames(client);
        if (currentTables.length !== tableNames.length || currentTables.some((name) => !tableNames.includes(name)))
          throw new Error("Backup table inventory differs from the current database; operator reconciliation is required");
        validateReviewedDeadline();
      }
      if (tableNames.length > 0) {
        await client.query(
          `TRUNCATE TABLE ${tableNames.map((table) => `public.${quoteIdent(table)}`).join(", ")} RESTART IDENTITY${validateReviewedDeadline ? "" : " CASCADE"}`,
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

          // Archive IDs must survive GENERATED ALWAYS identity columns (and FK links).
          // PostgreSQL permits this clause for ordinary/BY DEFAULT columns too:
          // https://www.postgresql.org/docs/18/sql-insert.html
          await client.query(
            `INSERT INTO public.${quoteIdent(tableName)} (${columns.map(quoteIdent).join(", ")}) OVERRIDING SYSTEM VALUE VALUES ${placeholders.join(", ")}`,
            values,
          );
        }
      }

      // Older archives omitted identity sequences because they have no nextval default.
      // Discover owned sequences for restored tables so their next insert cannot reuse IDs.
      const restoredNames = new Set(snapshot.tables.map((table) => table.name));
      const discoveredSequences = (await querySequenceColumns(client)).filter((sequence) => restoredNames.has(sequence.tableName));
      // Reviewed archives cannot choose a sequence belonging to excluded data.
      // The current PostgreSQL ownership catalog is authoritative for this path.
      const sequences = new Map((validateReviewedDeadline ? [] : snapshot.sequences).map((sequence) => [sequence.sequenceName, sequence]));
      for (const sequence of discoveredSequences) sequences.set(sequence.sequenceName, sequence);
      for (const sequence of sequences.values()) {
        await client.query(
          `SELECT setval($1::regclass, COALESCE((SELECT MAX(${quoteIdent(sequence.columnName)})::bigint FROM public.${quoteIdent(sequence.tableName)}), 1), COALESCE((SELECT MAX(${quoteIdent(sequence.columnName)}) IS NOT NULL FROM public.${quoteIdent(sequence.tableName)}), false))`,
          [sequence.sequenceName],
        );
      }
      await beforeCommit?.();
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

async function loadReviewedBackup(key: string, operation: BackupStorageOperation): Promise<DatabaseBackupSnapshot> {
  const compressed = await downloadBackupObject(key, operation);
  if (!compressed || compressed.byteLength > 64 * 1024 * 1024)
    throw new Error("Backup archive unavailable or exceeds review limit");
  try {
    return validateBackupRestoreReview(JSON.parse(gunzipSync(compressed, { maxOutputLength: 256 * 1024 * 1024 }).toString("utf8")));
  } catch {
    throw new Error("Backup archive could not be validated for review");
  }
}

/** Read-only review; callers must project metadata, never archive rows. */
export async function getSystemBackupRestoreReview(key: string) {
  const operation = await beginBackupStorageOperation();
  if (!operation) throw new Error("Backup storage is not configured");
  const snapshot = await loadReviewedBackup(key, operation);
  assertBackupRestoreIdentity(snapshot.manifest, { targetStackId: process.env.CLIENT_STACK_ID });
  if (snapshot.manifest.key !== key) throw new Error("Backup archive key mismatch");
  return { manifest: snapshot.manifest, fingerprint: backupRestoreFingerprint(snapshot) };
}

/** Review metadata becomes executable only after Core durably reserves its identity. */
export async function reserveSystemBackupRestoreReview(key: string, operationIdentity: { operationId: string; actorId: string }) {
  const identity = restoreReceiptIdentity.pick({operationId:true,actorId:true}).parse(operationIdentity);
  const review = await getSystemBackupRestoreReview(key);
  return withBackupLock(async (client) => {
    const clock = await client.query("SELECT clock_timestamp() AS current_time");
    const expiresAt = new Date(new Date(clock.rows[0].current_time).getTime() + 5 * 60_000).toISOString();
    await reserveRestoreReceipt(client, {...identity,fingerprint:review.fingerprint,expiresAt});
    return {...review,operationId:identity.operationId,expiresAt};
  });
}

function backupRestoreFingerprint(snapshot: DatabaseBackupSnapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

/** Separate reviewed entry point; retained callers keep their existing contract. */
export async function restoreReviewedSystemBackup(key: string, expectedFingerprint: string, expiresAt: string, operationIdentity: { operationId: string; actorId: string }) {
  if (!/^[a-f0-9]{64}$/.test(expectedFingerprint)) throw new Error("Backup review is required");
  const deadline = Date.parse(expiresAt);
  const assertFresh = () => {
    if (!Number.isFinite(deadline) || deadline <= Date.now() || deadline > Date.now() + 5 * 60_000)
      throw new Error("Backup review expired or invalid; review again");
  };
  assertFresh();
  const operation = await beginBackupStorageOperation();
  if (!operation) throw new Error("Backup storage is not configured");
  return withBackupLock(async (client) => {
    assertFresh();
    const snapshot = await loadReviewedBackup(key, operation);
    assertBackupRestoreIdentity(snapshot.manifest, { targetStackId: process.env.CLIENT_STACK_ID });
    if (snapshot.manifest.key !== key || backupRestoreFingerprint(snapshot) !== expectedFingerprint)
      throw new Error("Backup changed after review; review it again before restoring");
    assertFresh();
    const receipt = { ...operationIdentity, fingerprint: expectedFingerprint, expiresAt };
    await admitRestoreReceipt(client, receipt);
    await restoreBackupSnapshotWithClient(client, snapshot, {}, assertFresh, () => completeRestoreReceipt(client, receipt));
    return snapshot.manifest;
  });
}

/** Never execute from reconciliation. Missing evidence remains explicitly unknown. */
export async function getReviewedRestoreOutcome(input: RestoreReceiptIdentity) {
  const receipt = restoreReceiptIdentity.parse(input);
  return withBackupLock(async (client) => {
    const state = await readRestoreReceipt(client, receipt);
    if (state === "completed") return "completed" as const;
    if (state === "not_applied") return "not_applied" as const;
    if ((state === "reserved" || state === "started") && await expireRestoreReceipt(client, receipt))
      return "not_applied" as const;
    return "unknown" as const;
  });
}

export async function restoreSystemBackupFromKey(key: string) {
  const operation = await beginBackupStorageOperation();
  if (!operation) throw new Error("Backup storage is not configured");
  return withBackupLock(async (client) => {
    const snapshot = await loadBackupSnapshotFromKey(key, operation);
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
