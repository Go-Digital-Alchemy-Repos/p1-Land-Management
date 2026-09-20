import { z } from "zod";
import type { PoolClient } from "pg";
const receiptIdentity=z.object({
  operationId:z.string().uuid(),actorId:z.string().min(1).max(255),
  fingerprint:z.string().regex(/^[a-f0-9]{64}$/),expiresAt:z.string().datetime(),
}).strict();
export type RestoreReceiptIdentity=z.infer<typeof receiptIdentity>;
/** Caller holds the backup advisory lock. Commit admission before any restore transaction. */
export async function admitRestoreReceipt(client:PoolClient,input:RestoreReceiptIdentity){
  const b=receiptIdentity.parse(input);
  const inserted=await client.query(`INSERT INTO p1_operations.restore_receipts(operation_id,actor_id,fingerprint,expires_at)
    VALUES($1,$2,$3,$4) ON CONFLICT(operation_id) DO NOTHING RETURNING operation_id`,[b.operationId,b.actorId,b.fingerprint,b.expiresAt]);
  if(inserted.rows.length) return;
  // Never replay even when the earlier attempt rolled back or its response was lost.
  throw new Error("Restore operation was already admitted; verify its outcome");
}
/** Must run in the SAME transaction as restored rows, before COMMIT. */
export async function completeRestoreReceipt(client:PoolClient,input:RestoreReceiptIdentity){
  const b=receiptIdentity.parse(input);
  const result=await client.query(`UPDATE p1_operations.restore_receipts SET status='completed',completed_at=now()
    WHERE operation_id=$1 AND actor_id=$2 AND fingerprint=$3 AND expires_at=$4 AND status='started' RETURNING operation_id`,[b.operationId,b.actorId,b.fingerprint,b.expiresAt]);
  if(result.rows.length!==1) throw new Error("Restore receipt could not be completed");
}
/** A started receipt is NOT proof of failure: callers must also verify lock/deadline state. */
export async function readRestoreReceipt(client:PoolClient,input:RestoreReceiptIdentity){
  const b=receiptIdentity.parse(input);
  const result=await client.query(`SELECT status FROM p1_operations.restore_receipts
    WHERE operation_id=$1 AND actor_id=$2 AND fingerprint=$3 AND expires_at=$4`,[b.operationId,b.actorId,b.fingerprint,b.expiresAt]);
  if(!result.rows.length) return null;
  return z.enum(["started","completed"]).parse(result.rows[0].status);
}
