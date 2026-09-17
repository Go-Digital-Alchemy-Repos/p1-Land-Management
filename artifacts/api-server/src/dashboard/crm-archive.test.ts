import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw Error("Isolated local server required");
after(() => pool.end());
test(
  "CRM archive reads isolate area grants and parents, preserve literal values, and paginate complete source identities",
  { skip: !base },
  async () => {
    const users: Record<string, Record<string, string>> = {};
    for (const role of [
      "owner",
      "sales",
      "customers",
      "member",
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
      if (["sales", "customers"].includes(role))
        await pool.query(
          "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)",
          [id, [role === "sales" ? "revenue.sales" : "customers.clients"]],
        );
      await pool.query(
        'INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
        [randomUUID(), token, id],
      );
      const sig = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
        .update(token)
        .digest("base64");
      users[role] = {
        id,
        cookie:
          "p1-dashboard.session_token=" + encodeURIComponent(token + "." + sig),
      };
    }
    const lead = randomUUID(),
      other = randomUUID(),
      client = randomUUID(),
      instance = randomUUID(),
      second = randomUUID();
    await pool.query(
      "INSERT INTO lead(id,name,location,description) VALUES($1,'Archive','Test','Test'),($2,'Other','Test','Test')",
      [lead, other],
    );
    await pool.query(
      "INSERT INTO client(id,name) VALUES($1,'Archive customer')",
      [client],
    );
    const payload =
      '{"name":"Literal <script>alert(1)</script>","nested":{"number":9007199254740993,"decimal":0.1234567890123456789},"empty":null}';
    for (let i = 0; i < 57; i++)
      await pool.query(
        `INSERT INTO crm_source_record(source_instance_id,source_table,source_id,source_sha256,source_payload,lead_id,native_record_id,projection_sha256,review_sha256,imported_by_id,imported_at) VALUES($1,'leadNotes',$2,$3,$4,$5,$6,$3,$3,$7,'2020-02-29T12:34:56.123456Z')`,
        [
          i % 2 ? instance : second,
          String(i).padStart(3, "0"),
          "a".repeat(64),
          payload,
          lead,
          randomUUID(),
          users.owner.id,
        ],
      );
    await pool.query(
      `INSERT INTO crm_source_record(source_instance_id,source_table,source_id,source_sha256,source_payload,client_id,projection_sha256,review_sha256,imported_by_id) VALUES($1,'clients','original',$2,'{"name":"Private customer"}',$3,$2,$2,$4)`,
      [instance, "b".repeat(64), client, users.owner.id],
    );
    const call = (
      role: string,
      kind = "leads",
      id = lead,
      suffix = "",
      method = "GET",
    ) =>
      fetch(`${base}/api/v1/${kind}/${id}/crm-archive${suffix}`, {
        method,
        headers: users[role]
          ? { cookie: users[role].cookie, origin: base! }
          : {},
      });
    assert.equal((await call("anonymous")).status, 401);
    for (const role of ["customers", "member", "crew", "client"])
      assert.equal((await call(role)).status, 403);
    for (const role of ["sales", "member", "crew", "client"])
      assert.equal((await call(role, "clients", client)).status, 403);
    assert.equal((await call("customers", "clients", client)).status, 200);
    assert.equal((await call("owner", "clients", client)).status, 200);
    let cursor: string | null = null;
    const records: any[] = [];
    do {
      const response = await call(
        "sales",
        "leads",
        lead,
        cursor ? "?limit=7&cursor=" + encodeURIComponent(cursor) : "?limit=7",
      );
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const page = (await response.json()) as {
        items: any[];
        nextCursor: string | null;
      };
      records.push(...page.items);
      cursor = page.nextCursor;
      if (cursor && records.length === 7) {
        assert.equal(
          (
            await call(
              "sales",
              "leads",
              other,
              "?cursor=" + encodeURIComponent(cursor),
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await call(
              "owner",
              "clients",
              client,
              "?cursor=" + encodeURIComponent(cursor),
            )
          ).status,
          400,
        );
      }
    } while (cursor);
    assert.equal(records.length, 57);
    assert.equal(
      new Set(records.map((r) => r.sourceInstanceId + ":" + r.sourceId)).size,
      57,
    );
    assert.deepEqual(
      Object.keys(records[0]).sort(),
      [
        "collection",
        "importedAt",
        "sourceId",
        "sourceInstanceId",
        "sourceSha256",
      ].sort(),
    );
    assert.equal(records[0].importedAt, "2020-02-29T12:34:56.123456Z");
    const params = new URLSearchParams({
      sourceInstanceId: records[0].sourceInstanceId,
      collection: records[0].collection,
      sourceId: records[0].sourceId,
    });
    const detail = await call("sales", "leads", lead, "/record?" + params);
    assert.equal(detail.status, 200);
    assert.equal(detail.headers.get("cache-control"), "private, no-store");
    const result = (await detail.json()) as {
      sourceJson: string;
      importedById?: string;
    };
    assert.match(result.sourceJson, /9007199254740993/);
    assert.match(result.sourceJson, /0.1234567890123456789/);
    assert.match(result.sourceJson, /<script>/);
    assert.match(result.sourceJson, /"empty": null/);
    assert.equal(result.importedById, undefined);
    assert.equal(
      (await call("sales", "leads", other, "/record?" + params)).status,
      404,
    );
    assert.equal(
      (await call("customers", "clients", client, "/record?" + params)).status,
      404,
    );
    for (const query of [
      "?limit=51",
      "?cursor=invalid",
      "?unknown=x",
      "/record?sourceInstanceId=x&collection=bad&sourceId=x",
    ])
      assert.equal((await call("owner", "leads", lead, query)).status, 400);
    assert.equal((await call("owner", "leads", randomUUID())).status, 404);
    assert.equal((await call("owner", "leads", other)).status, 200);
    for (const method of ["POST", "PATCH", "DELETE"])
      assert.equal(
        (await call("owner", "leads", lead, "", method)).status,
        404,
      );
    await pool.query(
      "UPDATE business_account_access SET capabilities='{}' WHERE user_id=$1",
      [users.sales.id],
    );
    assert.equal((await call("sales")).status, 403);
    assert.equal(
      (await call("sales", "leads", lead, "/record?" + params)).status,
      403,
    );
  },
);
