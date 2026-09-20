import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./database";
import { recordWebsiteRestoreReview as recordReservedReview, claimWebsiteRestore, recordWebsiteRestoreOutcome, readWebsiteRestoreOperation, reconcileWebsiteRestore, listWebsiteRestoreOperations } from "./website-restore.service";
const confirmation={confirmation:"RESTORE WEBSITE DATABASE"};
const url=process.env.RESTORE_TEST_DATABASE_URL;
if(url && (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/restore_operations_test$/.test(url)||url!==process.env.DASHBOARD_DATABASE_URL)) throw Error("Dedicated local restore test database required");
after(()=>pool.end());
test("restore claims expire, serialize concurrent submissions, preserve audit and never replay uncertain outcomes",{skip:!url},async()=>{
  async function person(role:string,active=true){const id=randomUUID();await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',[id,"Restore fixture",id+"@example.test"]);await pool.query('INSERT INTO staff_profile(user_id,role,active) VALUES($1,$2,$3)',[id,role,active]);return id;}
  const owner=await person("owner"), other=await person("owner"), member=await person("manager"), inactive=await person("owner",false);
  const recordWebsiteRestoreReview=(actorId:string,input:Record<string,unknown>)=>recordReservedReview(actorId,{...input,operationId:randomUUID(),expiresAt:new Date(Date.now()+60000).toISOString()});
  const review={sourceBinding:"a".repeat(64),key:"db/test.gz",fingerprint:"b".repeat(64),summary:{createdAt:"2026-09-20T00:00:00Z",clientStackId:"p1-land-management",tableCount:1,totalRowCount:0,mediaAssetCount:0}};
  for(const id of [member,inactive]) await assert.rejects(recordWebsiteRestoreReview(id,review),/Active Owner/);
  const operationId=randomUUID(),expiresAt=new Date(Date.now()+60000).toISOString();
  const first=await recordReservedReview(owner,{...review,operationId,expiresAt});
  assert.equal(first.id,operationId);
  assert.equal(new Date(first.expires_at).toISOString(),expiresAt);
  for(const deadline of [new Date(Date.now()-1000),new Date(Date.now()+600000)])
    await assert.rejects(recordReservedReview(owner,{...review,operationId:randomUUID(),expiresAt:deadline.toISOString()}),/reservation expired or invalid/);
  await assert.rejects(recordReservedReview(owner,{...review,operationId,expiresAt}),/duplicate key/);
  assert.equal((await readWebsiteRestoreOperation(owner,first.id)).status,"reviewed");
  await assert.rejects(readWebsiteRestoreOperation(other,first.id),/not found/);
  for(const id of [member,inactive]) await assert.rejects(readWebsiteRestoreOperation(id,first.id),/Active Owner/);
  await assert.rejects(claimWebsiteRestore(other,first.id,review.sourceBinding,confirmation),/not found/);
  await assert.rejects(claimWebsiteRestore(owner,first.id,"c".repeat(64),confirmation),/connection changed/);
  for (const bad of [undefined,{}, {confirmation:"restore"}, {...confirmation,key:"other"}])
    await assert.rejects(claimWebsiteRestore(owner,first.id,review.sourceBinding,bad));
  assert.equal((await readWebsiteRestoreOperation(owner,first.id)).status,"reviewed");
  const claims=await Promise.all([claimWebsiteRestore(owner,first.id,review.sourceBinding,confirmation),claimWebsiteRestore(owner,first.id,review.sourceBinding,confirmation)]);
  assert.equal(claims.filter(c=>c.execute).length,1);
  assert.equal((await pool.query("SELECT count(*)::int n FROM audit_event WHERE entity_id=$1 AND action='website.restore_requested'",[first.id])).rows[0].n,1);
  await recordWebsiteRestoreOutcome(owner,first.id,"uncertain");
  assert.equal((await claimWebsiteRestore(owner,first.id,review.sourceBinding,confirmation)).execute,false);
  const second=await recordWebsiteRestoreReview(owner,review);
  assert.equal((await listWebsiteRestoreOperations(owner))[0].id,first.id);
  assert.equal((await listWebsiteRestoreOperations(other)).length,0);
  await assert.rejects(listWebsiteRestoreOperations(inactive),/Active Owner/);
  await assert.rejects(claimWebsiteRestore(owner,second.id,review.sourceBinding,confirmation),/outcome verification/);
  await assert.rejects(recordWebsiteRestoreOutcome(owner,first.id,"completed"),/reconciliation/);
  assert.equal((await reconcileWebsiteRestore(owner,first.id,review.sourceBinding,"unknown")).status,"uncertain");
  await assert.rejects(reconcileWebsiteRestore(other,first.id,review.sourceBinding,"not_applied"),/not found/);
  await assert.rejects(reconcileWebsiteRestore(owner,first.id,"2".repeat(64),"not_applied"),/connection changed/);
  assert.equal((await reconcileWebsiteRestore(owner,first.id,review.sourceBinding,"not_applied")).status,"not_applied");
  assert.equal((await reconcileWebsiteRestore(owner,first.id,review.sourceBinding,"not_applied")).status,"not_applied");
  assert.equal((await pool.query("SELECT count(*)::int n FROM audit_event WHERE entity_id=$1 AND action='website.restore_reconciled_not_applied'",[first.id])).rows[0].n,1);
  assert.equal((await claimWebsiteRestore(owner,first.id,review.sourceBinding,confirmation)).execute,false);
  assert.equal((await claimWebsiteRestore(owner,second.id,review.sourceBinding,confirmation)).execute,true);
  assert.equal((await reconcileWebsiteRestore(owner,second.id,review.sourceBinding,"completed")).status,"completed");
  await assert.rejects(reconcileWebsiteRestore(owner,second.id,review.sourceBinding,"not_applied"),/does not permit/);
  const separate=await recordWebsiteRestoreReview(owner,{...review,sourceBinding:"d".repeat(64)});
  await pool.query("UPDATE website_restore_operation SET expires_at=now()-interval '1 second' WHERE id=$1",[separate.id]);
  await assert.rejects(claimWebsiteRestore(owner,separate.id,"d".repeat(64),confirmation),/expired/);
  // A transaction can wait across expiry; transaction-start now() is insufficient.
  const waiting=await recordWebsiteRestoreReview(owner,{...review,sourceBinding:"9".repeat(64)});
  const blocker=await pool.connect();
  let waitingClaim:Promise<unknown>|undefined;
  try {
    await blocker.query("SELECT pg_advisory_lock(hashtextextended($1,0))",["website-restore:"+"9".repeat(64)]);
    waitingClaim=assert.rejects(claimWebsiteRestore(owner,waiting.id,"9".repeat(64),confirmation),/expired/);
    let observed=false;
    for(let attempt=0;attempt<100;attempt++){
      const blocked=await pool.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory' AND query LIKE 'SELECT pg_advisory_xact_lock%'");
      if(blocked.rowCount){observed=true;break;}
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    assert.equal(observed,true,"claim reached the held advisory lock");
    await pool.query("UPDATE website_restore_operation SET expires_at=clock_timestamp() WHERE id=$1",[waiting.id]);
  } finally {
    await blocker.query("SELECT pg_advisory_unlock(hashtextextended($1,0))",["website-restore:"+"9".repeat(64)]);
    blocker.release();
    await waitingClaim;
  }
  assert.equal((await readWebsiteRestoreOperation(owner,waiting.id)).status,"reviewed");
  const success=await recordWebsiteRestoreReview(owner,{...review,sourceBinding:"e".repeat(64)});
  await claimWebsiteRestore(owner,success.id,"e".repeat(64),confirmation);
  const racedReviews=await Promise.all([recordWebsiteRestoreReview(owner,{...review,sourceBinding:"f".repeat(64)}),recordWebsiteRestoreReview(owner,{...review,sourceBinding:"f".repeat(64)})]);
  const competing=await Promise.allSettled(racedReviews.map(r=>claimWebsiteRestore(owner,r.id,"f".repeat(64),confirmation)));
  assert.equal(competing.filter(r=>r.status==="fulfilled"&&r.value.execute).length,1);
  assert.equal(competing.filter(r=>r.status==="rejected").length,1);
  const atomic=await recordWebsiteRestoreReview(owner,{...review,sourceBinding:"1".repeat(64)});
  await pool.query(`CREATE FUNCTION reject_restore_audit_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='website.restore_requested' THEN RAISE EXCEPTION 'Synthetic audit rejection'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER reject_restore_audit_test BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION reject_restore_audit_test()`);
  try {
    await assert.rejects(claimWebsiteRestore(owner,atomic.id,"1".repeat(64),confirmation),/Synthetic audit rejection/);
    assert.equal((await pool.query("SELECT status FROM website_restore_operation WHERE id=$1",[atomic.id])).rows[0].status,"reviewed");
  } finally { await pool.query("DROP TRIGGER reject_restore_audit_test ON audit_event; DROP FUNCTION reject_restore_audit_test()"); }
  const recovery=await recordWebsiteRestoreReview(owner,{...review,sourceBinding:"8".repeat(64)});
  await claimWebsiteRestore(owner,recovery.id,"8".repeat(64),confirmation);
  await recordWebsiteRestoreOutcome(owner,recovery.id,"uncertain");
  await assert.rejects(readWebsiteRestoreOperation(other,recovery.id),/not found/);
  await pool.query("UPDATE staff_profile SET active=false WHERE user_id=$1",[owner]);
  assert.ok((await listWebsiteRestoreOperations(other)).some(row=>row.id===recovery.id));
  assert.equal((await readWebsiteRestoreOperation(other,recovery.id)).actor_id,owner);
  await assert.rejects(readWebsiteRestoreOperation(other,atomic.id),/not found/);
  await assert.rejects(claimWebsiteRestore(other,recovery.id,"8".repeat(64),confirmation),/not found/);
  assert.equal((await reconcileWebsiteRestore(other,recovery.id,"8".repeat(64),"unknown")).status,"uncertain");
  await pool.query("UPDATE staff_profile SET active=true WHERE user_id=$1",[owner]);
  await assert.rejects(reconcileWebsiteRestore(other,recovery.id,"8".repeat(64),"completed"),/not found/);
  await pool.query("UPDATE staff_profile SET active=false WHERE user_id=$1",[owner]);
  assert.equal((await reconcileWebsiteRestore(other,recovery.id,"8".repeat(64),"not_applied")).status,"not_applied");
  assert.equal((await listWebsiteRestoreOperations(other)).some(row=>row.id===recovery.id),true);
  assert.equal((await readWebsiteRestoreOperation(other,recovery.id)).status,"not_applied");
  await assert.rejects(readWebsiteRestoreOperation(await person("owner"),recovery.id),/not found/);
  const audit=(await pool.query("SELECT user_id,details FROM audit_event WHERE entity_id=$1 AND action='website.restore_reconciled_not_applied'",[recovery.id])).rows[0];
  assert.equal(audit.user_id,other);assert.deepEqual(audit.details,{originalActorId:owner});
  await recordWebsiteRestoreOutcome(owner,success.id,"completed");
  assert.equal((await pool.query("SELECT status FROM website_restore_operation WHERE id=$1",[success.id])).rows[0].status,"completed");
  await assert.rejects(claimWebsiteRestore(owner,success.id,"e".repeat(64),confirmation),/Active Owner/);
});
