import { z } from "zod";
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
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
      ]) {
        const id = randomUUID(),
          sid = randomUUID(),
          token = randomUUID();
        await pool.query(
          'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
          [id, "Agreement HTTP " + role, id + "@example.test"],
        );
        await pool.query(
          "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
          [id, role],
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
      for (const role of ["client", "crew", "sales", "owner"])
        assert.equal((await req(role, "/service-agreements")).status, 403);
      assert.equal((await req(undefined, "/service-agreements")).status, 401);
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
    } finally {
      await pool.end();
    }
  },
);
