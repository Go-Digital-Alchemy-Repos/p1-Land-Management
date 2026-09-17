import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw Error("Isolated local server required");
after(() => pool.end());
test(
  "Customer note history preserves missing authors, scopes properties and safely replays native creation",
  { skip: !base },
  async () => {
    const owner = randomUUID(),
      staff = randomUUID(),
      sales = randomUUID(),
      crew = randomUUID(),
      portal = randomUUID(),
      client = randomUUID(),
      otherClient = randomUUID(),
      property = randomUUID(),
      otherProperty = randomUUID();
    const headers = new Map<string, Record<string, string>>();
    for (const [id, role, grants] of [
      [owner, "owner", []],
      [staff, "member", ["customers.clients", "customers.properties"]],
      [sales, "member", ["revenue.sales"]],
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
    await pool.query(
      "INSERT INTO client(id,name) VALUES($1,'Client'),($2,'Other')",
      [client, otherClient],
    );
    await pool.query(
      "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Property','Test'),($3,$4,'Other','Test')",
      [property, client, otherProperty, otherClient],
    );
    const call = (
      who: string,
      method = "GET",
      body?: unknown,
      key = client,
      query = "",
    ) =>
      fetch(`${base}/api/v1/clients/${key}/notes${query}`, {
        headers: headers.get(who),
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    for (const who of [sales, crew, portal]) {
      assert.equal((await call(who)).status, 403);
      assert.equal(
        (await call(who, "POST", { body: "Forbidden" })).status,
        403,
      );
    }
    const note = {
      id: randomUUID(),
      body: " Preserve literal <b>text</b>\nNext line ",
      propertyId: property,
    };
    const results = await Promise.all([
      call(staff, "POST", note),
      call(staff, "POST", note),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM audit_event WHERE entity_id=$1 AND action='client_note.created'",
          [note.id],
        )
      ).rows[0].n,
      1,
    );
    assert.equal((await call(owner, "POST", note)).status, 409);
    assert.equal(
      (await call(staff, "POST", { ...note, body: "Changed" })).status,
      409,
    );
    assert.equal(
      (await call(staff, "POST", { ...note, propertyId: undefined })).status,
      409,
    );
    assert.equal((await call(staff, "POST", note, otherClient)).status, 409);
    assert.equal(
      (
        await call(staff, "POST", {
          body: "Bad property",
          propertyId: otherProperty,
        })
      ).status,
      400,
    );
    assert.equal(
      (await call(staff, "POST", { body: "Impersonation", authorId: owner }))
        .status,
      400,
    );
    assert.equal(
      (
        await call(staff, "POST", {
          body: "Spoof source",
          source_note_id: "source",
        })
      ).status,
      400,
    );
    assert.equal(
      (await call(staff, "POST", { body: "Legacy caller remains supported" }))
        .status,
      201,
    );
    const historic = randomUUID();
    await pool.query(
      "INSERT INTO client_note(id,client_id,body,source_instance_id,source_note_id,source_author_id) VALUES($1,$2,'Historical note','synthetic','source-note','deleted-user')",
      [historic, client],
    );
    await assert.rejects(
      pool.query(
        "INSERT INTO client_note(id,client_id,body) VALUES($1,$2,'Invalid missing author')",
        [randomUUID(), client],
      ),
      /client_note_origin/,
    );
    await assert.rejects(
      pool.query(
        "INSERT INTO client_note(id,client_id,body,source_instance_id,source_note_id) VALUES($1,$2,'Duplicate','synthetic','source-note')",
        [randomUUID(), client],
      ),
      /unique/,
    );
    await assert.rejects(
      pool.query("UPDATE client_note SET author_id=$2 WHERE id=$1", [
        historic,
        owner,
      ]),
      /append-only/,
    );
    await assert.rejects(
      pool.query("DELETE FROM client_note WHERE id=$1", [historic]),
      /append-only/,
    );
    for (const path of [
      `/clients/${client}/workspace`,
      `/properties/${property}/workspace`,
    ]) {
      const response = await fetch(base + "/api/v1" + path, {
        headers: headers.get(staff),
      });
      assert.equal(response.status, 200);
      const data = (await response.json()) as {
        notes: Array<{
          id: string;
          author_name: string | null;
          imported: boolean;
        }>;
      };
      const entry = data.notes.find((n) => n.id === historic);
      assert(entry);
      assert.equal(entry.author_name, null);
      assert.equal(entry.imported, true);
    }
    await pool.query("UPDATE property SET archived=true WHERE id=$1", [
      property,
    ]);
    assert.equal((await call(staff, "POST", note)).status, 200);
    assert.equal(
      (await call(staff, "POST", { ...note, id: randomUUID() })).status,
      400,
    );
    await pool.query(
      "INSERT INTO client_note(id,client_id,body,source_instance_id,source_note_id,created_at) SELECT gen_random_uuid(),$1,'Note '||i,'synthetic','page-'||i,'2021-01-01T00:00:00Z'::timestamptz+i*interval '1 microsecond' FROM generate_series(1,105) i",
      [client],
    );
    const seen: string[] = [];
    let cursor: string | null = null,
      firstCursor = "";
    do {
      const response = await call(
        staff,
        "GET",
        undefined,
        client,
        "?limit=30" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      );
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const page = (await response.json()) as {
        items: Array<{
          id: string;
          body: string;
          author_name: string | null;
          imported: boolean;
        }>;
        nextCursor: string | null;
      };
      seen.push(...page.items.map((n) => n.id));
      cursor = page.nextCursor;
      if (!firstCursor && cursor) firstCursor = cursor;
      const native = page.items.find((n) => n.id === note.id);
      if (native) {
        assert.equal(native.body, note.body.trim());
        assert.equal(native.imported, false);
      }
      assert(page.items.every((n) => !("source_author_id" in n)));
    } while (cursor);
    assert.equal(seen.length, 108);
    assert.equal(new Set(seen).size, 108);
    assert.equal(
      (
        await call(
          staff,
          "GET",
          undefined,
          otherClient,
          "?cursor=" + encodeURIComponent(firstCursor),
        )
      ).status,
      400,
    );
    assert.equal(
      (await call(staff, "GET", undefined, client, "?limit=101")).status,
      400,
    );
    // A failed audit cannot leave an unaudited note behind.
    const rejected = randomUUID();
    await pool.query(
      "CREATE FUNCTION test_reject_customer_note_audit() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Synthetic note audit failure'; END; $$ LANGUAGE plpgsql",
    );
    await pool.query(
      `CREATE TRIGGER test_reject_customer_note_audit BEFORE INSERT ON audit_event FOR EACH ROW WHEN (NEW.entity_id='${rejected}') EXECUTE FUNCTION test_reject_customer_note_audit()`,
    );
    try {
      assert.equal(
        (await call(staff, "POST", { id: rejected, body: "Must roll back" }))
          .status,
        500,
      );
      assert.equal(
        (await pool.query("SELECT id FROM client_note WHERE id=$1", [rejected]))
          .rowCount,
        0,
      );
    } finally {
      await pool.query(
        "DROP TRIGGER test_reject_customer_note_audit ON audit_event",
      );
      await pool.query("DROP FUNCTION test_reject_customer_note_audit()");
    }
    await pool.query(
      "UPDATE business_account_access SET capabilities='{}' WHERE user_id=$1",
      [staff],
    );
    assert.equal((await call(staff)).status, 403);
    assert.equal((await call(staff, "POST", note)).status, 403);
    await pool.query("UPDATE client SET archived=true WHERE id=$1", [client]);
    assert.equal((await call(owner)).status, 404);
    assert.equal((await call(owner, "POST", { body: "Archived" })).status, 404);
  },
);
