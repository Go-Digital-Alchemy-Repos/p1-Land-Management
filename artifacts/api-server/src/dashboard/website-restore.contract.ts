import { createHash } from "node:crypto";
import { z } from "zod";
export const RESTORE_CONFIRMATION = "RESTORE WEBSITE DATABASE";
export const restoreExecutionRequest = z.object({confirmation:z.literal(RESTORE_CONFIRMATION)}).strict();
export const restoreReviewRequest = z.object({key:z.string().trim().min(1).max(2048)}).strict();
export const restoreSummary = z.object({
  createdAt:z.string().datetime(), clientStackId:z.string().min(1).max(255),
  tableCount:z.number().int().positive(), totalRowCount:z.number().int().nonnegative(),
  mediaAssetCount:z.number().int().nonnegative(),
});
export const coreRestoreReview = z.object({
  manifest:restoreSummary.extend({key:z.string().min(1).max(2048)}),
  fingerprint:z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
/** Connection comes from validated server configuration, never request input. */
export function restoreSourceBinding(origin:string,stackId:string){
  return createHash("sha256").update(JSON.stringify([new URL(origin).origin,stackId])).digest("hex");
}
/** Explicit public projection: archive keys/fingerprints/source bindings stay server-side. */
export function restoreOperationView(row:Record<string,unknown>){
  return {
    id:z.string().uuid().parse(row.id),
    status:z.enum(["reviewed","running","completed","uncertain"]).parse(row.status),
    summary:restoreSummary.parse(row.summary),
    expiresAt:z.coerce.date().parse(row.expires_at).toISOString(),
    createdAt:z.coerce.date().parse(row.created_at).toISOString(),
    updatedAt:z.coerce.date().parse(row.updated_at).toISOString(),
  };
}
