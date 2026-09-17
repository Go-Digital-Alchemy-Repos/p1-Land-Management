import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { pool } from "./database";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw Error("Disposable local server required");
after(() => pool.end());
test(
  "General inquiry follow-up shares commercial concurrency and grants without triggering onboarding",
  { skip: !base },
  async () => {
    const owner = randomUUID(),
      sales = randomUUID(),
      customer = randomUUID(),
      legacy = randomUUID(),
      crew = randomUUID(),
      portal = randomUUID(),
      lead = randomUUID(),
      commercial = randomUUID();
    const headers = new Map<string, Record<string, string>>();
    for (const [id, role, grants] of [
      [owner, "owner", []],
      [sales, "member", ["revenue.sales"]],
      [customer, "member", ["customers.clients"]],
      [legacy, "manager", []],
      [crew, "crew", []],
      [portal, "client", []],
    ] as Array<[string, string, string[]]>) {
      const token = randomUUID();
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [id, role, id + "@example.test"],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [id, role],
      );
      if (grants.length)
        await pool.query(
          "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)",
          [id, grants],
        );
      await pool.query(
        'INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
        [randomUUID(), token, id],
      );
      const sign = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
        .update(token)
        .digest("base64");
      headers.set(id, {
        cookie:
          "p1-dashboard.session_token=" +
          encodeURIComponent(token + "." + sign),
        origin: base!,
        "content-type": "application/json",
      });
    }
    const name = "Follow-up fixture " + lead;
    await pool.query(
      "INSERT INTO lead(id,name,email,location,description,inquiry_type) VALUES($1,$2,'test@example.test','Test','Original description','general'),($3,'Commercial fixture','commercial@example.test','Test','Original commercial','commercial_site_assessment')",
      [lead, name, commercial],
    );
    const call = (
      who: string,
      key = lead,
      body?: unknown,
      commercialRoute = false,
    ) =>
      fetch(
        `${base}/api/v1/${commercialRoute ? "commercial-inquiries" : "leads"}/${key}/follow-up`,
        {
          headers: headers.get(who),
          method: body === undefined ? "GET" : "PATCH",
          body: body === undefined ? undefined : JSON.stringify(body),
        },
      );
    const patch = {
      expectedVersion: 1,
      ownerId: sales,
      nextAction: "Call the customer",
      nextActionDueAt: "2030-01-01T10:00:00.123Z",
      status: "contacted",
    };
    for (const who of [customer, legacy, crew, portal]) {
      assert.equal((await call(who)).status, 403);
      assert.equal((await call(who, lead, patch)).status, 403);
    }
    const response = await call(sales);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const initial = (await response.json()) as any;
    assert.equal(initial.lead.version, 1);
    assert.equal(initial.lead.name, name);
    assert(!("email" in initial.lead));
    assert(!("description" in initial.lead));
    assert(initial.owners.some((u: any) => u.id === owner));
    assert(initial.owners.some((u: any) => u.id === sales));
    assert(
      !initial.owners.some((u: any) =>
        [customer, legacy, crew, portal].includes(u.id),
      ),
    );
    assert(
      initial.owners.every(
        (u: any) => Object.keys(u).sort().join(",") === "id,name",
      ),
    );
    assert.equal(
      (await call(sales, lead, { ...patch, ownerId: customer })).status,
      400,
    );
    assert.equal(
      (await call(sales, lead, { ...patch, status: "invalid" })).status,
      400,
    );
    assert.equal(
      (await call(sales, lead, { ...patch, convertedClientId: randomUUID() }))
        .status,
      400,
    );
    assert.equal(
      (await call(sales, lead, { ...patch, nextAction: " " })).status,
      400,
    );
    assert.equal((await call(sales, lead, patch, true)).status, 409); // Commercial route cannot update a general inquiry.
    const writes = await Promise.all([
      call(sales, lead, patch),
      call(owner, lead, { ...patch, nextAction: "Other concurrent edit" }),
    ]);
    assert.deepEqual(writes.map((r) => r.status).sort(), [200, 409]);
    const saved = ((await (await call(sales)).json()) as any).lead;
    assert.equal(saved.version, 2);
    assert.equal(saved.next_action_due_at, patch.nextActionDueAt);
    const wonResponse = await call(owner, lead, {
      ...patch,
      expectedVersion: 2,
      status: "won",
      nextAction: "Arrange explicit onboarding",
    });
    assert.equal(wonResponse.status, 200);
    const won = (await wonResponse.json()) as any;
    assert.equal(won.status, "won");
    assert.equal(won.version, 3);
    assert.equal(won.converted_client_id, null);
    assert.equal(won.converted_property_id, null);
    assert(!("email" in won));
    assert.equal(
      (await pool.query("SELECT id FROM client WHERE name=$1", [name]))
        .rowCount,
      0,
    );
    assert.equal(
      (await pool.query("SELECT description FROM lead WHERE id=$1", [lead]))
        .rows[0].description,
      "Original description",
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM audit_event WHERE entity_id=$1 AND action='lead.followup_updated'",
          [lead],
        )
      ).rows[0].n,
      2,
    );
    // Generic and commercial routes share the same version and preserve the old commercial audit action.
    assert.equal((await call(sales, commercial, patch, true)).status, 200);
    assert.equal((await call(sales, commercial, patch)).status, 409);
    assert.equal(
      (await call(sales, commercial, { ...patch, expectedVersion: 2 })).status,
      200,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM audit_event WHERE entity_id=$1 AND action='commercial.followup_updated'",
          [commercial],
        )
      ).rows[0].n,
      2,
    );
    await pool.query("UPDATE staff_profile SET active=false WHERE user_id=$1", [
      sales,
    ]);
    assert.equal(
      (await call(owner, lead, { ...patch, expectedVersion: 3 })).status,
      400,
    );
    assert.equal(
      (
        await call(owner, lead, {
          ...patch,
          expectedVersion: 3,
          ownerId: null,
          status: "lost",
        })
      ).status,
      200,
    );
    const view = (await (await call(owner)).json()) as any;
    assert(!view.owners.some((u: any) => u.id === sales));
    // Audit failure rolls back the lead version and follow-up fields.
    await pool.query(
      "CREATE FUNCTION test_reject_followup_audit() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Synthetic follow-up audit failure'; END; $$ LANGUAGE plpgsql",
    );
    await pool.query(
      `CREATE TRIGGER test_reject_followup_audit BEFORE INSERT ON audit_event FOR EACH ROW WHEN (NEW.entity_id='${lead}' AND NEW.action='lead.followup_updated') EXECUTE FUNCTION test_reject_followup_audit()`,
    );
    try {
      assert.equal(
        (
          await call(owner, lead, {
            ...patch,
            expectedVersion: 4,
            ownerId: null,
            status: "proposal",
          })
        ).status,
        500,
      );
      const still = (await (await call(owner)).json()) as any;
      assert.equal(still.lead.version, 4);
      assert.equal(still.lead.status, "lost");
    } finally {
      await pool.query(
        "DROP TRIGGER test_reject_followup_audit ON audit_event",
      );
      await pool.query("DROP FUNCTION test_reject_followup_audit()");
    }
    assert.equal((await call(owner, randomUUID())).status, 404);
    assert.equal(
      (await call(owner, randomUUID(), { ...patch, ownerId: null })).status,
      409,
    );
  },
);
