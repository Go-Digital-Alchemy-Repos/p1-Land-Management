import test,{after} from "node:test";
import assert from "node:assert/strict";
import {createHmac,randomUUID} from "node:crypto";
import express from "express";
import {ZodError} from "zod";
import {pool} from "./database";
import {websiteRestoreApi} from "./website-restore";
import {HttpError} from "./policy";
const database=process.env.RESTORE_TEST_DATABASE_URL;
if(database && (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/restore_operations_test$/.test(database)||database!==process.env.DASHBOARD_DATABASE_URL))throw Error("Dedicated local restore test database required");
after(()=>pool.end());
test("authenticated restore HTTP claims, grants, outcomes and retries preserve the ledger",{skip:!database},async()=>{
 const originalFetch=globalThis.fetch,oldOrigin=process.env.CORE_MARKETING_ORIGIN,oldKey=process.env.CORE_MARKETING_SERVICE_KEY;
 process.env.CORE_MARKETING_ORIGIN="https://restore-core.example.test";process.env.CORE_MARKETING_SERVICE_KEY="x".repeat(43);
 let recoveryCalls=0;
 let reservationMode="valid",mode="lost",outcome="unknown",executions=0,providerCalls=0;
 globalThis.fetch=async(input,options)=>{
  const url=String(input);
  if(!url.startsWith("https://restore-core.example.test/"))return originalFetch(input,options);
  providerCalls++;
  assert.equal(options?.method,"POST");assert.equal(options?.redirect,"error");
  const grant=new Headers(options?.headers).get("x-p1-user-grant");
  const g=(await pool.query("SELECT * FROM core_federation_grant WHERE id=$1 AND expires_at>now()",[grant])).rows[0];
  assert.ok(g?.owner_attested);
  const b=JSON.parse(String(options?.body));
  if(url.endsWith("/restore-review"))return Response.json({operationId:reservationMode==="mismatch"?randomUUID():b.operationId,expiresAt:new Date(Date.now()+(reservationMode==="expired"?-1000:60000)).toISOString(),manifest:{key:b.key,createdAt:"2026-09-20T00:00:00Z",clientStackId:"p1-land-management",tableCount:2,totalRowCount:3,mediaAssetCount:0},fingerprint:"a".repeat(64)});
  const row=(await pool.query("SELECT * FROM website_restore_operation WHERE id=$1",[b.operationId])).rows[0];
  if(url.endsWith("/restore-recovery-outcome")){
   recoveryCalls++;assert.notEqual(row.actor_id,g.canonical_user_id);assert.equal(b.originalActorId,row.actor_id);
   assert.equal((await pool.query("SELECT active FROM staff_profile WHERE user_id=$1",[row.actor_id])).rows[0].active,false);
  }else{assert.equal(row.actor_id,g.canonical_user_id);assert.equal(b.originalActorId,undefined);}
  assert.equal(b.fingerprint,row.archive_fingerprint);
  assert.equal(b.expiresAt,new Date(row.expires_at).toISOString());
  if(url.endsWith("/restore-execute")){
   executions++;assert.equal(row.status,"running");assert.equal(b.key,row.archive_key);
   if(mode==="lost")throw Error("Synthetic lost Core response");
   return Response.json({operationId:b.operationId,outcome:"completed"});
  }
  assert.ok(url.endsWith("/restore-outcome")||url.endsWith("/restore-recovery-outcome"));
  return Response.json({operationId:outcome==="mismatch"?randomUUID():b.operationId,outcome:outcome==="mismatch"?"completed":outcome});
 };
 const app=express();app.use(express.json(),websiteRestoreApi);
 app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error instanceof HttpError?error.status:error instanceof ZodError?400:500).json({error:"Request failed"}));
 const server=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));
 const base=`http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}/marketing/cms/website-system/backups/restore-operations`;
 async function account(role:string,active=true,mfa=false){
  const id=randomUUID(),sid=randomUUID(),token=randomUUID();
  await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',[id,"Restore HTTP fixture",id+"@example.test"]);
  await pool.query("INSERT INTO staff_profile(user_id,role,active,mfa_required) VALUES($1,$2,$3,$4)",[id,role,active,mfa]);
  await pool.query('INSERT INTO session(id,"userId",token,"expiresAt") VALUES($1,$2,$3,now()+interval \'10 minutes\')',[sid,id,token]);
  return "p1-dashboard.session_token="+encodeURIComponent(token+"."+createHmac("sha256",process.env.BETTER_AUTH_SECRET!).update(token).digest("base64"));
 }
 async function req(cookie:string,path="",body?:unknown){
  const response=await originalFetch(base+path,{method:body===undefined?"GET":"POST",headers:{"Content-Type":"application/json",Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:await response.json() as any};
 }
 try{
  const owner=await account("owner"),other=await account("owner"),manager=await account("manager"),inactive=await account("owner",false),mfa=await account("owner",true,true);
  assert.equal((await req("")).status,401);
  for(const cookie of [manager,inactive,mfa])assert.equal((await req(cookie)).status,403);
  assert.equal(providerCalls,0);
  for(const [invalidMode,status] of [["mismatch",503],["expired",409]] as const){
   reservationMode=invalidMode;
   const before=(await pool.query("SELECT count(*)::int n FROM website_restore_operation")).rows[0].n;
   assert.equal((await req(owner,"",{key:"db/fixture"})).status,status);
   assert.equal((await pool.query("SELECT count(*)::int n FROM website_restore_operation")).rows[0].n,before);
  }
  reservationMode="valid";
  const review=await req(owner,"",{key:"db/fixture"});assert.equal(review.status,201);
  const id=review.body.id;
  assert.equal(JSON.stringify(review.body).includes("fingerprint"),false);
  assert.equal((await req(other,"/"+id)).status,404);
  assert.equal((await req(owner,"/"+id+"/execute",{confirmation:"wrong"})).status,400);assert.equal(executions,0);
  const confirm={confirmation:"RESTORE WEBSITE DATABASE"};
  const result=await req(owner,"/"+id+"/execute",confirm);assert.equal(result.status,202);assert.equal(result.body.status,"uncertain");
  assert.equal((await req(owner,"/"+id+"/execute",confirm)).body.status,"uncertain");assert.equal(executions,1);
  const next=(await req(owner,"",{key:"db/fixture"})).body;
  assert.equal((await req(owner,"/"+next.id+"/execute",confirm)).status,409);
  assert.equal((await req(owner,"/"+id+"/reconcile",{})).body.status,"uncertain");
  outcome="mismatch";assert.equal((await req(owner,"/"+id+"/reconcile",{})).status,503);
  outcome="completed";assert.equal((await req(owner,"/"+id+"/reconcile",{})).body.status,"completed");assert.equal(executions,1);
  mode="success";
  const raced=await Promise.all([req(owner,"/"+next.id+"/execute",confirm),req(owner,"/"+next.id+"/execute",confirm)]);
  assert.ok(raced.every(r=>r.status===200));assert.equal(executions,2);
  assert.equal((await req(owner,"/"+next.id)).body.status,"completed");
  const orphan=(await req(owner,"",{key:"db/fixture"})).body;
  mode="lost";assert.equal((await req(owner,"/"+orphan.id+"/execute",confirm)).status,202);
  const beforeExecutions=executions;
  const originalId=(await pool.query("SELECT actor_id FROM website_restore_operation WHERE id=$1",[orphan.id])).rows[0].actor_id;
  await pool.query("UPDATE staff_profile SET active=false WHERE user_id=$1",[originalId]);
  assert.ok((await req(other)).body.some((row:any)=>row.id===orphan.id));
  assert.equal((await req(other,"/"+orphan.id+"/execute",confirm)).status,404);
  assert.equal((await req(other,"/"+orphan.id+"/reconcile",{originalActorId:"spoof"})).status,400);
  outcome="unknown";assert.equal((await req(other,"/"+orphan.id+"/reconcile",{})).body.status,"uncertain");
  outcome="not_applied";assert.equal((await req(other,"/"+orphan.id+"/reconcile",{})).body.status,"not_applied");
  assert.equal((await req(other,"/"+orphan.id)).body.status,"not_applied");
  assert.equal((await req(other,"/"+orphan.id+"/reconcile",{})).body.status,"not_applied");
  assert.equal(executions,beforeExecutions);assert.equal(recoveryCalls,2);
  assert.equal((await req(inactive,"/"+orphan.id+"/reconcile",{})).status,403);
  assert.equal((await pool.query("SELECT count(*)::int n FROM core_federation_grant")).rows[0].n,0);
 }finally{
  globalThis.fetch=originalFetch;
  if(oldOrigin===undefined)delete process.env.CORE_MARKETING_ORIGIN;else process.env.CORE_MARKETING_ORIGIN=oldOrigin;
  if(oldKey===undefined)delete process.env.CORE_MARKETING_SERVICE_KEY;else process.env.CORE_MARKETING_SERVICE_KEY=oldKey;
  await new Promise<void>(resolve=>server.close(()=>resolve()));
 }
});
