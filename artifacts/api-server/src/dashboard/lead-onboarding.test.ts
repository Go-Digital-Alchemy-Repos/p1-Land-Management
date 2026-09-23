import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw Error("Isolated local server required");
after(() => pool.end());
test(
  "Won customer onboarding is explicit, atomic, replayable and isolated from property/access/accounting creation",
  { skip: !base },
  async () => {
    const users: Record<string, { id: string; cookie: string }> = {};
    for (const role of [
      "owner",
      "both",
      "sales",
      "customers",
      "crew",
      "client",
    ]) {
      const id = randomUUID(),
        token = randomUUID();
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [id, role, id + "@example.test"],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [id, ["owner", "crew", "client"].includes(role) ? role : "member"],
      );
      await pool.query(
        "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)",
        [
          id,
          role === "both"
            ? ["revenue.sales", "customers.clients"]
            : role === "sales"
              ? ["revenue.sales"]
              : role === "customers"
                ? ["customers.clients"]
                : [],
        ],
      );
      await pool.query(
        'INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
        [randomUUID(), token, id],
      );
      users[role] = {
        id,
        cookie:
          "p1-dashboard.session_token=" +
          encodeURIComponent(
            token +
              "." +
              createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
                .update(token)
                .digest("base64"),
          ),
      };
    }
    const makeLead = async (status = "won") => {
      const id = randomUUID();
      await pool.query(
        "INSERT INTO lead(id,name,email,location,description,status) VALUES($1,'Source name','source@example.test','Region','Original message',$2)",
        [id, status],
      );
      return id;
    };
    const call = (who: string, id: string, body?: unknown) =>
      fetch(`${base}/api/v1/leads/${id}/onboarding`, {
        method: body ? "POST" : "GET",
        headers: {
          cookie: users[who]?.cookie || "",
          origin: base!,
          "content-type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    const reviewedName = `Reviewed customer ${randomUUID()}`;
    const lead = await makeLead(),
      create = {
        operationId: randomUUID(),
        expectedVersion: 1,
        customer: {
          create: { name: reviewedName, email: null, phone: null },
        },
      };
    for (const who of ["sales", "customers", "crew", "client"]) {
      assert.equal((await call(who, lead)).status, 403);
      assert.equal((await call(who, lead, create)).status, 403);
    }
    assert.equal((await call("anonymous", lead)).status, 401);
    const counts = async () =>
      (
        await pool.query(
          "SELECT (SELECT count(*)::int FROM client) clients,(SELECT count(*)::int FROM property) properties,(SELECT count(*)::int FROM client_access) grants",
        )
      ).rows[0];
    const before = await counts();
    const responses = await Promise.all([
      call("both", lead, create),
      call("both", lead, create),
    ]);
    assert(responses.every((r) => r.status === 200));
    const results = await Promise.all(
      responses.map(async (r) => (await r.json()) as any),
    );
    assert.equal(results[0].clientId, results[1].clientId);
    assert.deepEqual(results.map((r) => r.replayed).sort(), [false, true]);
    const clientId = results[0].clientId;
    const afterCounts = await counts();
    assert.equal(afterCounts.clients, before.clients + 1);
    assert.equal(afterCounts.properties, before.properties);
    assert.equal(afterCounts.grants, before.grants);
    const client = (
      await pool.query(
        "SELECT name,email,phone,quickbooks_id FROM client WHERE id=$1",
        [clientId],
      )
    ).rows[0];
    assert.deepEqual(client, {
      name: reviewedName,
      email: null,
      phone: null,
      quickbooks_id: null,
    });
    const state = (
      await pool.query(
        "SELECT status,version,converted_client_id,converted_property_id,description FROM lead WHERE id=$1",
        [lead],
      )
    ).rows[0];
    assert.equal(state.status, "won");
    assert.equal(state.version, 2);
    assert.equal(state.converted_client_id, clientId);
    assert.equal(state.converted_property_id, null);
    assert.equal(state.description, "Original message");
    const read = await call("both", lead);
    assert.equal(read.headers.get("cache-control"), "private, no-store");
    assert.equal(((await read.json()) as any).clientName, reviewedName);
    assert.equal((await call("owner", lead, create)).status, 409);
    assert.equal(
      (
        await call("both", lead, {
          ...create,
          operationId: randomUUID(),
          expectedVersion: 2,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call("both", lead, {
          ...create,
          customer: { create: { ...create.customer.create, name: "Changed" } },
        })
      ).status,
      409,
    );
    const second = await makeLead();
    assert.equal((await call("both", second, create)).status, 409);
    const duplicate = await makeLead();
    const duplicateResponse = await call("both", duplicate, {
      ...create,
      operationId: randomUUID(),
    });
    assert.equal(duplicateResponse.status, 409);
    assert.match(JSON.stringify(await duplicateResponse.json()), /matching active customer/i);
    assert.equal((await counts()).clients, afterCounts.clients);
    const link = {
      operationId: randomUUID(),
      expectedVersion: 1,
      customer: { existingId: clientId },
    };
    assert.equal(
      (await call("both", second, { ...link, expectedVersion: 2 })).status,
      409,
    );
    assert.equal(
      (await call("both", second, { ...link, propertyId: randomUUID() }))
        .status,
      400,
    );
    assert.equal((await call("both", second, link)).status, 200);
    assert.equal((await counts()).clients, afterCounts.clients);
    assert.equal(
      (
        await call("both", await makeLead("qualified"), {
          ...link,
          operationId: randomUUID(),
        })
      ).status,
      409,
    );
    await pool.query("UPDATE client SET archived=true WHERE id=$1", [clientId]);
    assert.equal(
      (
        await call("both", await makeLead(), {
          ...link,
          operationId: randomUUID(),
        })
      ).status,
      409,
    );
    assert.equal((await call("both", lead, create)).status, 200); // historical receipt remains replayable after archival.
    await assert.rejects(
      pool.query("DELETE FROM lead_customer_onboarding WHERE lead_id=$1", [
        lead,
      ]),
      /immutable/,
    );
    await pool.query("UPDATE client SET archived=false WHERE id=$1", [
      clientId,
    ]);
    const convert = async (body: unknown) =>
      fetch(`${base}/api/v1/leads/${lead}/convert`, {
        method: "POST",
        headers: {
          cookie: users.both.cookie,
          origin: base!,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    assert.equal(
      (
        await convert({
          clientId: randomUUID(),
          propertyName: "Reviewed property",
          address: "Verified address",
        })
      ).status,
      409,
    );
    const conversion = await convert({
      propertyName: "Reviewed property",
      address: "Verified address",
    });
    assert.equal(conversion.status, 200);
    assert.equal(((await conversion.json()) as any).clientId, clientId);
    assert.equal(
      (await pool.query("SELECT status FROM lead WHERE id=$1", [lead])).rows[0]
        .status,
      "won",
    );
    assert.equal((await counts()).clients, afterCounts.clients);
    const audit = (
      await pool.query(
        "SELECT details FROM audit_event WHERE entity_id=$1 AND action='lead.customer_onboarded'",
        [lead],
      )
    ).rows;
    assert.equal(audit.length, 1);
    assert.equal(audit[0].details.name, undefined);
    const contextLead = await makeLead(),
      organization = randomUUID();
    await pool.query(
      "INSERT INTO business_organization(id,display_name,owner_id,client_id) VALUES($1,'Existing business',$2,$3)",
      [organization, users.owner.id, clientId],
    );
    await pool.query("UPDATE lead SET organization_id=$2 WHERE id=$1", [
      contextLead,
      organization,
    ]);
    assert.equal(
      (
        await call("both", contextLead, {
          ...create,
          operationId: randomUUID(),
        })
      ).status,
      409,
    );
    const failLead = await makeLead(),
      fn = "fail_onboarding_" + randomUUID().replaceAll("-", "");
    await pool.query(
      `CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_id='${failLead}' AND NEW.action='lead.customer_onboarded' THEN RAISE EXCEPTION 'Synthetic failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER ${fn} BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION ${fn}()`,
    );
    const failureCounts = await counts();
    try {
      assert.equal(
        (await call("both", failLead, {
          ...create,
          operationId: randomUUID(),
          customer: { create: { ...create.customer.create, name: `Failure-only ${randomUUID()}` } },
        }))
          .status,
        500,
      );
      assert.deepEqual(await counts(), failureCounts);
      assert.equal(
        (
          await pool.query("SELECT converted_client_id FROM lead WHERE id=$1", [
            failLead,
          ])
        ).rows[0].converted_client_id,
        null,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT * FROM lead_customer_onboarding WHERE lead_id=$1",
            [failLead],
          )
        ).rowCount,
        0,
      );
    } finally {
      await pool.query(
        `DROP TRIGGER ${fn} ON audit_event; DROP FUNCTION ${fn}()`,
      );
    }
    await pool.query(
      "UPDATE business_account_access SET capabilities=ARRAY['revenue.sales'] WHERE user_id=$1",
      [users.both.id],
    );
    assert.equal((await call("both", lead, create)).status, 403);
  },
);
