import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, stat, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureSource, captureInventory, writeCapture, queries } from './capture-account-access.mjs';
function client({ fail = false, readonly = 'on' } = {}) {
 const calls = [];
 return { calls, async query(sql) { calls.push(sql);
  if(sql.startsWith('SELECT current_timestamp')) return { rows: [{ capturedAt:'2026-09-19T00:00:00Z',readOnly:readonly,isolation:'repeatable read' }] };
  if(sql.startsWith('SELECT')) { if(fail) throw Error('private connection details must not become output'); return { rows: [] }; }
  return { rows: [] };
 }};
}
test('captures only explicit read projections inside verified snapshots without invented reviews', async () => {
 const a=client(),b=client(); const result=await captureInventory(a,b,true);
 assert.equal(result.review,null);assert.equal(result.sourceFreezeVerified,false);assert.equal(result.releaseApproval,false);
 assert.equal(result.notificationRouting.canonicalEnabled,true);
 for(const c of [a,b]) { assert.equal(c.calls[0],'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');assert.equal(c.calls.at(-1),'COMMIT'); }
 for(const sql of Object.values(queries).flatMap(Object.values)) {
  assert.match(sql,/^SELECT /);assert.doesNotMatch(sql,/\b(password|token|email|secret|session|accountId|name)\b/i);
 }
 assert.match(result.core.sha256,/^[a-f0-9]{64}$/);
});
test('read-only verification and query failure roll back without producing a snapshot', async () => {
 for(const options of [{readonly:'off'},{fail:true}]) { const c=client(options);await assert.rejects(captureSource(c,'core'));assert.equal(c.calls.at(-1),'ROLLBACK');assert(!c.calls.includes('COMMIT')); }
});
test('private output is exclusive and never overwrites an earlier capture', async () => {
 const dir=await mkdtemp(join(tmpdir(),'p1-capture-test-'));const path=join(dir,'capture.json');
 try { await writeCapture(path,{review:null});assert.equal((await stat(path)).mode & 0o777,0o600);await assert.rejects(writeCapture(path,{changed:true}));assert.deepEqual(JSON.parse(await readFile(path,'utf8')),{review:null}); }
 finally {await rm(dir,{recursive:true,force:true});}
});
