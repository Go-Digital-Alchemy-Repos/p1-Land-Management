import type { FieldOperation } from "@workspace/api-zod/dashboard";
export interface OperationStore {
  pending(): Promise<FieldOperation[]>;
  recordResults(results: { id: string; status: string }[]): Promise<void>;
}
/** A lost/partial/invalid response leaves original IDs queued for replay. */
export async function syncOperations(
  store: OperationStore,
  send: (operations: FieldOperation[]) => Promise<unknown>,
) {
  // Snapshot once: newly captured work belongs to the next explicit sync.
  const pending = await store.pending();
  for (let offset = 0; offset < pending.length; offset += 100) {
    const batch = pending.slice(offset, offset + 100);
    const response = await send(batch);
    const results = (response as { results?: unknown })?.results;
    if (!Array.isArray(results))
      throw new Error("Sync acknowledgment is invalid. Work remains saved.");
    const ids = new Set(batch.map((item) => item.id)),
      seen = new Set<string>();
    for (const row of results) {
      if (
        !row ||
        typeof row.id !== "string" ||
        !ids.has(row.id) ||
        seen.has(row.id) ||
        !["accepted", "conflict"].includes(row.status)
      )
        throw new Error("Sync acknowledgment does not match saved work.");
      seen.add(row.id);
    }
    await store.recordResults(results);
    if (seen.size !== batch.length)
      throw new Error("Sync acknowledgment is incomplete. Unconfirmed work remains saved; retry when connected.");
  }
}
