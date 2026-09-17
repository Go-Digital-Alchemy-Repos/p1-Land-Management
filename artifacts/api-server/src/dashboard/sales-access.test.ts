import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { pool } from "./database";

const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw Error("Disposable local test server required");
after(() => pool.end());

test(
  "sales APIs use grants across legacy and current routes, with independent template maintenance",
  { skip: !base },
  async () => {
    async function account(role: string, capabilities: string[]) {
      const id = randomUUID(),
        sessionId = randomUUID(),
        token = randomUUID();
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [id, "Synthetic sales account", `${id}@example.test`],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [id, role],
      );
      await pool.query(
        "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)",
        [id, capabilities],
      );
      await pool.query(
        'INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval \'1 hour\',$2,$3)',
        [sessionId, token, id],
      );
      const signed =
        token +
        "." +
        createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
          .update(token)
          .digest("base64");
      return {
        id,
        cookie: `p1-dashboard.session_token=${encodeURIComponent(signed)}`,
      };
    }
    const legacy = await account("manager", []),
      sales = await account("member", ["revenue.sales"]),
      templates = await account("member", [
        "revenue.agreement-templates.manage",
      ]),
      reporting = await account("member", ["marketing.analytics.view"]);
    async function call(who: { cookie: string }, path: string, body?: unknown) {
      return fetch(`${base}/api/v1${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Cookie: who.cookie,
          Origin: base!,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    }
    for (const who of [legacy, reporting, templates]) {
      for (const path of [
        "/leads",
        "/commercial-inquiries",
        "/estimates",
        `/estimates/${randomUUID()}/document`,
      ])
        assert.equal((await call(who, path)).status, 403, path);
      assert.equal(
        (
          await call(who, "/leads", {
            name: "Synthetic",
            email: "fixture@example.test",
            location: "Test",
            description: "Synthetic inquiry",
          })
        ).status,
        403,
      );
    }
    for (const path of [
      "/leads",
      "/commercial-inquiries",
      "/estimates",
      "/agreement-templates",
    ])
      assert.equal((await call(sales, path)).status, 200, path);
    assert.equal(
      (
        await call(sales, "/agreement-templates", {
          name: "Fixture",
          body: "Synthetic template content",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(templates, "/agreement-templates", {
          name: "Fixture",
          body: "Synthetic template content",
        })
      ).status,
      201,
    );
    for (const who of [legacy, reporting]) {
      for (const path of ["/clients", "/properties", "/staff", "/work-orders", "/schedule", "/recurring-services", "/projects", "/inspections", "/expenses", "/billing", "/requests", "/service-agreements", "/quickbooks/invoices", "/workspace/references"]) {
        assert.equal((await call(who, path)).status, 403, `${path} rejects ${who.id}`);
      }
    }
    const references = await call(sales, "/workspace/references");
    assert.equal(references.status, 200);
    const refs = await references.json() as { clients: Record<string, unknown>[]; properties: Record<string, unknown>[]; staff: Record<string, unknown>[] };
    for (const row of refs.clients) assert.deepEqual(Object.keys(row).sort(), ["id", "name"]);
    for (const row of refs.properties) assert.deepEqual(Object.keys(row).sort(), ["address", "client_id", "id", "name"]);
    for (const row of refs.staff) assert.deepEqual(Object.keys(row).sort(), ["canAssignWork", "canOwnSales", "id", "name", "role"]);
    assert(refs.staff.some(row => row.id === sales.id && row.canOwnSales === true));
    assert(!refs.staff.some(row => row.id === legacy.id));
    assert.equal((await call(reporting, "/workspace/references")).status, 403);
    await pool.query(
      "UPDATE business_account_access SET capabilities='{}' WHERE user_id=$1",
      [sales.id],
    );
    assert.equal(
      (await call(sales, "/leads")).status,
      403,
      "grants are re-read for an existing session",
    );
  },
);
