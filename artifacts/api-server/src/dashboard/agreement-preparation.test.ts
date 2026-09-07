import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./database";
import type { Actor } from "./access";
import { createServiceAgreement, activateServiceAgreement } from "./service-agreement.service";
import { prepareAgreementCharge } from "./service-agreement.billing";
import { runAgreementPreparationOnce, scanAgreementPreparation, previewAgreementPreparationRetry, retryAgreementPreparation } from "./agreement-preparation";

test("agreement preparation scanner creates one durable draft job per source and preserves manual attribution", { skip: !process.env.AGREEMENT_TEST_DATABASE_URL }, async () => {
  const user = randomUUID(), client = randomUUID(), property = randomUUID();
  const actor: Actor = { id: user, name: "Preparation fixture", role: "manager" };
  try {
    await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [user, actor.name, `${user}@example.test`]);
    await pool.query("INSERT INTO client(id,name) VALUES($1,'Preparation client')", [client]);
    await pool.query("INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Preparation property','Synthetic')", [property, client]);
    const today = (await pool.query("SELECT (now() AT TIME ZONE 'America/New_York')::date::text AS d")).rows[0].d;
    async function create(mode: "fixed_monthly" | "per_visit") {
      const agreementId = randomUUID(), estimateId = randomUUID(), recurrenceId = randomUUID();
      await pool.query("INSERT INTO estimate(id,property_id,title,amount_cents,scope,status) VALUES($1,$2,'Approved preparation scope',5000,'Synthetic','approved')", [estimateId, property]);
      await pool.query("INSERT INTO recurring_service(id,property_id,title,cadence,interval_count,next_date,billing_mode,paused) VALUES($1,$2,'Preparation visits','monthly',1,$3,$4,true)", [recurrenceId, property, today, mode]);
      await createServiceAgreement(actor, { id: agreementId, propertyId: property, recurringServiceId: recurrenceId, estimateId, predecessorId: null,
        terms: { title: "Preparation agreement", startsOn: today, endsOn: today, billingMode: mode,
          unitAmountCents: mode === "per_visit" ? 1000 : null,
          periods: mode === "fixed_monthly" ? [{ startsOn: today, endsOn: today, amountCents: 1000 }] : [] } });
      await activateServiceAgreement(actor, agreementId, { version: 1 });
      return { agreementId, recurrenceId, estimateId };
    }
    const fixed = await create("fixed_monthly");
    const perVisit = await create("per_visit");
    const work = randomUUID();
    await pool.query("INSERT INTO work_order(id,property_id,recurring_service_id,occurrence_date,title,status) VALUES($1,$2,$3,$4,'Reviewed preparation visit','reviewed')", [work, property, perVisit.recurrenceId, today]);
    for (let i = 0; i < 30; i++) await scanAgreementPreparation();
    for (let i = 0; i < 30; i++) await runAgreementPreparationOnce();
    const prepared = (await pool.query("SELECT o.status AS job_status,c.prepared_by,c.prepared_job_id,b.status AS draft_status FROM outbox o JOIN agreement_preparation_job j ON j.job_id=o.id JOIN agreement_charge c ON c.id=j.charge_id JOIN billing_draft b ON b.id=c.billing_draft_id WHERE o.kind='agreement.prepare_charge' AND c.agreement_id=ANY($1::uuid[]) ORDER BY o.created_at", [[fixed.agreementId, perVisit.agreementId]])).rows;
    assert.equal(prepared.length, 2, JSON.stringify({
      prepared,
      scans: (await pool.query("SELECT family,phase,upper_id,last_id,records_visited,jobs_enqueued,last_error_code FROM agreement_preparation_scan ORDER BY family")).rows,
      jobs: (await pool.query("SELECT status,payload,last_error FROM outbox WHERE kind='agreement.prepare_charge'")).rows,
    }));
    assert.ok(prepared.every((row) => row.job_status === "sent" && row.prepared_by === null && row.prepared_job_id && row.draft_status === "draft"));
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM billing_draft WHERE estimate_id=ANY($1::uuid[]) AND status<>'draft'", [[fixed.estimateId, perVisit.estimateId]])).rows[0].n, 0);

    const manual = await create("fixed_monthly");
    for (let i = 0; i < 30; i++) await scanAgreementPreparation();
    await pool.query("UPDATE agreement_preparation_scan SET next_cycle_at=now() WHERE phase='idle'");
    for (let i = 0; i < 30; i++) await scanAgreementPreparation();
    const manualReceipt = await prepareAgreementCharge(actor, manual.agreementId, { periodStart: today });
    for (let i = 0; i < 30; i++) await runAgreementPreparationOnce();
    const attribution = (await pool.query("SELECT prepared_by,prepared_job_id FROM agreement_charge WHERE id=$1", [manualReceipt.id])).rows[0];
    assert.equal(attribution.prepared_by, user);
    assert.equal(attribution.prepared_job_id, null);
    const manualJob = (await pool.query("SELECT o.status,j.charge_id FROM outbox o JOIN agreement_preparation_job j ON j.job_id=o.id WHERE o.dedup_key=$1", [`agreement.prepare_charge:${manual.agreementId}:period:${today}`])).rows[0];
    assert.deepEqual(manualJob, { status: "sent", charge_id: manualReceipt.id });

    const retryable = await create("per_visit"), retryWork = randomUUID(), retryJob = randomUUID();
    await pool.query("INSERT INTO work_order(id,property_id,recurring_service_id,occurrence_date,title,status) VALUES($1,$2,$3,$4,'Retryable preparation visit','completed')", [retryWork, property, retryable.recurrenceId, today]);
    await pool.query("INSERT INTO outbox(id,kind,payload,dedup_key) VALUES($1,'agreement.prepare_charge',$2,$3)", [retryJob, { version: 1, agreementId: retryable.agreementId, source: { workOrderId: retryWork } }, `agreement.prepare_charge:${retryable.agreementId}:work:${retryWork}`]);
    await pool.query("INSERT INTO agreement_preparation_job(job_id) VALUES($1)", [retryJob]);
    await runAgreementPreparationOnce();
    const failed = (await pool.query("SELECT o.status,j.failure_code,j.revision FROM outbox o JOIN agreement_preparation_job j ON j.job_id=o.id WHERE o.id=$1", [retryJob])).rows[0];
    assert.deepEqual({ status: failed.status, failure_code: failed.failure_code }, { status: "failed", failure_code: "eligibility_changed" });
    const unavailable = await previewAgreementPreparationRetry(actor, retryJob, { expectedRevision: Number(failed.revision) });
    assert.equal(unavailable.eligible, false);
    await pool.query("UPDATE work_order SET status='reviewed' WHERE id=$1", [retryWork]);
    const retryPreview = await previewAgreementPreparationRetry(actor, retryJob, { expectedRevision: Number(failed.revision) });
    assert.equal(retryPreview.eligible, true);
    const retried = await retryAgreementPreparation(actor, retryJob, { operationId: randomUUID(), expectedRevision: Number(failed.revision), eligibilityFingerprint: retryPreview.eligibilityFingerprint, reason: "Manager confirmed review completion" });
    assert.equal(retried.created, true);
    for (let i = 0; i < 5; i++) await runAgreementPreparationOnce();
    assert.deepEqual((await pool.query("SELECT o.status,j.failure_code FROM outbox o JOIN agreement_preparation_job j ON j.job_id=o.id WHERE o.id=$1", [retryJob])).rows[0], { status: "sent", failure_code: null });
  } finally {
    await pool.end();
  }
});
