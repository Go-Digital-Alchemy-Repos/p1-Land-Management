import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { actor, identity } from "./access";
import { pool } from "./database";
import { HttpError } from "./policy";
import { marketingConnection } from "./marketing-reporting.transport";
import { callCms, restoreReviewOperation } from "./marketing-cms.transport";
import { coreRestoreReview, restoreReviewRequest, restoreSourceBinding, restoreOperationView } from "./website-restore.contract";
import { recordWebsiteRestoreReview, readWebsiteRestoreOperation } from "./website-restore.service";
export const websiteRestoreApi = Router();
const root = "/marketing/cms/website-system/backups/restore-operations";
websiteRestoreApi.post(root, async (req,res) => {
  res.set("Cache-Control","private, no-store");
  const a = await actor(req);
  if(a.role !== "owner") throw new HttpError(403,"Owner access required");
  z.object({}).strict().parse(req.query);
  const input = restoreReviewRequest.parse(req.body);
  const session = await identity(req);
  if(session.user.id !== a.id) throw new HttpError(401,"Sign in again");
  const connection = marketingConnection(), grantId = randomUUID();
  let result;
  try {
    await pool.query("INSERT INTO core_federation_grant(id,canonical_user_id,canonical_session_id,owner_attested,expires_at) VALUES($1,$2,$3,true,now()+interval '60 seconds')",[grantId,a.id,session.session.id]);
    result = await callCms(connection,restoreReviewOperation,{}, {},input,grantId);
  } finally {
    await pool.query("DELETE FROM core_federation_grant WHERE id=$1",[grantId]);
  }
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
