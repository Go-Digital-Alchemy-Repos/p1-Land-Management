import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
import { cancelDormantQuickBooksJob, cancelDormantQuickBooksJobs, enqueueQuickBooksReconciliation } from "./quickbooks-jobs";
import { reconcileQuickBooks } from "./quickbooks";

const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:")) throw new Error("Requires isolated local server");
after(() => pool.end());

test("QuickBooks defaults off at every transport and in the worker", { skip: !base }, async () => {
  assert.notEqual(process.env.P1_FEATURE_QUICKBOOKS, "enabled");
  const ownerId = randomUUID(), sessionId = randomUUID(), token = randomUUID();
  await pool.query('INSERT INTO "user"(id,name,email,"emailVerified","twoFactorEnabled") VALUES($1,\'Test Owner\',$2,true,true)', [ownerId, `${ownerId}@example.test`]);
  await pool.query("INSERT INTO staff_profile(user_id,role,mfa_required) VALUES($1,'owner',true)", [ownerId]);
  await pool.query('INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')', [sessionId, token, ownerId]);
  await pool.query("INSERT INTO session_assurance(session_id) VALUES($1)", [sessionId]);
  const cookie = "p1-dashboard.session_token=" + encodeURIComponent(token + "." + createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(token).digest("base64"));
  const request = async (path: string, method = "GET", body?: unknown) => fetch(`${base}${path}`, {
    method, headers: { cookie, origin: base!, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const [method, path] of [
    ["POST", "/api/v1/quickbooks/connect"],
    ["GET", "/api/v1/quickbooks/callback"],
    ["POST", "/api/v1/quickbooks/import-preview"],
    ["POST", "/api/v1/quickbooks/import"],
    ["GET", "/api/v1/quickbooks/invoices"],
    ["POST", `/api/v1/billing/${randomUUID()}/post`],
  ]) {
    const response = await request(path, method, method === "POST" ? {} : undefined);
    assert.equal(response.status, 404, `${method} ${path}`);
    assert.deepEqual(await response.json(), { error: "feature_disabled" });
  }
  const webhook = await request("/api/webhooks/quickbooks", "POST", { fake: "event" });
  assert.equal(webhook.status, 204);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM outbox WHERE kind='quickbooks.reconcile'")).rows[0].n, 0);

  await pool.query("INSERT INTO integration_connection(provider,realm_id,credentials_encrypted) VALUES('quickbooks','123','synthetic')");
  assert.equal(await enqueueQuickBooksReconciliation(pool), false);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM outbox WHERE kind='quickbooks.reconcile'")).rows[0].n, 0);
  const jobId = randomUUID();
  await pool.query("INSERT INTO outbox(id,kind,payload) VALUES($1,'quickbooks.reconcile','{}'::jsonb)", [jobId]);
  assert.equal(await cancelDormantQuickBooksJob(pool, jobId), true);
  assert.deepEqual((await pool.query("SELECT status,last_error FROM outbox WHERE id=$1", [jobId])).rows[0], { status: "cancelled", last_error: "feature_disabled" });
  const stranded = randomUUID();
  await pool.query("INSERT INTO outbox(id,kind,payload,status) VALUES($1,'quickbooks.reconcile','{}'::jsonb,'processing')", [stranded]);
  assert.equal(await cancelDormantQuickBooksJobs(pool), 1);
  assert.equal((await pool.query("SELECT status FROM outbox WHERE id=$1", [stranded])).rows[0].status, "cancelled");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("provider must not be contacted"); };
  try { await reconcileQuickBooks(); } finally { globalThis.fetch = originalFetch; }

  const me = await (await request("/api/v1/me")).json() as any;
  assert.equal(me.features.quickbooks, false);
  const integrations = await (await request("/api/v1/integrations")).json() as any;
  assert.deepEqual(integrations.features, { quickbooks: false });
  assert.equal(Object.hasOwn(integrations, "quickbooks"), false);
  assert.equal(integrations.jobs.some((job: any) => job.kind.startsWith("quickbooks.")), false);
});
