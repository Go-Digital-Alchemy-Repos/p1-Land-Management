import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  receiveCommercialInquiry,
  verifyCommercialSignature,
} from "./commercial-ingress.service";
import {
  commercialSignatureInput,
  commercialIntakeEventSchema,
} from "./commercial-intake-contract";
import { pool } from "./database";
const source = randomUUID(),
  secret = "ab".repeat(32),
  keyId = "synthetic-test";
const event = () => ({
  eventType: "p1.commercial_inquiry.accepted",
  schemaVersion: 1,
  eventId: randomUUID(),
  source: "p1-core",
  sourceInstanceId: source,
  submissionId: randomUUID(),
  acceptedAt: new Date().toISOString(),
  formSlug: "p1-commercial-assessment",
  inquiry: {
    inquiryType: "commercial_site_assessment",
    name: "Synthetic",
    company: "Test Company",
    email: null,
    phone: "7045550100",
    title: null,
    propertyName: null,
    address: "York County",
    propertyType: null,
    acreage: null,
    services: ["general_site_assessment"],
    projectStage: "unknown",
    serviceTiming: "both",
    message: null,
    attribution: { utm_source: "synthetic" },
  },
});
const sign = (
  body: Buffer,
  sentAt = String(Math.floor(Date.now() / 1000)),
) => ({
  keyId,
  sentAt,
  signature: createHmac("sha256", Buffer.from(secret, "hex"))
    .update(
      commercialSignatureInput(
        keyId,
        sentAt,
        createHash("sha256").update(body).digest("hex"),
      ),
    )
    .digest("hex"),
});
process.env.CORE_INGRESS_HMAC_KEYS = JSON.stringify({
  [keyId]: { secretHex: secret, sourceInstanceId: source },
});
test("commercial wire contract copies are identical and signature rejects tampering/expiry", () => {
  assert.equal(
    readFileSync(
      new URL("./commercial-intake-contract.ts", import.meta.url),
      "utf8",
    ),
    readFileSync(
      new URL(
        "../../../../platform/p1-core/shared/commercial-intake-contract.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const body = Buffer.from(JSON.stringify(event()));
  assert.equal(verifyCommercialSignature(body, sign(body)).keyId, keyId);
  assert.throws(
    () => verifyCommercialSignature(Buffer.from("different"), sign(body)),
    /signature_invalid/,
  );
  assert.throws(
    () => verifyCommercialSignature(body, sign(body, "1000000000")),
    /signature_invalid/,
  );
  assert.throws(
    () => verifyCommercialSignature(body, { ...sign(body), signature: "x" }),
    /signature_invalid/,
  );
  assert.throws(
    () =>
      verifyCommercialSignature(body, { ...sign(body), keyId: "constructor" }),
    /issuer_unknown/,
  );
  assert.equal(
    commercialIntakeEventSchema.safeParse({
      ...event(),
      inquiry: {
        ...event().inquiry,
        attribution: { nested: { secret: "no" } },
      },
    }).success,
    false,
  );
});
const testUrl = process.env.COMMERCIAL_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) ||
    u.pathname !== "/commercial_bridge_test" ||
    process.env.DASHBOARD_DATABASE_URL !== testUrl
  )
    throw Error("Explicit isolated commercial_bridge_test required");
}
after(async () => {
  await pool.end();
});
test(
  "commercial receiver real PostgreSQL: identity conflicts/revocation/phone-only/no provisioning",
  { skip: !testUrl },
  async () => {
    const base = event(),
      bytes = Buffer.from(JSON.stringify(base));
    const [a, b] = await Promise.all([
      receiveCommercialInquiry(bytes, sign(bytes)),
      receiveCommercialInquiry(bytes, sign(bytes)),
    ]);
    assert.equal(a.leadId, b.leadId);
    assert.equal([a, b].filter((x) => !x.duplicate).length, 1);
    const lead = (
      await pool.query("SELECT * FROM lead WHERE id=$1", [a.leadId])
    ).rows[0];
    assert.equal(lead.email, null);
    assert.equal(lead.status, "new");
    assert.equal(lead.source, "website_form");
    assert.deepEqual(lead.services, ["general_site_assessment"]);
    await pool.query(
      "UPDATE lead SET next_action='Staff action',status='contacted' WHERE id=$1",
      [a.leadId],
    );
    await receiveCommercialInquiry(bytes, sign(bytes));
    assert.equal(
      (await pool.query("SELECT status FROM lead WHERE id=$1", [a.leadId]))
        .rows[0].status,
      "contacted",
    );
    for (const conflicting of [
      { ...base, inquiry: { ...base.inquiry, company: "Changed" } },
      { ...base, eventId: randomUUID() },
      { ...base, submissionId: randomUUID() },
    ]) {
      const body = Buffer.from(JSON.stringify(conflicting));
      await assert.rejects(
        receiveCommercialInquiry(body, sign(body)),
        /identity_conflict/,
      );
    }
    const second = {
        ...event(),
        inquiry: { ...base.inquiry, propertyName: "Different project" },
      },
      secondBytes = Buffer.from(JSON.stringify(second));
    await receiveCommercialInquiry(secondBytes, sign(secondBytes));
    assert.equal(
      (await pool.query("SELECT count(*) FROM lead")).rows[0].count,
      "2",
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*) FROM audit_event WHERE action='commercial.intake_received'",
        )
      ).rows[0].count,
      "2",
    );
    for (const table of [
      '"user"',
      "client",
      "property",
      "contact",
      "client_access",
    ])
      assert.equal(
        (await pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count,
        "0",
        table + " was auto provisioned",
      );
    const otherSource = Buffer.from(
      JSON.stringify({ ...base, sourceInstanceId: randomUUID() }),
    );
    await assert.rejects(
      receiveCommercialInquiry(otherSource, sign(otherSource)),
      /source_mismatch/,
    );
    await pool.query(
      "UPDATE integration_ingress_key SET enabled=false,revoked_at=now() WHERE key_id=$1",
      [keyId],
    );
    await assert.rejects(
      receiveCommercialInquiry(bytes, sign(bytes)),
      /issuer_revoked/,
    );
    // A failure after lead insertion must roll the entire inbox/lead/audit transaction back.
    await pool.query(
      "UPDATE integration_ingress_key SET enabled=true,revoked_at=NULL WHERE key_id=$1",
      [keyId],
    );
    await pool.query(
      "CREATE FUNCTION fail_commercial_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='commercial.intake_received' THEN RAISE EXCEPTION 'synthetic rollback'; END IF; RETURN NEW; END $$",
    );
    await pool.query(
      "CREATE TRIGGER fail_commercial_audit BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION fail_commercial_audit()",
    );
    const interrupted = Buffer.from(JSON.stringify(event()));
    await assert.rejects(
      receiveCommercialInquiry(interrupted, sign(interrupted)),
      /synthetic rollback/,
    );
    assert.equal(
      (await pool.query("SELECT count(*) FROM lead")).rows[0].count,
      "2",
    );
    await pool.query("DROP TRIGGER fail_commercial_audit ON audit_event");
    await pool.query("DROP FUNCTION fail_commercial_audit()");
    assert.equal(
      (await receiveCommercialInquiry(interrupted, sign(interrupted)))
        .duplicate,
      false,
    );
    // Existing generic leads keep their historical shape and are not constrained to commercial fields.
    await pool.query(
      "INSERT INTO lead(id,name,email,location,description) VALUES($1,'Legacy','legacy@example.test','Region','Inquiry')",
      [randomUUID()],
    );
    await assert.rejects(
      pool.query(
        "INSERT INTO lead(id,name,location,description,inquiry_type) VALUES($1,'No channel','Region','','commercial_site_assessment')",
        [randomUUID()],
      ),
    );
  },
);

test(
  "commercial HTTP ingress rejects browser auth, query strings and oversized raw bodies",
  { skip: !testUrl },
  async () => {
    const express = (await import("express")).default;
    const { commercialIngress } = await import("./commercial-ingress");
    const app = express();
    app.use("/api/integrations/core/v1", commercialIngress);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const port = (server.address() as { port: number }).port,
      url = `http://127.0.0.1:${port}/api/integrations/core/v1/commercial-inquiries`;
    try {
      for (const headers of [
        { cookie: "session=not-service-auth" },
        { origin: "https://dashboard.example" },
      ])
        assert.equal(
          (await fetch(url, { method: "POST", headers, body: "{}" })).status,
          403,
        );
      assert.equal(
        (await fetch(url + "?x=1", { method: "POST", body: "{}" })).status,
        403,
      );
      assert.equal(
        (
          await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "x".repeat(65537),
          })
        ).status,
        413,
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
);

test(
  "commercial queue keyset traverses more than 200 rows with equal and submillisecond timestamps",
  { skip: !testUrl },
  async () => {
    const { listCommercialInquiries } =
      await import("./commercial-queue.service");
    await pool.query(
      "UPDATE lead SET created_at='2026-09-07T08:00:00.123455Z' WHERE inquiry_type='commercial_site_assessment'",
    );
    await pool.query(
      "WITH added AS (INSERT INTO lead(id,name,phone,location,description,inquiry_type,created_at) SELECT gen_random_uuid(),'Pagination fixture','7045550100','Region','','commercial_site_assessment','2026-09-07T08:00:00.123456Z' FROM generate_series(1,205) RETURNING id) INSERT INTO commercial_intake_receipt(id,source_instance_id,submission_id,event_id,schema_version,payload_sha256,accepted_at,lead_id,raw_intake) SELECT gen_random_uuid(),$1,gen_random_uuid(),gen_random_uuid(),1,repeat('0',64),now(),id,'{}'::jsonb FROM added",
      [source],
    );
    const expected = Number(
      (await pool.query("SELECT count(*) FROM commercial_intake_receipt"))
        .rows[0].count,
    );
    const seen = new Set<string>();
    let cursor: string | null = null,
      pages = 0;
    do {
      const page = await listCommercialInquiries({
        limit: 47,
        ...(cursor ? { cursor } : {}),
      });
      for (const row of page.items) {
        assert.equal(seen.has(row.id), false);
        seen.add(row.id);
      }
      cursor = page.nextCursor;
      pages++;
    } while (cursor);
    assert.equal(seen.size, expected);
    assert.ok(pages > 4);
    assert.ok(expected > 200);
    const first = await listCommercialInquiries({ limit: 1 });
    await assert.rejects(
      listCommercialInquiries({ cursor: first.nextCursor, status: "new" }),
      /Reset cursor/,
    );
    const leadId = [...seen][0];
    await pool.query(
      "UPDATE lead SET next_action_due_at=now()-interval '1 day' WHERE id=$1",
      [leadId],
    );
    assert.equal(
      (await listCommercialInquiries({ overdue: "true" })).items.length,
      1,
    );
  },
);

test(
  "mounted legacy and commercial routes enforce roles and conversion advances conflict version",
  { skip: !testUrl },
  async () => {
    const express = (await import("express")).default;
    const { auth } = await import("./auth");
    const { api } = await import("./api");
    const { salesApi } = await import("./sales");
    const { commercialStaffApi } = await import("./commercial-ingress");
    const actors: Record<string, string> = {};
    for (const role of [
      "owner",
      "sales",
      "dispatch",
      "finance",
      "crew",
      "client",
    ]) {
      const id = randomUUID();
      actors[role] = id;
      await pool.query(
        `INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)`,
        [id, role, role + "@synthetic.test"],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [id, role],
      );
    }
    // Identity-only test double: mounted real routes still resolve role from the actual database.
    const original = auth.api.getSession;
    (auth.api as any).getSession = async ({ headers }: any) => ({
      user: {
        id: actors[headers.get("x-test-role")],
        emailVerified: true,
        name: "Synthetic",
      },
      session: {},
    });
    const app = express();
    app.use(express.json());
    app.use("/api/v1", commercialStaffApi, salesApi, api);
    app.use((error: any, _req: any, res: any, _next: any) =>
      res
        .status(error.status || error.statusCode || 500)
        .json({ message: error.message }),
    );
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
    const call = async (
      role: string,
      path: string,
      body?: unknown,
      method = "POST",
    ) =>
      fetch(base + path, {
        method: body ? method : "GET",
        headers: { "x-test-role": role, "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    try {
      for (const role of ["dispatch", "finance"]) {
        const response = await call(role, "/leads");
        assert.equal(response.status, 200);
        const rows = (await response.json()) as any[];
        assert.ok(rows.some((r: any) => r.name === "Legacy"));
        assert.ok(
          rows.every(
            (r: any) => r.inquiry_type !== "commercial_site_assessment",
          ),
        );
        assert.equal((await call(role, "/commercial-inquiries")).status, 403);
      }
      for (const role of ["crew", "client"])
        assert.equal((await call(role, "/leads")).status, 403);
      const row = (
        await pool.query(
          "SELECT * FROM lead WHERE inquiry_type='commercial_site_assessment' LIMIT 1",
        )
      ).rows[0];
      assert.equal(
        (
          await call("sales", `/leads/${row.id}/convert`, {
            propertyName: "Synthetic site",
            address: "Test address",
          })
        ).status,
        409,
      );
      await pool.query(
        "UPDATE lead SET email='confirmed@synthetic.test' WHERE id=$1",
        [row.id],
      );
      assert.equal(
        (
          await call("sales", `/leads/${row.id}/convert`, {
            propertyName: "Synthetic site",
            address: "Test address",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await call(
            "sales",
            `/commercial-inquiries/${row.id}/follow-up`,
            {
              expectedVersion: row.version,
              ownerId: null,
              nextAction: "Stale action",
              nextActionDueAt: null,
              status: "new",
            },
            "PATCH",
          )
        ).status,
        409,
      );
      assert.equal(
        (await pool.query("SELECT count(*) FROM client_access")).rows[0].count,
        "0",
      );
    } finally {
      (auth.api as any).getSession = original;
      await new Promise<void>((r) => server.close(() => r()));
    }
  },
);
