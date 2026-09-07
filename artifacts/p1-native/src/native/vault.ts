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
    if (
      requireExisting &&
      !(await db.getFirstAsync("SELECT value FROM metadata WHERE key='day'"))
    )
      throw new Error("No downloaded assignment snapshot is available.");
    await transaction(async (tx) => {
      await tx.execAsync(`CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS operations(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,payload TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending');
        CREATE TABLE IF NOT EXISTS photos(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,manifest TEXT NOT NULL,bytes BLOB NOT NULL,state TEXT NOT NULL DEFAULT 'pending');
        INSERT OR IGNORE INTO metadata VALUES('version','1');`);
      const version = await tx.getFirstAsync<{ value: string }>(
        "SELECT value FROM metadata WHERE key='version'",
      );
      if (version?.value !== "1")
        throw new Error("Protected storage upgrade is required.");
    });
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
    async pendingCount() {
      return (await db.getFirstAsync<{ n: number }>(
        "SELECT (SELECT count(*) FROM operations)+(SELECT count(*) FROM photos) n",
      ))!.n;
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
    async stagePhoto(manifest: QueuedPhoto, temporaryUri: string) {
      const temporary = new File(temporaryUri),
        bytes = await temporary.bytes();
      if (!bytes.length || bytes.length > 15 * 1024 * 1024)
        throw new Error("Photo exceeds the upload limit.");
      await transaction(async (tx) => {
        const old = await tx.getFirstAsync(
          "SELECT id FROM photos WHERE id=?",
          manifest.id,
        );
        if (old) throw new Error("This photo is already staged.");
        await tx.runAsync(
          "INSERT INTO photos(id,manifest,bytes) VALUES(?,?,?)",
          manifest.id,
          JSON.stringify(manifest),
          bytes,
        );
      });
      // Committed ciphertext is authoritative before temporary cleartext is removed.
      temporary.delete();
    },
    async photos() {
      return db.getAllAsync<{
        id: string;
        manifest: string;
        bytes: Uint8Array;
      }>(
        "SELECT id,manifest,bytes FROM photos WHERE state='pending' ORDER BY seq",
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
