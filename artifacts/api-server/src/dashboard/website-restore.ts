import { randomUUID } from "node:crypto";
import { Router, type Request } from "express";
import { z } from "zod";
import { actor, identity } from "./access";
import { pool } from "./database";
import { HttpError } from "./policy";
import { marketingConnection } from "./marketing-reporting.transport";
import { callCms, restoreReviewOperation, restoreExecuteOperation, restoreOutcomeOperation, type CmsOperation } from "./marketing-cms.transport";
import { coreRestoreReview, restoreReviewRequest, restoreSourceBinding, restoreOperationView, verifiedRestoreOutcome, restoreExecutionRequest } from "./website-restore.contract";
import { recordWebsiteRestoreReview, readWebsiteRestoreOperation, claimWebsiteRestore, recordWebsiteRestoreOutcome, reconcileWebsiteRestore } from "./website-restore.service";
export const websiteRestoreApi = Router();
const root = "/marketing/cms/website-system/backups/restore-operations";
async function callRestoreCore(req:Request,actorId:string,connection:ReturnType<typeof marketingConnection>,operation:CmsOperation,body:unknown){
  const session=await identity(req);
  if(session.user.id!==actorId) throw new HttpError(401,"Sign in again");
  const grantId=randomUUID();
  try {
    await pool.query("INSERT INTO core_federation_grant(id,canonical_user_id,canonical_session_id,owner_attested,expires_at) VALUES($1,$2,$3,true,now()+interval '60 seconds')",[grantId,actorId,session.session.id]);
    return await callCms(connection,operation,{}, {},body,grantId);
  } finally { await pool.query("DELETE FROM core_federation_grant WHERE id=$1",[grantId]); }
}
function receiptBody(row:Record<string,any>){
  return {operationId:row.id,fingerprint:row.archive_fingerprint,expiresAt:new Date(row.expires_at).toISOString()};
}
websiteRestoreApi.post(root, async (req,res) => {
  res.set("Cache-Control","private, no-store");
  const a = await actor(req);
  if(a.role !== "owner") throw new HttpError(403,"Owner access required");
  z.object({}).strict().parse(req.query);
  const input = restoreReviewRequest.parse(req.body);
  const connection = marketingConnection();
  const result = await callRestoreCore(req,a.id,connection,restoreReviewOperation,input);
  const parsed = result.status === 200 ? coreRestoreReview.safeParse(result.body) : null;
  if(!parsed?.success || parsed.data.manifest.key !== input.key)
    throw new HttpError(503,"Archive review unavailable; no restore was started");
  const {manifest,fingerprint} = parsed.data;
  const {key,...summary} = manifest;
  const row = await recordWebsiteRestoreReview(a.id,{
    sourceBinding:restoreSourceBinding(connection.origin,manifest.clientStackId),key,fingerprint,summary,
  });
  res.status(201).json(restoreOperationView(row));
});
websiteRestoreApi.get(root+"/:id",async(req,res)=>{
  res.set("Cache-Control","private, no-store");
  const a = await actor(req);
  if(a.role !== "owner") throw new HttpError(403,"Owner access required");
  z.object({}).strict().parse(req.query);
  res.json(restoreOperationView(await readWebsiteRestoreOperation(a.id,String(req.params.id))));
});

websiteRestoreApi.post(root+"/:id/execute",async(req,res)=>{
  res.set("Cache-Control","private, no-store");
  const a=await actor(req);
  if(a.role!=="owner") throw new HttpError(403,"Owner access required");
  z.object({}).strict().parse(req.query);
  const confirmation=restoreExecutionRequest.parse(req.body);
  const row=await readWebsiteRestoreOperation(a.id,String(req.params.id));
  const connection=marketingConnection();
  const binding=restoreSourceBinding(connection.origin,row.summary.clientStackId);
  const claim=await claimWebsiteRestore(a.id,row.id,binding,confirmation);
  if(!claim.execute){res.json(restoreOperationView(claim.operation));return;}
  try {
    const result=await callRestoreCore(req,a.id,connection,restoreExecuteOperation,{...receiptBody(claim.operation),key:claim.operation.archive_key});
    if(verifiedRestoreOutcome(result,row.id)!=="completed") throw Error("Restore completion unverified");
    res.json(restoreOperationView(await recordWebsiteRestoreOutcome(a.id,row.id,"completed")));
  } catch {
    // Persist uncertainty even for transport/audit failure; never automatically execute again.
    const operation=await recordWebsiteRestoreOutcome(a.id,row.id,"uncertain");
    res.status(202).json(restoreOperationView(operation));
  }
});
websiteRestoreApi.post(root+"/:id/reconcile",async(req,res)=>{
  res.set("Cache-Control","private, no-store");
  const a=await actor(req);
  if(a.role!=="owner") throw new HttpError(403,"Owner access required");
  z.object({}).strict().parse(req.query);z.object({}).strict().parse(req.body ?? {});
  const row=await readWebsiteRestoreOperation(a.id,String(req.params.id));
  const connection=marketingConnection(),binding=restoreSourceBinding(connection.origin,row.summary.clientStackId);
  if(row.source_binding!==binding) throw new HttpError(409,"Website connection changed; operator verification required");
  if(!["running","uncertain"].includes(row.status)){res.json(restoreOperationView(row));return;}
  let outcome;
  try { outcome=verifiedRestoreOutcome(await callRestoreCore(req,a.id,connection,restoreOutcomeOperation,receiptBody(row)),row.id); }
  catch {throw new HttpError(503,"Restore outcome unavailable; the operation remains blocked pending verification");}
  res.json(restoreOperationView(await reconcileWebsiteRestore(a.id,row.id,binding,outcome)));
});
