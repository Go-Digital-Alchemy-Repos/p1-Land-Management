import { z } from "zod";
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
import { reviewFixture } from "./agreement-review.fixture";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw Error("Agreement HTTP tests require local isolated server");
test(
  "agreement HTTP roles, no-write previews and manual billing cap share the real auth boundary",
  { skip: !base },
  async () => {
    const cookies: Record<string, string> = {};
    try {
      for (const role of [
        "manager",
        "finance",
        "dispatch",
        "client",
        "crew",
        "sales",
        "owner",
        "optional_owner",
        "required_manager",
      ]) {
        const id = randomUUID(),
          sid = randomUUID(),
          token = randomUUID();
        await pool.query(
          'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
          [id, "Agreement HTTP " + role, id + "@example.test"],
        );
        await pool.query(
          "INSERT INTO staff_profile(user_id,role,mfa_required) VALUES($1,$2,$3)",
          [
            id,
            role === "optional_owner"
              ? "owner"
              : role === "required_manager"
                ? "manager"
                : role,
            ["owner", "required_manager"].includes(role),
          ],
        );
        await pool.query(
          'INSERT INTO session(id,"userId",token,"expiresAt") VALUES($1,$2,$3,now()+interval \'10 minutes\')',
          [sid, id, token],
        );
        cookies[role] =
          "p1-dashboard.session_token=" +
          encodeURIComponent(
            token +
              "." +
              createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
                .update(token)
                .digest("base64"),
          );
      }
      async function req(
        role: string | undefined,
        path: string,
        body?: unknown,
        method = body === undefined ? "GET" : "POST",
      ) {
        const r = await fetch(base + "/api/v1" + path, {
          method,
          headers: {
            "Content-Type": "application/json",
            Origin: base!,
            ...(role ? { Cookie: cookies[role] } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        assert.equal(r.headers.get("cache-control"), "no-store");
        return {
          status: r.status,
          data: z.record(z.string(), z.unknown()).parse(await r.json()),
        };
      }
      for (const role of [
        "client",
        "crew",
        "sales",
        "owner",
        "required_manager",
      ])
        assert.equal((await req(role, "/service-agreements")).status, 403);
      assert.equal((await req(undefined, "/service-agreements")).status, 401);
      assert.equal(
        (await req("optional_owner", "/service-agreements")).status,
        200,
      );
      const client = randomUUID(),
        property = randomUUID(),
        recurrence = randomUUID(),
        estimate = randomUUID(),
        id = randomUUID();
      await pool.query("INSERT INTO client(id,name) VALUES($1,$2)", [
        client,
        "HTTP client",
      ]);
      await pool.query(
        "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,$3,$4)",
        [property, client, "HTTP property", "Synthetic"],
      );
      const today = (
        await pool.query(
          "SELECT (now() AT TIME ZONE 'America/New_York')::date::text AS d",
        )
      ).rows[0].d;
      await pool.query(
        "INSERT INTO recurring_service(id,property_id,title,cadence,interval_count,next_date,billing_mode) VALUES($1,$2,'HTTP recurrence','monthly',1,$3,'fixed_monthly')",
        [recurrence, property, today],
      );
      await pool.query(
        "INSERT INTO estimate(id,property_id,title,amount_cents,scope,status) VALUES($1,$2,'HTTP estimate',1500,'Approved scope','approved')",
        [estimate, property],
      );
      const body = {
        id,
        propertyId: property,
        recurringServiceId: recurrence,
        estimateId: estimate,
        predecessorId: null,
        terms: {
          title: "HTTP agreement",
          startsOn: today,
          endsOn: today,
          billingMode: "fixed_monthly",
          unitAmountCents: null,
          periods: [{ startsOn: today, endsOn: today, amountCents: 1000 }],
        },
      };
      assert.equal(
        (await req("finance", "/service-agreements", body)).status,
        403,
      );
      assert.equal(
        (await req("manager", "/service-agreements", body)).status,
        201,
      );
      for (const role of ["manager", "finance", "dispatch"])
        assert.equal(
          (await req(role, "/service-agreements/" + id)).status,
          200,
        );
      const dispatch = await req("dispatch", "/service-agreements/" + id);
      assert.equal(Object.hasOwn(dispatch.data, "periods"), false);
      assert.equal(Object.hasOwn(dispatch.data, "unitAmountCents"), false);
      assert.equal(
        (
          await req(
            "finance",
            "/service-agreements/" + id,
            { version: 1, terms: body.terms },
            "PATCH",
          )
        ).status,
        403,
      );
      const preview = await req(
        "finance",
        "/service-agreements/" + id + "/activation-preview",
        { version: 1 },
      );
      assert.equal(preview.status, 200);
      assert.equal(preview.data.plannedCents, 1000);
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT count(*) AS n FROM billing_draft WHERE estimate_id=$1",
              [estimate],
            )
          ).rows[0].n,
        ),
        0,
      );
      assert.equal(
        (
          await req(
            "dispatch",
            "/service-agreements/" + id + "/activation-preview",
            { version: 1 },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await req("finance", "/service-agreements/" + id + "/activate", {
            version: 1,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await req("manager", "/service-agreements/" + id + "/activate", {
            version: 1,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await req(
            "finance",
            "/service-agreements/" + id + "/charge-preview",
            { periodStart: today },
          )
        ).status,
        200,
      );
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT count(*) AS n FROM billing_draft WHERE estimate_id=$1",
              [estimate],
            )
          ).rows[0].n,
        ),
        0,
      );
      const race = await Promise.all([
        req("finance", "/service-agreements/" + id + "/charges", {
          periodStart: today,
        }),
        req("finance", "/billing", {
          operationId: randomUUID(),
          propertyId: property,
          estimateId: estimate,
          title: "Manual progress",
          amountCents: 1000,
          kind: "progress",
        }),
      ]);
      assert.equal(
        race.filter((r) => r.status === 200 || r.status === 201).length,
        1,
      );
      assert.equal(race.filter((r) => r.status === 409).length, 1);
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT sum(amount_cents) AS n FROM billing_draft WHERE estimate_id=$1",
              [estimate],
            )
          ).rows[0].n,
        ),
        1000,
      );
      const preparationJob = randomUUID();
      await pool.query(
        "INSERT INTO outbox(id,kind,payload,status,last_error,dedup_key) VALUES($1::uuid,'agreement.prepare_charge',$2,'failed','Synthetic eligibility review','agreement.prepare_charge:http:'||($1::uuid)::text)",
        [
          preparationJob,
          { version: 1, agreementId: id, source: { periodStart: today } },
        ],
      );
      await pool.query(
        "INSERT INTO agreement_preparation_job(job_id,failure_code) VALUES($1,'eligibility_changed')",
        [preparationJob],
      );
      const preparationList = await req(
        "finance",
        "/agreement-preparation-jobs?status=failed",
      );
      assert.equal(preparationList.status, 200);
      assert.ok(
        Array.isArray(preparationList.data.items) &&
          preparationList.data.items.some(
            (job: any) => job.jobId === preparationJob,
          ),
      );
      assert.equal(
        (
          await req("dispatch", "/agreement-preparation-jobs?status=failed")
        ).status,
        403,
      );
      assert.equal(
        (
          await req(undefined, "/agreement-preparation-jobs?status=failed")
        ).status,
        401,
      );
      const beforeRetryPreview = Number(
        (
          await pool.query(
            "SELECT count(*) AS n FROM agreement_preparation_retry_event WHERE job_id=$1",
            [preparationJob],
          )
        ).rows[0].n,
      );
      assert.equal(
        (
          await req("finance", "/agreement-preparation-jobs/" + preparationJob + "/retry-preview", { expectedRevision: 1 })
        ).status,
        200,
      );
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT count(*) AS n FROM agreement_preparation_retry_event WHERE job_id=$1",
              [preparationJob],
            )
          ).rows[0].n,
        ),
        beforeRetryPreview,
      );
      assert.equal(
        (
          await req("manager", "/delivery-jobs/" + preparationJob + "/retry", {})
        ).status,
        409,
      );
      const reviewFixtureData = await reviewFixture();
      const reviewSession = randomUUID(),
        reviewToken = randomUUID();
      await pool.query(
        'INSERT INTO session(id,"userId",token,"expiresAt") VALUES($1,$2,$3,now()+interval \'10 minutes\')',
        [reviewSession, reviewFixtureData.a.id, reviewToken],
      );
      cookies.review_manager =
        "p1-dashboard.session_token=" +
        encodeURIComponent(
          reviewToken +
            "." +
            createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
              .update(reviewToken)
              .digest("base64"),
        );
      assert.equal(
        (
          await req(
            "dispatch",
            "/agreement-charges/" + reviewFixtureData.charge.id + "/review",
          )
        ).status,
        403,
      );
      const current = (
        await req(
          "review_manager",
          "/agreement-charges/" + reviewFixtureData.charge.id + "/review",
        )
      ).data as any;
      assert.equal(current.reviewState, "unreviewed");
      const beforeReviewPreview = Number(
        (
          await pool.query(
            "SELECT count(*) AS n FROM agreement_charge_review_event WHERE charge_id=$1",
            [reviewFixtureData.charge.id],
          )
        ).rows[0].n,
      );
      const reviewInput = {
        expectedReviewVersion: current.reviewVersion,
        cancellationVersion: current.cancellationVersion,
        snapshotSha256: current.snapshotSha256,
        outcome: "keep_due",
        reason: "HTTP finance review",
      };
      const reviewPreview = await req(
        "review_manager",
        "/agreement-charges/" + reviewFixtureData.charge.id + "/review-preview",
        reviewInput,
      );
      assert.equal(reviewPreview.status, 200);
      assert.equal(reviewPreview.data.wouldResolveSnapshot, true);
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT count(*) AS n FROM agreement_charge_review_event WHERE charge_id=$1",
              [reviewFixtureData.charge.id],
            )
          ).rows[0].n,
        ),
        beforeReviewPreview,
      );
      const operationId = randomUUID();
      assert.equal(
        (
          await req(
            "review_manager",
            "/agreement-charges/" + reviewFixtureData.charge.id + "/reviews",
            { ...reviewInput, operationId },
          )
        ).status,
        201,
      );
      assert.equal(
        (
          await req(
            "review_manager",
            "/agreement-charges/" + reviewFixtureData.charge.id + "/reviews",
            { ...reviewInput, operationId },
          )
        ).status,
        200,
      );
      const history = await req(
        "review_manager",
        "/agreement-charges/" +
          reviewFixtureData.charge.id +
          "/reviews?limit=1",
      );
      assert.equal(history.status, 200);
      assert.equal((history.data.items as unknown[]).length, 1);
      const chargeHistory = await req(
        "review_manager",
        "/service-agreements/" + reviewFixtureData.agreementId + "/charges",
      );
      assert.equal(chargeHistory.status, 200);
      assert.equal((chargeHistory.data.items as unknown[]).length, 1);
    } finally {
      await pool.end();
    }
  },
);
