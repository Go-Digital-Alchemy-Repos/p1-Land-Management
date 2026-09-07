import type { FieldOperation } from "@workspace/api-zod/dashboard";
export type { FieldOperation } from "@workspace/api-zod/dashboard";
function open(userId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("p1-field-" + userId, 2);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains("snapshot"))
        r.result.createObjectStore("snapshot");
      if (!r.result.objectStoreNames.contains("operations"))
        r.result.createObjectStore("operations", { keyPath: "id" });
      if (!r.result.objectStoreNames.contains("photos"))
        r.result.createObjectStore("photos", { keyPath: "id" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function operation<T>(
  userId: string,
  store: string,
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await open(userId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const r = action(tx.objectStore(store));
    tx.oncomplete = () => {
      db.close();
      resolve(r.result as T);
    };
    tx.onerror = () => {
      db.close();
      reject(
        tx.error?.name === "QuotaExceededError"
          ? new Error(
              "Device storage is full. This item was not saved. Free space and retry.",
            )
          : tx.error,
      );
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("Device storage could not save this item"));
    };
  });
}
export async function storageStatus() {
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  const persistent = await navigator.storage?.persisted?.().catch(() => false);
  return {
    persistent: Boolean(persistent),
    availableBytes:
      estimate?.quota === undefined
        ? null
        : Math.max(0, estimate.quota - (estimate.usage || 0)),
  };
}
async function reserveSpace(bytes: number) {
  const { availableBytes } = await storageStatus();
  if (availableBytes !== null && availableBytes < bytes + 2 * 1024 * 1024)
    throw new Error(
      "Device storage is nearly full. Free space and retry; existing unsynchronized work is retained.",
    );
}
export async function saveDay(
  userId: string,
  data: { id: string; version: number }[],
) {
  const queued = await pending(userId);
  if (
    queued.some(
      (event) =>
        !data.some(
          (work) =>
            work.id === event.workOrderId && work.version === event.baseVersion,
        ),
    )
  )
    throw new Error(
      "Synchronize or resolve pending work before replacing changed downloaded assignments.",
    );
  const queuedPhotos = await pendingPhotos(userId);
  if (
    queuedPhotos.some(
      (photo) => !data.some((work) => work.id === photo.workOrderId),
    )
  )
    throw new Error(
      "Synchronize pending photos before replacing their downloaded assignments.",
    );
  await reserveSpace(new Blob([JSON.stringify(data)]).size);
  await navigator.storage?.persist?.().catch(() => false);
  await operation(userId, "snapshot", "readwrite", (s) =>
    s.put({ data, savedAt: new Date().toISOString() }, "day"),
  );
}
export function readDay(userId: string) {
  return operation<{ data: any[]; savedAt: string } | undefined>(
    userId,
    "snapshot",
    "readonly",
    (s) => s.get("day"),
  );
}
export async function enqueue(userId: string, event: FieldOperation) {
  await reserveSpace(new Blob([JSON.stringify(event)]).size);
  await operation(userId, "operations", "readwrite", (s) => s.add(event));
}
export async function pending(userId: string) {
  const rows = await operation<FieldOperation[]>(
    userId,
    "operations",
    "readonly",
    (s) => s.getAll(),
  );
  return rows.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}
export async function acknowledge(userId: string, id: string) {
  await operation(userId, "operations", "readwrite", (s) => s.delete(id));
}
export async function clearAccount(userId: string) {
  const db = await open(userId);
  db.close();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("p1-field-" + userId);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(new Error("Close other P1 tabs before signing out"));
  });
}

export type PhotoOperation = {
  id: string;
  workOrderId: string;
  propertyId: string;
  classification: string;
  blob: Blob;
};
export async function savePhoto(userId: string, photo: PhotoOperation) {
  await reserveSpace(photo.blob.size);
  await operation(userId, "photos", "readwrite", (s) => s.add(photo));
}
export function pendingPhotos(userId: string) {
  return operation<PhotoOperation[]>(userId, "photos", "readonly", (s) =>
    s.getAll(),
  );
}
export async function acknowledgePhoto(userId: string, id: string) {
  await operation(userId, "photos", "readwrite", (s) => s.delete(id));
}
