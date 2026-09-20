import { randomUUID } from "node:crypto";
import { z } from "zod";
import { transaction } from "./database";
import { HttpError } from "./policy";
import type { PoolClient } from "pg";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const reviewSchema = z.object({
  sourceBinding: hash,
  key: z.string().min(1).max(2048), fingerprint: hash,
  summary: z.object({
    createdAt: z.string().datetime(), clientStackId: z.string().min(1).max(255),
    tableCount: z.number().int().positive(), totalRowCount: z.number().int().nonnegative(),
    mediaAssetCount: z.number().int().nonnegative(),
  }).strict(),
}).strict();
async function owner(c: PoolClient, actorId: string) {
  const row = await c.query("SELECT 1 FROM staff_profile WHERE user_id=$1 AND active=true AND role='owner' FOR SHARE",[actorId]);
  if (!row.rowCount) throw new HttpError(403,"Active Owner access required");
}
async function audit(c: PoolClient, actorId: string, id: string, action: string) {
  await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,'{}')",[randomUUID(),actorId,action,id]);
}
/** Input is a server-validated Core review, never a browser-supplied archive. */
export async function recordWebsiteRestoreReview(actorId: string, input: unknown) {
  const b=reviewSchema.parse(input), id=randomUUID();
  return transaction(async c=>{
    await owner(c,actorId);
    const row=(await c.query(`INSERT INTO website_restore_operation(id,actor_id,source_binding,archive_key,archive_fingerprint,summary,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,now()+interval '5 minutes') RETURNING *`,[id,actorId,b.sourceBinding,b.key,b.fingerprint,b.summary])).rows[0];
    await audit(c,actorId,id,"website.restore_reviewed");
    return row;
  });
}
/** Commit this claim before calling Core. A repeated request never invokes restore again. */
export async function claimWebsiteRestore(actorId: string, id: string, sourceBinding: string) {
  z.string().uuid().parse(id); hash.parse(sourceBinding);
  return transaction(async c=>{
    await owner(c,actorId);
    // Serialize claims to this backend, including different review IDs.
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",["website-restore:"+sourceBinding]);
    const row=(await c.query("SELECT *,expires_at > now() AS fresh FROM website_restore_operation WHERE id=$1 FOR UPDATE",[id])).rows[0];
    if (!row || row.actor_id!==actorId) throw new HttpError(404,"Restore review not found");
    if (row.source_binding!==sourceBinding) throw new HttpError(409,"Website connection changed; review again");
    if (row.status!=="reviewed") return {execute:false,operation:row};
    if (!row.fresh) throw new HttpError(409,"Restore review expired; review again");
    if ((await c.query("SELECT 1 FROM website_restore_operation WHERE source_binding=$1 AND status IN ('running','uncertain')",[sourceBinding])).rowCount)
      throw new HttpError(409,"An earlier restore requires outcome verification");
    const next=(await c.query("UPDATE website_restore_operation SET status='running',updated_at=now() WHERE id=$1 RETURNING *",[id])).rows[0];
    await audit(c,actorId,id,"website.restore_requested");
    return {execute:true,operation:next};
  });
}
/** Only definitive success completes; errors/timeouts remain uncertain and cannot replay. */
export async function recordWebsiteRestoreOutcome(actorId: string, id: string, status: "completed"|"uncertain") {
  z.string().uuid().parse(id); z.enum(["completed","uncertain"]).parse(status);
  return transaction(async c=>{
    const row=(await c.query("SELECT * FROM website_restore_operation WHERE id=$1 AND actor_id=$2 FOR UPDATE",[id,actorId])).rows[0];
    if (!row) throw new HttpError(404,"Restore operation not found");
    if (row.status===status) return row;
    if (row.status!=="running") throw new HttpError(409,"Restore outcome requires reconciliation");
    // Preserve the outcome of an already-authorized operation even if access changed in flight.
    const next=(await c.query("UPDATE website_restore_operation SET status=$2,updated_at=now() WHERE id=$1 RETURNING *",[id,status])).rows[0];
    await audit(c,actorId,id,"website.restore_"+status);
    return next;
  });
}
