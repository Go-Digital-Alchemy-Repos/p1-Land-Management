import {
  outboxItem,
  validateOutboxCursor,
  OUTBOX_PAGE_SIZE,
  type OutboxCursor,
  type OutboxPage,
  type OutboxState,
} from "../core/outbox";
import { applyChecklist } from "../core/checklist";
import { obtainDatabaseKey } from "../core/key-policy";
import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import type { UploadFieldPhotoXP1Classification } from "../../../../lib/api-client-react/src/dashboard/models/uploadFieldPhotoXP1Classification";
import type { WorkOrder } from "../../../../lib/api-client-react/src/dashboard/models/workOrder";
import {
  fieldEventSchema,
  type FieldOperation,
} from "@workspace/api-zod/dashboard";
import {
  CURRENT_VAULT_SCHEMA_VERSION,
  vaultMigrationPlan,
} from "../core/vault-migrations";
import {
  photoStagingCapacityError,
  protectedStorageStatus,
} from "../core/storage-capacity";
const secure = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
export type QueuedPhoto = {
  id: string;
  workOrderId: string;
  propertyId: string;
  mime: "image/jpeg";
  classification: UploadFieldPhotoXP1Classification;
  capturedAt: string;
};
export type PhotoRecovery = Readonly<{
  recovered: number;
  cleaned: number;
  missing: number;
  missingIds: readonly string[];
}>;
function validatePhotoManifest(value: unknown): QueuedPhoto {
  if (!value || typeof value !== "object")
    throw new Error("Saved photo metadata is invalid.");
  const manifest = value as Partial<QueuedPhoto>;
  if (
    typeof manifest.id !== "string" ||
    typeof manifest.workOrderId !== "string" ||
    typeof manifest.propertyId !== "string" ||
    manifest.mime !== "image/jpeg" ||
    typeof manifest.classification !== "string" ||
    typeof manifest.capturedAt !== "string" ||
    !Number.isFinite(Date.parse(manifest.capturedAt))
  )
    throw new Error("Saved photo metadata is invalid.");
  return manifest as QueuedPhoto;
}
const opening = new Map<string, Promise<unknown>>();
export async function openVault(
  origin: string,
  accountId: string,
  requireExisting = false,
) {
  const scope = JSON.stringify([origin, accountId]);
  const previous = opening.get(scope) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(() => createVault(origin, accountId, requireExisting));
  opening.set(scope, next);
  try {
    return await next;
  } finally {
    if (opening.get(scope) === next) opening.delete(scope);
  }
}
async function createVault(
  origin: string,
  accountId: string,
  requireExisting: boolean,
) {
  const scope = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify([origin, accountId]),
  );
  const folder = new Directory(Paths.document, "p1-private");
  // iOS native launch installs backup exclusion before JavaScript; Android disables backup.
  folder.create({ intermediates: true, idempotent: true });
  const name = `${scope}.db`,
    path = new File(folder, name),
    keyName = `p1.db.${scope}`;
  if (requireExisting && !path.exists)
    throw new Error(
      "Downloaded protected workspace is missing. Reconnect to recover work.",
    );
  const key = await obtainDatabaseKey({
    databaseExists: path.exists,
    readKey: () => SecureStore.getItemAsync(keyName, secure),
    generateKey: async () =>
      Array.from(await Crypto.getRandomBytesAsync(32), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join(""),
    persistKey: (key) => SecureStore.setItemAsync(keyName, key, secure),
  });
  const db = await SQLite.openDatabaseAsync(
    name,
    { useNewConnection: true },
    folder.uri,
  );
  let closed = false;
  async function closeDatabase() {
    if (!closed) {
      await db.closeAsync();
      closed = true;
    }
  }
  async function transaction(
    task: (tx: SQLite.SQLiteDatabase) => Promise<void>,
  ) {
    // Expo's exclusive helper creates an unkeyed connection; key each connection before BEGIN.
    const tx = await SQLite.openDatabaseAsync(
      name,
      { useNewConnection: true },
      folder.uri,
    );
    let begun = false;
    try {
      await tx.execAsync(
        `PRAGMA key = "x'${key}'"; PRAGMA foreign_keys=ON; BEGIN IMMEDIATE;`,
      );
      begun = true;
      await task(tx);
      await tx.execAsync("COMMIT");
      begun = false;
    } catch (error) {
      if (begun) await tx.execAsync("ROLLBACK");
      throw error;
    } finally {
      await tx.closeAsync();
    }
  }
  try {
    await db.execAsync(
      `PRAGMA key = "x'${key}'"; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;`,
    );
    const cipher = await db.getFirstAsync<{ cipher_version: string }>(
      "PRAGMA cipher_version",
    );
    if (!cipher?.cipher_version)
      throw new Error(
        "Encrypted database support is unavailable. Use the P1 native development build.",
      );
    await transaction(async (tx) => {
      await tx.execAsync(
        "CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL)",
      );
      const version = await tx.getFirstAsync<{ value: string }>(
        "SELECT value FROM metadata WHERE key='version'",
      );
      const current = version ? Number(version.value) : 0;
      for (const migration of vaultMigrationPlan(current)) {
        for (const statement of migration.statements)
          await tx.execAsync(statement);
        await tx.runAsync(
          "INSERT OR REPLACE INTO metadata(key,value) VALUES('version',?)",
          String(migration.to),
        );
      }
      const finalVersion = await tx.getFirstAsync<{ value: string }>(
        "SELECT value FROM metadata WHERE key='version'",
      );
      if (finalVersion?.value !== String(CURRENT_VAULT_SCHEMA_VERSION))
        throw new Error("Protected storage upgrade is required.");
    });
    if (
      requireExisting &&
      !(await db.getFirstAsync("SELECT value FROM metadata WHERE key='day'"))
    )
      throw new Error("No downloaded assignment snapshot is available.");
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
  return {
    scope,
    origin,
    accountId,
    async download(work: WorkOrder[]) {
      await transaction(async (tx) => {
        const pending = await tx.getAllAsync<{ payload: string }>(
          "SELECT payload FROM operations ORDER BY seq",
        );
        const photos = await tx.getAllAsync<{ manifest: string }>(
          "SELECT manifest FROM photos",
        );
        if (
          pending.some((row) => {
            const event = JSON.parse(row.payload);
            return !work.some(
              (w) =>
                w.id === event.workOrderId && w.version === event.baseVersion,
            );
          }) ||
          photos.some(
            (row) =>
              !work.some((w) => w.id === JSON.parse(row.manifest).workOrderId),
          )
        )
          throw new Error(
            "Pending work prevents replacing changed assignments.",
          );
        await tx.runAsync(
          "INSERT OR REPLACE INTO metadata(key,value) VALUES('day',?)",
          JSON.stringify(
            pending.reduce(
              (snapshot, row) =>
                applyChecklist(snapshot, JSON.parse(row.payload)),
              work,
            ),
          ),
        );
      });
    },
    async downloaded(): Promise<WorkOrder[]> {
      const row = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM metadata WHERE key='day'",
      );
      return row ? JSON.parse(row.value) : [];
    },
    async outbox(cursor: OutboxCursor | null = null): Promise<OutboxPage> {
      validateOutboxCursor(cursor);
      const totals = await db.getFirstAsync<{
        total: number;
        pending: number;
        conflicts: number;
      }>(
        `SELECT count(*) total, coalesce(sum(state='pending'),0) pending, coalesce(sum(state='conflict'),0) conflicts
         FROM (SELECT state FROM operations UNION ALL SELECT state FROM photos)`,
      );
      const rows = await db.getAllAsync<{
        kind: "operation" | "photo";
        id: string;
        encoded: string;
        state: OutboxState;
        capturedAt: string;
      }>(
        `WITH captures AS (
          SELECT 'operation' kind,id,payload encoded,state,json_extract(payload,'$.capturedAt') capturedAt FROM operations
          UNION ALL
          SELECT 'photo' kind,id,manifest encoded,state,json_extract(manifest,'$.capturedAt') capturedAt FROM photos
        ) SELECT kind,id,encoded,state,capturedAt FROM captures
          ${cursor ? "WHERE (capturedAt,id,kind) > (?,?,?)" : ""}
          ORDER BY capturedAt,id,kind LIMIT ?`,
        ...(cursor
          ? [cursor.capturedAt, cursor.id, cursor.kind, OUTBOX_PAGE_SIZE + 1]
          : [OUTBOX_PAGE_SIZE + 1]),
      );
      const visible = rows.slice(0, OUTBOX_PAGE_SIZE);
      const items = visible.map((row) => {
        const decoded = JSON.parse(row.encoded);
        if (decoded.id !== row.id)
          throw new Error(
            "Saved capture identity is inconsistent. Contact the office before syncing.",
          );
        if (row.kind === "operation")
          return outboxItem({
            kind: "operation",
            state: row.state,
            operation: fieldEventSchema.parse(decoded),
          });
        if (
          typeof decoded.workOrderId !== "string" ||
          typeof decoded.capturedAt !== "string" ||
          typeof decoded.classification !== "string"
        )
          throw new Error(
            "Saved photo metadata is invalid. Contact the office.",
          );
        return outboxItem({ kind: "photo", state: row.state, photo: decoded });
      });
      const last = visible.at(-1);
      return {
        ...totals!,
        items,
        nextCursor:
          rows.length > OUTBOX_PAGE_SIZE && last
            ? { capturedAt: last.capturedAt, id: last.id, kind: last.kind }
            : null,
      };
    },
    async pendingCount() {
      return (await db.getFirstAsync<{ n: number }>(
        "SELECT (SELECT count(*) FROM operations)+(SELECT count(*) FROM photos) n",
      ))!.n;
    },
    async storageStatus() {
      const queued = await db.getFirstAsync<{ count: number; bytes: number }>(
        "SELECT count(*) count, coalesce(sum(length(bytes)),0) bytes FROM photos",
      );
      return protectedStorageStatus({
        queuedPhotoCount: queued?.count || 0,
        queuedPhotoBytes: queued?.bytes || 0,
        availableBytes: Paths.availableDiskSpace,
        totalBytes: Paths.totalDiskSpace,
      });
    },
    async requirePhotoStorage(photoBytes: number) {
      const error = photoStagingCapacityError(
        await this.storageStatus(),
        photoBytes,
      );
      if (error) throw new Error(error);
    },
    async enqueue(operation: FieldOperation) {
      const payload = JSON.stringify(fieldEventSchema.parse(operation));
      await transaction(async (tx) => {
        const old = await tx.getFirstAsync<{ payload: string }>(
          "SELECT payload FROM operations WHERE id=?",
          operation.id,
        );
        if (old && old.payload !== payload)
          throw new Error("Operation ID already contains different work.");
        await tx.runAsync(
          "INSERT OR IGNORE INTO operations(id,payload) VALUES(?,?)",
          operation.id,
          payload,
        );
        // Event and optimistic snapshot commit together; failed writes roll back both.
        if (!old && operation.kind === "checklist") {
          const row = await tx.getFirstAsync<{ value: string }>(
            "SELECT value FROM metadata WHERE key='day'",
          );
          if (row)
            await tx.runAsync(
              "UPDATE metadata SET value=? WHERE key='day'",
              JSON.stringify(applyChecklist(JSON.parse(row.value), operation)),
            );
        }
      });
    },
    async pending() {
      return (
        await db.getAllAsync<{ payload: string }>(
          "SELECT payload FROM operations WHERE state='pending' ORDER BY seq",
        )
      ).map((row) => fieldEventSchema.parse(JSON.parse(row.payload)));
    },
    async recordResults(results: { id: string; status: string }[]) {
      await transaction(async (tx) => {
        for (const result of results) {
          if (result.status === "accepted")
            await tx.runAsync("DELETE FROM operations WHERE id=?", result.id);
          else if (result.status === "conflict")
            await tx.runAsync(
              "UPDATE operations SET state='conflict' WHERE id=?",
              result.id,
            );
        }
      });
    },
    async rememberTemporaryPhoto(manifest: QueuedPhoto, temporaryUri: string) {
      if (!temporaryUri.startsWith("file:"))
        throw new Error("Photo staging requires a private file.");
      const serialized = JSON.stringify(validatePhotoManifest(manifest));
      await transaction(async (tx) => {
        const existing = await tx.getFirstAsync<{
          manifest: string;
          temporary_uri: string;
        }>(
          "SELECT manifest,temporary_uri FROM photo_staging WHERE id=?",
          manifest.id,
        );
        if (
          existing &&
          (existing.manifest !== serialized ||
            existing.temporary_uri !== temporaryUri)
        )
          throw new Error("Photo ID already contains different work.");
        await tx.runAsync(
          "INSERT OR IGNORE INTO photo_staging(id,manifest,temporary_uri) VALUES(?,?,?)",
          manifest.id,
          serialized,
          temporaryUri,
        );
      });
    },
    async stageRememberedPhoto(id: string) {
      const staged = await db.getFirstAsync<{
        id: string;
        manifest: string;
        temporary_uri: string;
        state: "pending" | "committed" | "missing";
      }>(
        "SELECT id,manifest,temporary_uri,state FROM photo_staging WHERE id=?",
        id,
      );
      if (!staged) throw new Error("Saved temporary photo was not found.");
      const manifest = validatePhotoManifest(JSON.parse(staged.manifest));
      const temporary = new File(staged.temporary_uri);
      const persisted = await db.getFirstAsync<{ manifest: string }>(
        "SELECT manifest FROM photos WHERE id=?",
        id,
      );
      if (persisted && persisted.manifest !== staged.manifest)
        throw new Error("Photo ID already contains different work.");
      if (!temporary.exists) {
        if (persisted) {
          await transaction(async (tx) => {
            await tx.runAsync("DELETE FROM photo_staging WHERE id=?", id);
          });
          return "cleaned" as const;
        }
        await transaction(async (tx) => {
          await tx.runAsync(
            "UPDATE photo_staging SET state='missing' WHERE id=?",
            id,
          );
        });
        throw new Error(
          "Temporary photo is unavailable. Its interrupted capture is retained for office support.",
        );
      }
      if (!persisted) {
        const bytes = await temporary.bytes();
        if (!bytes.length || bytes.length > 15 * 1024 * 1024)
          throw new Error("Photo exceeds the upload limit.");
        await transaction(async (tx) => {
          const current = await tx.getFirstAsync<{
            manifest: string;
          }>("SELECT manifest FROM photo_staging WHERE id=?", id);
          if (!current || current.manifest !== staged.manifest)
            throw new Error("Temporary photo changed before secure staging.");
          await tx.runAsync(
            "INSERT INTO photos(id,manifest,bytes) VALUES(?,?,?)",
            id,
            staged.manifest,
            bytes,
          );
          await tx.runAsync(
            "UPDATE photo_staging SET state='committed' WHERE id=?",
            id,
          );
        });
      }
      // The encrypted BLOB is authoritative. If this removal is interrupted,
      // the committed journal row is cleaned on the next account-bound launch.
      temporary.delete();
      await transaction(async (tx) => {
        await tx.runAsync("DELETE FROM photo_staging WHERE id=?", id);
      });
      return "staged" as const;
    },
    async recoverTemporaryPhotos(): Promise<PhotoRecovery> {
      const staged = await db.getAllAsync<{ id: string; state: string }>(
        "SELECT id,state FROM photo_staging ORDER BY id",
      );
      const result: {
        recovered: number;
        cleaned: number;
        missing: number;
        missingIds: string[];
      } = { recovered: 0, cleaned: 0, missing: 0, missingIds: [] };
      for (const row of staged) {
        try {
          const outcome = await this.stageRememberedPhoto(row.id);
          if (row.state === "pending" && outcome === "staged")
            result.recovered++;
          else result.cleaned++;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.startsWith("Temporary photo is unavailable")
          ) {
            result.missing++;
            result.missingIds.push(row.id);
            continue;
          }
          throw error;
        }
      }
      return result;
    },
    async stagePhoto(
      manifest: QueuedPhoto,
      temporaryUri: string,
    ): Promise<void> {
      await this.rememberTemporaryPhoto(manifest, temporaryUri);
      await this.stageRememberedPhoto(manifest.id);
    },
    async pendingPhotoIds(): Promise<string[]> {
      const rows = await db.getAllAsync<{ id: string }>(
        "SELECT id FROM photos WHERE state='pending' ORDER BY seq",
      );
      return rows.map((row) => row.id);
    },
    async loadPendingPhoto(id: string) {
      return db.getFirstAsync<{
        id: string;
        manifest: string;
        bytes: Uint8Array;
      }>(
        "SELECT id,manifest,bytes FROM photos WHERE id=? AND state='pending' LIMIT 1",
        id,
      );
    },
    async acknowledgePhoto(id: string) {
      await db.runAsync("DELETE FROM photos WHERE id=?", id);
    },
    close: closeDatabase,
    async destroy() {
      const inspection = closed
        ? await SQLite.openDatabaseAsync(
            name,
            { useNewConnection: true },
            folder.uri,
          )
        : db;
      let count: { n: number } | null;
      try {
        if (closed) await inspection.execAsync(`PRAGMA key = "x'${key}'";`);
        count = await inspection.getFirstAsync<{ n: number }>(
          "SELECT (SELECT count(*) FROM operations)+(SELECT count(*) FROM photos) n",
        );
      } finally {
        if (inspection !== db) await inspection.closeAsync();
      }
      if (count!.n)
        throw new Error(
          "Pending work must be resolved before deleting protected storage.",
        );
      await closeDatabase();
      await SQLite.deleteDatabaseAsync(name, folder.uri);
      await SecureStore.deleteItemAsync(keyName, secure);
    },
  };
}
export type Vault = Awaited<ReturnType<typeof openVault>>;
