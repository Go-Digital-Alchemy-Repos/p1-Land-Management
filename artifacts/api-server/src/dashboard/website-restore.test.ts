import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./database";
import { recordWebsiteRestoreReview, claimWebsiteRestore, recordWebsiteRestoreOutcome, readWebsiteRestoreOperation } from "./website-restore.service";
const url=process.env.RESTORE_TEST_DATABASE_URL;
if(url && (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/restore_operations_test$/.test(url)||url!==process.env.DASHBOARD_DATABASE_URL)) throw Error("Dedicated local restore test database required");
after(()=>pool.end());
test("restore claims expire, serialize concurrent submissions, preserve audit and never replay uncertain outcomes",{skip:!url},async()=>{
  async function person(role:string,active=true){const id=randomUUID();await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',[id,"Restore fixture",id+"@example.test"]);await pool.query('INSERT INTO staff_profile(user_id,role,active) VALUES($1,$2,$3)',[id,role,active]);return id;}
  const owner=await person("owner"), other=await person("owner"), member=await person("manager"), inactive=await person("owner",false);
  const review={sourceBinding:"a".repeat(64),key:"db/test.gz",fingerprint:"b".repeat(64),summary:{createdAt:"2026-09-20T00:00:00Z",clientStackId:"p1-land-management",tableCount:1,totalRowCount:0,mediaAssetCount:0}};
  for(const id of [member,inactive]) await assert.rejects(recordWebsiteRestoreReview(id,review),/Active Owner/);
  const first=await recordWebsiteRestoreReview(owner,review);
  assert.equal((await readWebsiteRestoreOperation(owner,first.id)).status,"reviewed");
  await assert.rejects(readWebsiteRestoreOperation(other,first.id),/not found/);
  for(const id of [member,inactive]) await assert.rejects(readWebsiteRestoreOperation(id,first.id),/Active Owner/);
  await assert.rejects(claimWebsiteRestore(other,first.id,review.sourceBinding),/not found/);
  await assert.rejects(claimWebsiteRestore(owner,first.id,"c".repeat(64)),/connection changed/);
  const claims=await Promise.all([claimWebsiteRestore(owner,first.id,review.sourceBinding),claimWebsiteRestore(owner,first.id,review.sourceBinding)]);
  assert.equal(claims.filter(c=>c.execute).length,1);
  assert.equal((await pool.query("SELECT count(*)::int n FROM audit_event WHERE entity_id=$1 AND action='website.restore_requested'",[first.id])).rows[0].n,1);
  await recordWebsiteRestoreOutcome(owner,first.id,"uncertain");
  assert.equal((await claimWebsiteRestore(owner,first.id,review.sourceBinding)).execute,false);
  const second=await recordWebsiteRestoreReview(owner,review);
  await assert.rejects(claimWebsiteRestore(owner,second.id,review.sourceBinding),/outcome verification/);
  await assert.rejects(recordWebsiteRestoreOutcome(owner,first.id,"completed"),/reconciliation/);
  const separate=await recordWebsiteRestoreReview(owner,{...review,sourceBinding:"d".repeat(64)});
  await pool.query("UPDATE website_restore_operation SET expires_at=now()-interval '1 second' WHERE id=$1",[separate.id]);
  await assert.rejects(claimWebsiteRestore(owner,separate.id,"d".repeat(64)),/expired/);
  const success=await recordWebsiteRestoreReview(owner,{...review,sourceBinding:"e".repeat(64)});
  await claimWebsiteRestore(owner,success.id,"e".repeat(64));
  const racedReviews=await Promise.all([recordWebsiteRestoreReview(owner,{...review,sourceBinding:"f".repeat(64)}),recordWebsiteRestoreReview(owner,{...review,sourceBinding:"f".repeat(64)})]);
  const competing=await Promise.allSettled(racedReviews.map(r=>claimWebsiteRestore(owner,r.id,"f".repeat(64))));
  assert.equal(competing.filter(r=>r.status==="fulfilled"&&r.value.execute).length,1);
  assert.equal(competing.filter(r=>r.status==="rejected").length,1);
  const atomic=await recordWebsiteRestoreReview(owner,{...review,sourceBinding:"1".repeat(64)});
  await pool.query(`CREATE FUNCTION reject_restore_audit_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='website.restore_requested' THEN RAISE EXCEPTION 'Synthetic audit rejection'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER reject_restore_audit_test BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION reject_restore_audit_test()`);
  try {
    await assert.rejects(claimWebsiteRestore(owner,atomic.id,"1".repeat(64)),/Synthetic audit rejection/);
    assert.equal((await pool.query("SELECT status FROM website_restore_operation WHERE id=$1",[atomic.id])).rows[0].status,"reviewed");
  } finally { await pool.query("DROP TRIGGER reject_restore_audit_test ON audit_event; DROP FUNCTION reject_restore_audit_test()"); }
  await pool.query("UPDATE staff_profile SET active=false WHERE user_id=$1",[owner]);
  await recordWebsiteRestoreOutcome(owner,success.id,"completed");
  assert.equal((await pool.query("SELECT status FROM website_restore_operation WHERE id=$1",[success.id])).rows[0].status,"completed");
  await assert.rejects(claimWebsiteRestore(owner,success.id,"e".repeat(64)),/Active Owner/);
});
