import { getFieldResolutionReceipts } from "@workspace/api-client-react/dashboard";
import * as offline from "./offline";

/** Clear only office-reviewed receipts belonging to this exact submitted batch.
 * Run before uploads: an unrelated denied photo must not trap reviewed entries.
 */
export async function reconcileFieldResolutions(userId: string) {
  const queued = await offline.pending(userId);
  let resolved = 0;
  for (let offset = 0; offset < queued.length; offset += 100) {
    const batch = queued.slice(offset, offset + 100);
    const submitted = new Set(batch.map((event) => event.id));
    const receipts = await getFieldResolutionReceipts({ events: batch });
    for (const receipt of receipts.results) {
      if (receipt.status === "resolved" && submitted.delete(receipt.id)) {
        await offline.acknowledge(userId, receipt.id);
        resolved++;
      }
    }
  }
  return resolved;
}
