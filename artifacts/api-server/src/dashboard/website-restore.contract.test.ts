import { test } from "node:test";
import assert from "node:assert/strict";
import { coreRestoreReview,restoreOperationView,restoreReviewRequest,restoreSourceBinding,verifiedRestoreOutcome } from "./website-restore.contract";
import { callCms,cmsDestination,cmsOperations,restoreReviewOperation,restoreExecuteOperation,restoreOutcomeOperation } from "./marketing-cms.transport";
const summary={createdAt:"2026-09-20T00:00:00Z",clientStackId:"p1-land-management",tableCount:1,totalRowCount:2,mediaAssetCount:0};
test("Core review discards archive internals and rejects incomplete identity or fingerprint",()=>{
 const value={manifest:{...summary,key:"db/fixture.gz",rows:[{secret:"private"}],privateCapture:{private:true}},fingerprint:"a".repeat(64)};
 assert.deepEqual(coreRestoreReview.parse(value),{manifest:{...summary,key:"db/fixture.gz"},fingerprint:value.fingerprint});
 for(const bad of [{...value,fingerprint:"invalid"},{...value,manifest:{...value.manifest,clientStackId:null}},{...value,manifest:{...value.manifest,tableCount:0}}]) assert.equal(coreRestoreReview.safeParse(bad).success,false);
 for(const body of [{key:"x",fingerprint:value.fingerprint},{key:"x",sourceBinding:"x"},{key:" "}]) assert.equal(restoreReviewRequest.safeParse(body).success,false);
});
test("public operation view excludes all archive and actor bindings",()=>{
 const row={id:"11111111-1111-4111-8111-111111111111",status:"reviewed",summary:{...summary,private:"hidden"},created_at:new Date("2026-09-20T00:00:00Z"),updated_at:new Date("2026-09-20T00:00:00Z"),expires_at:new Date("2026-09-20T00:05:00Z"),archive_key:"private-key",archive_fingerprint:"a".repeat(64),source_binding:"b".repeat(64),actor_id:"private-actor"};
 const result=restoreOperationView(row);
 assert.deepEqual(Object.keys(result),["id","status","summary","expiresAt","createdAt","updatedAt"]);
 assert.deepEqual(result.summary,summary);
 assert.equal(result.expiresAt,"2026-09-20T00:05:00.000Z");
 assert.equal(JSON.stringify(result).includes("private"),false);
});
test("source binding distinguishes destinations and stack identities",()=>{
 assert.equal(restoreSourceBinding("https://core.example.test/","p1"),restoreSourceBinding("https://core.example.test","p1"));
 assert.notEqual(restoreSourceBinding("https://core.example.test","p1"),restoreSourceBinding("https://other.example.test","p1"));
 assert.notEqual(restoreSourceBinding("https://core.example.test","p1"),restoreSourceBinding("https://core.example.test","other"));
});
test("review transport stays outside generic proxy and uses only the fixed protected destination",async()=>{
 assert.equal(cmsOperations.includes(restoreReviewOperation),false);
 assert.throws(()=>cmsDestination({...restoreReviewOperation},{},{}),/not found/);
 assert.throws(()=>cmsDestination(restoreReviewOperation,{}, {key:"injected"}),/Invalid CMS query/);
 let calls=0;
 await callCms({origin:"https://core.example.test",key:"synthetic"},restoreReviewOperation,{}, {},{key:"db/test.gz"},"grant",async(url,options)=>{
  calls++;
  assert.equal(url,"https://core.example.test/api/integrations/business-center/cms/website-system/backups/restore-review");
  assert.equal(options?.redirect,"error");
  assert.equal(options?.method,"POST");
  assert.deepEqual(JSON.parse(String(options?.body)),{key:"db/test.gz"});
  assert.equal(new Headers(options?.headers).get("x-p1-user-grant"),"grant");
  return Response.json({manifest:{...summary,key:"db/test.gz"},fingerprint:"a".repeat(64)});
 });
 assert.equal(calls,1);
});

test("only exact correlated Core outcomes are accepted",()=>{
 const id="11111111-1111-4111-8111-111111111111";
 for(const outcome of ["completed","not_applied","unknown"]){
   assert.equal(verifiedRestoreOutcome({status:200,body:{operationId:id,outcome}},id),outcome);
 }
 for(const result of [{status:503,body:{operationId:id,outcome:"completed"}},{status:200,body:{operationId:"other",outcome:"completed"}},{status:200,body:{operationId:id,outcome:"completed",extra:"unexpected"}},{status:200,body:{operationId:id,outcome:"success"}}]) assert.throws(()=>verifiedRestoreOutcome(result,id));
 for(const op of [restoreExecuteOperation,restoreOutcomeOperation]){
   assert.equal(cmsOperations.includes(op),false);
   assert.throws(()=>cmsDestination({...op},{},{}),/not found/);
   assert.throws(()=>cmsDestination(op,{}, {actorId:"injected"}),/Invalid CMS query/);
 }
});
