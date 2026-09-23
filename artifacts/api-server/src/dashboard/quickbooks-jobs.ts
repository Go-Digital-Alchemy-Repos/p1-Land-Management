import type { Pool, PoolClient } from "pg";
import { features } from "./features";

/** Existing rows remain for audit, but dormant reconciliation never contacts Intuit. */
export async function cancelDormantQuickBooksJob(c: Pool | PoolClient, id: string) {
  if (features.quickbooks) return false;
  const changed = await c.query(
    "UPDATE outbox SET status='cancelled',last_error='feature_disabled',locked_at=NULL WHERE id=$1 AND kind='quickbooks.reconcile' AND status IN ('pending','processing') RETURNING id",
    [id],
  );
  return Boolean(changed.rowCount);
}

export async function cancelDormantQuickBooksJobs(c: Pool | PoolClient) {
  if (features.quickbooks) return 0;
  const changed = await c.query(
    "UPDATE outbox SET status='cancelled',last_error='feature_disabled',locked_at=NULL WHERE kind='quickbooks.reconcile' AND status IN ('pending','processing','failed') RETURNING id",
  );
  return changed.rowCount || 0;
}

export async function enqueueQuickBooksReconciliation(c: Pool | PoolClient) {
  if (!features.quickbooks) return false;
  const result = await c.query(
    "INSERT INTO outbox(id,kind,payload) SELECT gen_random_uuid(),'quickbooks.reconcile','{}'::jsonb WHERE EXISTS(SELECT 1 FROM integration_connection WHERE provider='quickbooks') AND NOT EXISTS(SELECT 1 FROM outbox WHERE kind='quickbooks.reconcile' AND status IN ('pending','processing')) RETURNING id",
  );
  return Boolean(result.rowCount);
}
