import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./database";
import { reviewFixture } from "./agreement-review.fixture";
import {
  readAgreementChargeReview,
  previewAgreementChargeReview,
  recordAgreementChargeReview,
  listAgreementChargeReviews,
  listAgreementCharges,
} from "./agreement-review.service";
import { listAgreementChargeQueue } from "./service-agreement.queue";
import { canonicalJson } from "./agreement-review.persistence";
import { postBillingDraft } from "./quickbooks";
const enabled = Boolean(process.env.AGREEMENT_TEST_DATABASE_URL);
after(async () => {
  await pool.end();
});
function input(
  r: Awaited<ReturnType<typeof readAgreementChargeReview>>,
  outcome: "keep_due" | "correction_required" = "keep_due",
) {
  return {
    expectedReviewVersion: r.reviewVersion,
    cancellationVersion: r.cancellationVersion,
    snapshotSha256: r.snapshotSha256,
    outcome,
    reason: "Reviewed accepted scope",
    operationId: randomUUID(),
  };
}
async function snapshot(agreementId: string) {
  return canonicalJson(
    (
      await pool.query(
        "SELECT jsonb_build_object('events',(SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM agreement_charge_review_event e JOIN agreement_charge c ON c.id=e.charge_id WHERE c.agreement_id=$1),'audit',(SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM audit_event e WHERE entity_id=$1::text),'charges',(SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM agreement_charge c WHERE agreement_id=$1),'drafts',(SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id) FROM billing_draft b JOIN agreement_charge c ON c.billing_draft_id=b.id WHERE c.agreement_id=$1)) AS snapshot",
        [agreementId],
      )
    ).rows[0].snapshot,
  );
}
test(
  "review previews write nothing; keep-due history survives queue removal and financial changes",
  { skip: !enabled },
  async () => {
    const f = await reviewFixture();
    const before = await snapshot(f.agreementId);
    const r = await readAgreementChargeReview(f.a, f.charge.id);
    assert.equal(r.reviewState, "unreviewed");
    assert(r.postingBlockReason);
    const b = input(r);
    const { operationId, ...previewBody } = b;
    const preview = await previewAgreementChargeReview(
      f.a,
      f.charge.id,
      previewBody,
    );
    assert(preview.wouldResolveSnapshot);
    assert.equal(await snapshot(f.agreementId), before);
    for (const role of ["dispatch", "sales", "crew", "client"] as const) {
      await assert.rejects(
        readAgreementChargeReview({ ...f.a, role }, f.charge.id),
        /Access denied/,
      );
      await assert.rejects(
        listAgreementCharges({ ...f.a, role }, f.agreementId, {}),
        /Access denied/,
      );
      await assert.rejects(
        recordAgreementChargeReview({ ...f.a, role }, f.charge.id, b),
        /Access denied/,
      );
    }
    const first = await recordAgreementChargeReview(
      { ...f.a, role: "finance" },
      f.charge.id,
      b,
    );
    assert(first.created);
    assert.equal(
      (await readAgreementChargeReview(f.a, f.charge.id)).reviewState,
      "kept_due",
    );
    assert(
      !(await listAgreementChargeQueue(f.a, { limit: 100 })).items.some(
        (i) => i.billingDraftId === f.charge.billingDraftId,
      ),
    );
    const history = await listAgreementCharges(f.a, f.agreementId, {});
    assert.equal(history.items[0].latestReceipt?.eventId, operationId);
    await pool.query("UPDATE billing_draft SET balance_cents=750 WHERE id=$1", [
      f.charge.billingDraftId,
    ]);
    const stale = await readAgreementChargeReview(f.a, f.charge.id);
    assert.equal(stale.reviewState, "stale_review");
    assert(
      (await listAgreementChargeQueue(f.a, { limit: 100 })).items.some(
        (i) => i.chargeId === f.charge.id && i.reviewState === "stale_review",
      ),
    );
    const replay = await recordAgreementChargeReview(
      { ...f.a, role: "finance" },
      f.charge.id,
      b,
    );
    assert.equal(replay.created, false);
    assert.deepEqual(replay.receipt, first.receipt);
    await assert.rejects(
      recordAgreementChargeReview(f.a, f.charge.id, {
        ...b,
        reason: "Changed operation",
      }),
      /different review/,
    );
    await assert.rejects(
      recordAgreementChargeReview(f.a, f.charge.id, {
        ...b,
        operationId: randomUUID(),
      }),
      /snapshot changed/,
    );
    await recordAgreementChargeReview(
      f.a,
      f.charge.id,
      input(stale, "correction_required"),
    );
    const sticky = await readAgreementChargeReview(f.a, f.charge.id);
    assert(sticky.correctionPending);
    assert.deepEqual(sticky.allowedOutcomes, ["correction_required"]);
    await assert.rejects(
      recordAgreementChargeReview(f.a, f.charge.id, input(sticky)),
      /cannot be closed/,
    );
    const events = await listAgreementChargeReviews(f.a, f.charge.id, {
      limit: 1,
    });
    assert.equal(events.items.length, 1);
    assert.equal(events.nextVersion, 1);
    assert.equal(
      (
        await listAgreementChargeReviews(f.a, f.charge.id, {
          afterVersion: 1,
          limit: 1,
        })
      ).items[0].outcome,
      "correction_required",
    );
    await assert.rejects(
      pool.query(
        "UPDATE agreement_charge_review_event SET reason='erased' WHERE id=$1",
        [operationId],
      ),
      /append-only/,
    );
    await assert.rejects(
      pool.query("DELETE FROM agreement_charge_review_event WHERE id=$1", [
        operationId,
      ]),
      /append-only/,
    );
  },
);
test(
  "competing reviewers serialize, and a failed audit rolls the review back",
  { skip: !enabled },
  async () => {
    const f = await reviewFixture();
    const r = await readAgreementChargeReview(f.a, f.charge.id);
    const results = await Promise.allSettled([
      recordAgreementChargeReview(f.a, f.charge.id, input(r)),
      recordAgreementChargeReview(
        f.a,
        f.charge.id,
        input(r, "correction_required"),
      ),
    ]);
    assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
    assert.equal(results.filter((x) => x.status === "rejected").length, 1);
    const other = await reviewFixture();
    const b = input(await readAgreementChargeReview(other.a, other.charge.id));
    await pool.query(
      `CREATE FUNCTION reject_fixture_review_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='agreement.charge_reviewed' AND NEW.entity_id='${other.agreementId}' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_fixture_review_audit BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION reject_fixture_review_audit();`,
    );
    try {
      await assert.rejects(
        recordAgreementChargeReview(other.a, other.charge.id, b),
        /fixture audit failure/,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT count(*) AS n FROM agreement_charge_review_event WHERE id=$1",
            [b.operationId],
          )
        ).rows[0].n,
        "0",
      );
    } finally {
      await pool.query(
        "DROP TRIGGER reject_fixture_review_audit ON audit_event; DROP FUNCTION reject_fixture_review_audit();",
      );
    }
    assert(
      (await recordAgreementChargeReview(other.a, other.charge.id, b)).created,
    );
    await pool.query(
      "UPDATE property SET lifecycle='prospect',client_id=NULL WHERE id=$1",
      [other.property],
    );
    await assert.rejects(
      recordAgreementChargeReview(other.a, other.charge.id, b),
      /operational|not found/i,
    );
  },
);

test(
  "cancellation review blocks a posting intent before any provider call",
  { skip: !enabled },
  async () => {
    const blocked = await reviewFixture();
    let providerCalls = 0;
    const provider = async () => {
      providerCalls++;
      return { Invoice: { Id: "fixture-invoice", Balance: 10 } };
    };
    await assert.rejects(
      postBillingDraft(
        blocked.a,
        blocked.charge.billingDraftId,
        "fixture-service-item",
        provider,
      ),
      /Review this cancellation-affected charge before posting/,
    );
    assert.equal(providerCalls, 0);

    await recordAgreementChargeReview(
      blocked.a,
      blocked.charge.id,
      input(
        await readAgreementChargeReview(blocked.a, blocked.charge.id),
        "correction_required",
      ),
    );
    await assert.rejects(
      postBillingDraft(
        blocked.a,
        blocked.charge.billingDraftId,
        "fixture-service-item",
        provider,
      ),
      /financial correction is still required/,
    );
    assert.equal(providerCalls, 0);
    assert.deepEqual(
      (
        await pool.query(
          "SELECT status,posting_request_id FROM billing_draft WHERE id=$1",
          [blocked.charge.billingDraftId],
        )
      ).rows[0],
      { status: "draft", posting_request_id: null },
    );

    const keptDue = await reviewFixture();
    await recordAgreementChargeReview(
      keptDue.a,
      keptDue.charge.id,
      input(await readAgreementChargeReview(keptDue.a, keptDue.charge.id)),
    );
    assert.equal(
      (
        await postBillingDraft(
          keptDue.a,
          keptDue.charge.billingDraftId,
          "fixture-service-item",
          provider,
        )
      ).status,
      "posted",
    );
    assert.equal(providerCalls, 1);
    await postBillingDraft(
      keptDue.a,
      keptDue.charge.billingDraftId,
      "fixture-service-item",
      provider,
    );
    assert.equal(providerCalls, 1, "posted receipts are never reposted");
  },
);
