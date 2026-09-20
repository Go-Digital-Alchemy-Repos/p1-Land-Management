import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { pool } from "./database";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw Error("Disposable local server required");
after(() => pool.end());
test(
  "Inquiry contact corrections preserve history, reject stale edits and isolate access",
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
    const original = {
      name: "Original contact",
      email: "first@example.test",
      phone: null,
      location: "Original site",
      description: "Original intake",
      reported_company_name: null,
    };
    await pool.query(
      "INSERT INTO lead(id,name,email,location,description) VALUES($1,$2,$3,$4,$5)",
      [
        lead,
        original.name,
        original.email,
        original.location,
        original.description,
      ],
    );
    const call = (who: string, path = "", body?: unknown) =>
      fetch(`${base}/api/v1/leads/${lead}/details${path}`, {
        headers: headers.get(who),
        method: body === undefined ? "GET" : "PATCH",
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    const changed = {
      ...original,
      name: "Corrected contact",
      phone: "+1 555 0100",
      reported_company_name: "Example Company",
      expectedVersion: 1,
    };
    for (const who of [customer, legacy, crew, portal]) {
      assert.equal((await call(who)).status, 403);
      assert.equal((await call(who, "/history")).status, 403);
      assert.equal((await call(who, "", changed)).status, 403);
    }
    const first = await call(sales);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("cache-control"), "private, no-store");
    assert.equal(((await first.json()) as any).version, 1);
    let history = (await (await call(sales, "/history")).json()) as any;
    assert.equal(history.items.length, 1);
    assert.deepEqual(history.items[0].fields, original);
    assert.equal(history.items[0].kind, "created");
    for (const invalid of [
      { ...changed, name: " " },
      { ...changed, email: "bad" },
      { ...changed, status: "won" },
      { ...changed, actorId: owner },
      { ...changed, description: "x".repeat(10001) },
    ])
      assert.equal((await call(sales, "", invalid)).status, 400);
    const concurrent = await Promise.all([
      call(sales, "", changed),
      call(owner, "", { ...changed, name: "Other contact" }),
    ]);
    assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
    const saved = (await (await call(sales)).json()) as any;
    assert.equal(saved.version, 2);
    assert.equal(
      (await call(sales, "", { ...saved, expectedVersion: 2 })).status,
      400,
    ); // Server fields are never writable.
    const { id, version, submittedContext, ...savedFields } = saved;
    assert.equal(
      (await call(sales, "", { ...savedFields, expectedVersion: 2 })).status,
      200,
    ); // No-op retains revision.
    assert.equal(((await (await call(sales)).json()) as any).version, 2);
    history = (await (await call(sales, "/history?limit=1")).json()) as any;
    assert.equal(history.nextBeforeVersion, 2);
    assert.equal(history.items[0].kind, "edited");
    assert(history.items[0].actor_name);
    assert(!("actor_id" in history.items[0]));
    const older = (await (
      await call(sales, "/history?beforeVersion=2")
    ).json()) as any;
    assert.equal(older.items[0].version, 1);
    assert.deepEqual(older.items[0].fields, original);
    const record = (
      await pool.query(
        "SELECT status,converted_client_id,converted_property_id,source FROM lead WHERE id=$1",
        [lead],
      )
    ).rows[0];
    assert.deepEqual(record, {
      status: "new",
      converted_client_id: null,
      converted_property_id: null,
      source: null,
    });
    await assert.rejects(
      pool.query(
        "UPDATE lead_detail_revision SET fields='{}' WHERE lead_id=$1",
        [lead],
      ),
      /append-only/,
    );
    await assert.rejects(
      pool.query("DELETE FROM lead_detail_revision WHERE lead_id=$1", [lead]),
      /append-only/,
    );
    await assert.rejects(
      pool.query("UPDATE lead SET name='Unversioned change' WHERE id=$1", [
        lead,
      ]),
      /version must advance/,
    );
    await pool.query(
      "UPDATE lead SET status='contacted',version=version+1 WHERE id=$1",
      [lead],
    );
    assert.equal(
      (await call(sales, "", { ...changed, expectedVersion: 2 })).status,
      409,
    );
    await pool.query(
      "CREATE FUNCTION test_reject_detail_audit() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Synthetic audit failure'; END; $$ LANGUAGE plpgsql",
    );
    await pool.query(
      `CREATE TRIGGER test_reject_detail_audit BEFORE INSERT ON audit_event FOR EACH ROW WHEN (NEW.entity_id='${lead}' AND NEW.action='lead.details_updated') EXECUTE FUNCTION test_reject_detail_audit()`,
    );
    try {
      assert.equal(
        (
          await call(sales, "", {
            ...changed,
            name: "Audit failure",
            expectedVersion: 3,
          })
        ).status,
        500,
      );
      assert.equal(((await (await call(sales)).json()) as any).version, 3);
      assert.equal(
        ((await (await call(sales, "/history")).json()) as any).items.length,
        2,
      );
    } finally {
      await pool.query("DROP TRIGGER test_reject_detail_audit ON audit_event");
      await pool.query("DROP FUNCTION test_reject_detail_audit()");
    }
    assert.equal((await call(sales, "/history?limit=101")).status, 400);
    assert.equal((await call(sales, "/history?beforeVersion=bad")).status, 400);
    for (let n = 3; n < 38; n++)
      assert.equal(
        (
          await call(sales, "", {
            ...changed,
            name: "Revision " + n,
            expectedVersion: n,
          })
        ).status,
        200,
      );
    const page = (await (await call(sales, "/history")).json()) as any;
    assert.equal(page.items.length, 30);
    assert(page.nextBeforeVersion);
    const tail = (await (
      await call(sales, "/history?beforeVersion=" + page.nextBeforeVersion)
    ).json()) as any;
    assert.equal(
      new Set([...page.items, ...tail.items].map((r) => r.version)).size,
      37,
    );
    assert.equal(tail.nextBeforeVersion, null);
    const audit = (
      await pool.query(
        "SELECT details FROM audit_event WHERE entity_id=$1 AND action='lead.details_updated'",
        [lead],
      )
    ).rows;
    assert(
      audit.every(
        (r) =>
          Object.keys(r.details).sort().join(",") === "changedFields,version",
      ),
    );
    await pool.query(
      "UPDATE business_account_access SET capabilities='{}' WHERE user_id=$1",
      [sales],
    );
    assert.equal((await call(sales)).status, 403);
    assert.equal((await call(sales, "/history")).status, 403);
    assert.equal((await call(sales, "", changed)).status, 403);
  },
);

test(
  "Detail history migration preserves populated legacy values without pretending they are original intake",
  { skip: !base },
  async () => {
    const { readFile } = await import("node:fs/promises");
    const migration = await readFile(
      new URL(
        "../../migrations/dashboard/0043_lead_detail_history.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const c = await pool.connect(),
      schema = "detail_migration_" + randomUUID().replaceAll("-", "");
    try {
      await c.query("BEGIN");
      await c.query(`CREATE SCHEMA ${schema}`);
      await c.query(`SET LOCAL search_path TO ${schema}`);
      await c.query('CREATE TABLE "user"(id text PRIMARY KEY)');
      await c.query(
        "CREATE TABLE lead(id uuid PRIMARY KEY,version integer NOT NULL,name text,email text,phone text,location text,description text,reported_company_name text)",
      );
      const id = randomUUID();
      await c.query(
        "INSERT INTO lead VALUES($1,7,'Existing contact',NULL,'555','Site','Existing message','Company')",
        [id],
      );
      await c.query(migration);
      const baseline = (await c.query("SELECT * FROM lead_detail_revision"))
        .rows[0];
      assert.equal(baseline.version, 7);
      assert.equal(baseline.kind, "baseline");
      assert.equal(baseline.actor_id, null);
      assert.equal(baseline.fields.description, "Existing message");
      await c.query(
        "UPDATE lead SET description='Corrected message',version=8 WHERE id=$1",
        [id],
      );
      const history = (
        await c.query(
          "SELECT version,kind,fields FROM lead_detail_revision ORDER BY version",
        )
      ).rows;
      assert.equal(history.length, 2);
      assert.equal(history[0].fields.description, "Existing message");
      assert.equal(history[1].fields.description, "Corrected message");
      assert.equal(history[1].kind, "edited");
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
  },
);
