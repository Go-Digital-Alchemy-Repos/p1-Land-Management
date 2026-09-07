import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./database";
import {
  saveProspectContext,
  readProspectContext,
  reviewProspectContact,
  searchProspectContext,
} from "./prospect-context.service";
const testUrl = process.env.COMMERCIAL_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (
    !["localhost", "127.0.0.1"].includes(u.hostname) ||
    u.pathname != "/commercial_bridge_test" ||
    testUrl !== process.env.DASHBOARD_DATABASE_URL
  )
    throw Error("Disposable fixture required");
}
after(() => pool.end());
test(
  "prospect linking, correction and every operational boundary on actual PostgreSQL and mounted routers",
  { skip: !testUrl },
  async () => {
    const actors: Record<string, any> = {};
    for (const role of [
      "owner",
      "manager",
      "sales",
      "dispatch",
      "finance",
      "crew",
      "client",
    ]) {
      const id = randomUUID();
      actors[role] = { id, name: role, role };
      await pool.query(
        `INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)`,
        [id, role, id + "@synthetic.test"],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [id, role],
      );
    }
    const ownerSession = randomUUID();
    await pool.query(
      `INSERT INTO session(id,"userId",token,"expiresAt") VALUES($1,$2,$3,now()+interval '1 day')`,
      [ownerSession, actors.owner.id, randomUUID()],
    );
    await pool.query("INSERT INTO session_assurance(session_id) VALUES($1)", [
      ownerSession,
    ]);
    const a = actors.sales,
      leadId = randomUUID();
    await pool.query(
      "INSERT INTO lead(id,name,phone,location,description,inquiry_type) VALUES($1,'Original','7045550100','Region','Original','commercial_site_assessment')",
      [leadId],
    );
    const raw = { name: "Original", phone: "7045550100" };
    await pool.query(
      "INSERT INTO commercial_intake_receipt(id,source_instance_id,submission_id,event_id,schema_version,payload_sha256,accepted_at,lead_id,raw_intake) VALUES($1,$2,$3,$4,1,$5,now(),$6,$7)",
      [
        randomUUID(),
        randomUUID(),
        randomUUID(),
        randomUUID(),
        "0".repeat(64),
        leadId,
        raw,
      ],
    );
    const request = {
      operationId: randomUUID(),
      expectedVersion: 1,
      organization: { create: { displayName: "Prospect organization" } },
      contact: {
        create: {
          name: "Reviewed person",
          email: null,
          phone: "7045550100",
          source: "Direct conversation",
        },
      },
      contactRole: "requester",
      title: null,
      source: "Staff review",
      property: {
        create: {
          name: "Private prospect",
          address: "York region",
          locationPrecision: "region",
          acreage: null,
        },
      },
      propertyRole: "prospective_customer",
    };
    const [linked, duplicate] = await Promise.all([
      saveProspectContext(a, leadId, request),
      saveProspectContext(a, leadId, request),
    ]);
    assert.deepEqual(linked, duplicate);
    await assert.rejects(
      saveProspectContext(a, leadId, { ...request, source: "Changed" }),
      /Operation conflict/,
    );
    await assert.rejects(
      saveProspectContext(a, leadId, { ...request, operationId: randomUUID() }),
      /Inquiry changed/,
    );
    for (const table of [
      "client",
      "client_access",
      "outbox",
      "work_order",
      "billing_draft",
    ])
      assert.equal(
        (await pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count,
        "0",
        table,
      );
    assert.equal(
      (await pool.query("SELECT count(*) FROM business_organization")).rows[0]
        .count,
      "1",
    );
    const p = linked.propertyId!;
    const corrected = await reviewProspectContact(a, leadId, {
      expectedVersion: 2,
      contactVersion: 1,
      contact: {
        name: "Confirmed person",
        email: "confirmed@example.test",
        phone: "7045550100",
        source: "Direct correspondence",
      },
    });
    assert.equal(corrected.version, 3);
    assert.deepEqual(
      (await readProspectContext(a, leadId)).intake.raw_intake,
      raw,
    );
    assert.equal(
      (await pool.query("SELECT name,email FROM lead WHERE id=$1", [leadId]))
        .rows[0].name,
      "Original",
    );
    const another = randomUUID();
    await pool.query(
      "INSERT INTO lead(id,name,phone,location,description,inquiry_type) VALUES($1,'Second','7045550100','Region','','commercial_site_assessment')",
      [another],
    );
    const reuse = {
      ...request,
      operationId: randomUUID(),
      organization: { existingId: linked.organizationId },
      contact: { existingId: linked.contactId },
      property: { existingId: p },
    };
    await saveProspectContext(a, another, reuse);
    assert.equal(
      (await pool.query("SELECT count(*) FROM property")).rows[0].count,
      "1",
    );
    await pool.query("UPDATE property SET archived=true WHERE id=$1", [p]);
    await assert.rejects(
      saveProspectContext(a, another, {
        ...reuse,
        operationId: randomUUID(),
        expectedVersion: 2,
      }),
      /Property does not match/,
    );
    await pool.query("UPDATE property SET archived=false WHERE id=$1", [p]);
    for (const role of ["dispatch", "finance", "crew", "client"]) {
      await assert.rejects(
        readProspectContext(actors[role], leadId),
        /Access denied/,
      );
      await assert.rejects(
        searchProspectContext(actors[role], { kind: "properties" }),
        /Access denied/,
      );
    }
    await assert.rejects(
      pool.query(
        "INSERT INTO property(id,name,address) VALUES($1,'Invalid','Region')",
        [randomUUID()],
      ),
    );
    await assert.rejects(
      pool.query("INSERT INTO contact(id,name) VALUES($1,'No channel')", [
        randomUUID(),
      ]),
    );
    const customer = randomUUID(),
      operational = randomUUID();
    await pool.query(
      "INSERT INTO client(id,name) VALUES($1,'Existing customer')",
      [customer],
    );
    await pool.query(
      "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Existing operational','Address')",
      [operational, customer],
    );
    await pool.query(
      "INSERT INTO client_access(user_id,client_id) VALUES($1,$2)",
      [actors.client.id, customer],
    );
    const claimedOrganization = randomUUID();
    await pool.query(
      "INSERT INTO business_organization(id,display_name,client_id,owner_id) VALUES($1,'Existing business',$2,$3)",
      [claimedOrganization, customer, a.id],
    );
    const conflictingOrganization = {
      ...request,
      operationId: randomUUID(),
      expectedVersion: 2,
      organization: {
        create: { displayName: "Duplicate business", clientId: customer },
      },
    };
    await assert.rejects(
      saveProspectContext(a, another, conflictingOrganization),
      (error: any) =>
        error.status === 409 &&
        /already has an organization/.test(error.message),
    );
    // An unrelated unique violation must not be translated into the customer-link conflict.
    await pool.query(
      "CREATE FUNCTION synthetic_unrelated_org_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic unrelated unique' USING ERRCODE='23505',CONSTRAINT='synthetic_unrelated_unique'; END $$",
    );
    await pool.query(
      "CREATE TRIGGER synthetic_unrelated_org_failure BEFORE INSERT ON business_organization FOR EACH ROW EXECUTE FUNCTION synthetic_unrelated_org_failure()",
    );
    try {
      await assert.rejects(
        saveProspectContext(a, another, {
          ...request,
          operationId: randomUUID(),
          expectedVersion: 2,
        }),
        (error: any) =>
          error.code === "23505" &&
          error.constraint === "synthetic_unrelated_unique" &&
          error.status === undefined,
      );
    } finally {
      await pool.query(
        "DROP TRIGGER synthetic_unrelated_org_failure ON business_organization",
      );
      await pool.query("DROP FUNCTION synthetic_unrelated_org_failure()");
    }
    assert.equal(
      (await pool.query("SELECT version FROM lead WHERE id=$1", [another]))
        .rows[0].version,
      2,
    );
    const customerContact = randomUUID();
    await pool.query(
      "INSERT INTO contact(id,client_id,name,email) VALUES($1,$2,'Customer person','real@example.test')",
      [customerContact, customer],
    );
    await assert.rejects(
      saveProspectContext(a, another, {
        ...reuse,
        operationId: randomUUID(),
        expectedVersion: 2,
        contact: { existingId: customerContact },
      }),
      /Contact does not match/,
    );
    // Deliberately anomalous prospect child records prove defenses beyond normal create paths.
    const work = randomUUID(),
      estimate = randomUUID(),
      billing = randomUUID(),
      file = randomUUID(),
      recurring = randomUUID();
    await pool.query(
      "INSERT INTO work_order(id,property_id,title,assigned_to,status,scheduled_at) VALUES($1,$2,'Private child',$3,'reviewed',now())",
      [work, p, actors.crew.id],
    );
    await pool.query(
      "INSERT INTO estimate(id,property_id,title,amount_cents,scope,status) VALUES($1,$2,'Private estimate',10000,'Private','approved')",
      [estimate, p],
    );
    await pool.query(
      "INSERT INTO billing_draft(id,property_id,estimate_id,title,amount_cents,kind) VALUES($1,$2,$3,'Private bill',100,'service')",
      [billing, p, estimate],
    );
    await pool.query(
      "INSERT INTO file_record(id,property_id,work_order_id,user_id,object_key,name,mime,bytes,status,published) VALUES($1,$2,$3,$4,$5,'Private photo','image/png',1,'ready',true)",
      [file, p, work, a.id, randomUUID()],
    );
    await pool.query(
      "INSERT INTO recurring_service(id,property_id,title,cadence,interval_count,next_date,billing_mode) VALUES($1,$2,'Private recurring','weekly',1,current_date,'per_visit')",
      [recurring, p],
    );
    await pool.query(
      "INSERT INTO property_area(id,property_id,name) VALUES($1,$2,'Private area')",
      [randomUUID(), p],
    );
    await pool.query(
      "INSERT INTO project(id,property_id,name,scope) VALUES($1,$2,'Private project','Private')",
      [randomUUID(), p],
    );
    await pool.query(
      "INSERT INTO expense(id,property_id,amount_cents,category,description,incurred_on,created_by) VALUES($1,$2,100,'Private','Private',current_date,$3)",
      [randomUUID(), p, a.id],
    );
    await pool.query(
      "INSERT INTO inspection(id,property_id,user_id,title,findings) VALUES($1,$2,$3,'Private inspection','[]')",
      [randomUUID(), p, a.id],
    );
    await pool.query(
      "INSERT INTO service_request(id,property_id,user_id,description) VALUES($1,$2,$3,'Private request')",
      [randomUUID(), p, a.id],
    );
    const express = (await import("express")).default,
      { auth } = await import("./auth");
    const original = auth.api.getSession;
    (auth.api as any).getSession = async ({ headers }: any) => ({
      user: {
        ...actors[headers.get("x-test-role")],
        emailVerified: true,
        twoFactorEnabled: true,
      },
      session: { id: ownerSession },
    });
    const app = express();
    app.use(express.json());
    app.use(
      "/api/v1",
      (await import("./prospect-context.routes")).prospectContextApi,
      (await import("./commercial-ingress")).commercialStaffApi,
      (await import("./api")).api,
      (await import("./operations")).operationsApi,
      (await import("./files")).filesApi,
      (await import("./sales")).salesApi,
      (await import("./quickbooks")).qboApi,
    );
    app.use((e: any, _q: any, r: any, _n: any) =>
      r.status(e.status || 400).json({ message: e.message }),
    );
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
    const call = (
      role: string,
      path: string,
      body?: unknown,
      method = "POST",
      extra: Record<string, string> = {},
    ) =>
      fetch(base + path, {
        method: body === undefined ? "GET" : method,
        headers: {
          "x-test-role": role,
          "content-type": "application/json",
          ...extra,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    try {
      for (const role of Object.keys(actors)) {
        const properties = await call(role, "/properties");
        assert.equal(properties.status, 200);
        const list = (await properties.json()) as any[];
        assert.ok(list.every((v) => v.id !== p));
        if (role !== "crew") assert.ok(list.some((v) => v.id === operational));
        for (const path of [
          "/work-orders",
          "/estimates",
          "/billing",
          "/requests",
          "/projects",
          "/recurring-services",
          "/expenses",
          "/inspections",
          "/schedule?from=2026-09-07&through=2026-09-08",
        ]) {
          const r = await call(role, path);
          const text = await r.text();
          assert.ok(!text.includes("Private"), role + path + text);
        }
        for (const path of [
          `/properties/${p}/timeline`,
          `/properties/${p}/areas`,
          `/properties/${p}/files`,
          `/files/${file}/content`,
          `/work-orders/${work}`,
        ])
          assert.ok(
            [403, 404].includes((await call(role, path)).status),
            role + path,
          );
      }
      // Real email avoids the unrelated phone-only guard masking a context conversion bypass.
      const noSiteLead = randomUUID();
      await pool.query(
        "INSERT INTO lead(id,name,email,location,description,inquiry_type) VALUES($1,'No site','confirmed@example.test','Region','','commercial_site_assessment')",
        [noSiteLead],
      );
      await saveProspectContext(a, noSiteLead, {
        ...reuse,
        operationId: randomUUID(),
        expectedVersion: 1,
        property: null,
      });
      await pool.query(
        "UPDATE lead SET email='confirmed@example.test' WHERE id=$1",
        [another],
      );
      await saveProspectContext(a, another, {
        ...reuse,
        operationId: randomUUID(),
        expectedVersion: 2,
        property: null,
      });
      const countsBefore = (
        await pool.query(
          "SELECT (SELECT count(*) FROM client) AS clients,(SELECT count(*) FROM property) AS properties",
        )
      ).rows[0];
      for (const target of [noSiteLead, another]) {
        const response = await call("owner", `/leads/${target}/convert`, {
          propertyName: "Must not create",
          address: "Must not create",
        });
        assert.equal(response.status, 409);
        assert.match(
          await response.text(),
          /Prospect onboarding is not enabled/,
        );
        const state = (
          await pool.query(
            "SELECT organization_id,contact_id,property_id,converted_client_id,converted_property_id FROM lead WHERE id=$1",
            [target],
          )
        ).rows[0];
        assert.ok(state.organization_id && state.contact_id);
        assert.equal(state.property_id, null);
        assert.equal(state.converted_client_id, null);
        assert.equal(state.converted_property_id, null);
      }
      assert.deepEqual(
        (
          await pool.query(
            "SELECT (SELECT count(*) FROM client) AS clients,(SELECT count(*) FROM property) AS properties",
          )
        ).rows[0],
        countsBefore,
      );
      const postCases: Array<[string, unknown]> = [
        ["/work-orders", { propertyId: p, title: "Blocked" }],
        [
          "/estimates",
          {
            propertyId: p,
            title: "Blocked",
            scope: "Blocked",
            amountCents: 100,
          },
        ],
        ["/requests", { propertyId: p, description: "Blocked" }],
        [
          "/recurring-services",
          {
            propertyId: p,
            title: "Blocked",
            cadence: "weekly",
            intervalCount: 1,
            nextDate: "2026-09-08",
            billingMode: "per_visit",
          },
        ],
        [`/recurring-services/${recurring}/pause`, { paused: true }],
        [`/properties/${p}/areas`, { name: "Blocked" }],
        ["/projects", { propertyId: p, name: "Blocked", scope: "Blocked" }],
        [
          "/expenses",
          {
            propertyId: p,
            amountCents: 100,
            category: "Test",
            description: "Blocked",
            incurredOn: "2026-09-07",
          },
        ],
        ["/inspections", { propertyId: p, title: "Blocked", findings: [] }],
        [`/work-orders/${work}/status`, { status: "cancelled", version: 1 }],
        [`/work-orders/${work}/publish`, {}],
        [
          `/work-orders/${work}/reschedule`,
          {
            version: 1,
            scheduledAt: "2026-09-09T12:00:00Z",
            reason: "Blocked",
          },
        ],
        [
          `/estimates/${estimate}/revise`,
          { revision: 1, title: "Blocked", scope: "Blocked", amountCents: 100 },
        ],
        [
          `/estimates/${estimate}/change-order`,
          { title: "Blocked", scope: "Blocked", amountCents: 100 },
        ],
        [`/estimates/${estimate}/decision`, { revision: 1, status: "sent" }],
        [
          "/billing",
          {
            operationId: randomUUID(),
            propertyId: p,
            estimateId: estimate,
            title: "Blocked",
            amountCents: 100,
            kind: "service",
          },
        ],
        [`/files/${file}/publish`, {}],
        [
          `/leads/${leadId}/convert`,
          { propertyName: "Blocked", address: "Blocked" },
        ],
      ];
      for (const [path, body] of postCases) {
        const r = await call("owner", path, body);
        assert.ok(
          [403, 404, 409].includes(r.status),
          path + " " + r.status + " " + (await r.text()),
        );
      }
      process.env.QBO_SERVICE_ITEM_ID = "synthetic";
      assert.equal(
        (await call("owner", `/billing/${billing}/post`, {})).status,
        404,
      );
      assert.equal(
        (
          await call("owner", "/field/sync", {
            events: [
              {
                id: randomUUID(),
                workOrderId: work,
                kind: "note",
                payload: { text: "Blocked" },
                baseVersion: 1,
                capturedAt: new Date().toISOString(),
              },
            ],
          })
        ).status,
        404,
      );
      const slot = randomUUID();
      await pool.query(
        "INSERT INTO assessment_slot(id,starts_at,ends_at) VALUES($1,now()+interval '2 day',now()+interval '2 day 1 hour')",
        [slot],
      );
      assert.equal(
        (
          await call("owner", `/assessment-slots/${slot}/book`, {
            propertyId: p,
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await call("owner", `/files/${randomUUID()}`, {}, "POST", {
            "x-p1-property": p,
            "x-p1-work": work,
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await call("owner", "/work-orders", {
            propertyId: operational,
            title: "Valid operational",
          })
        ).status,
        201,
      );
      assert.equal(
        (await call("sales", `/commercial-inquiries/${leadId}/context`)).status,
        200,
      );
      for (const role of ["dispatch", "finance", "crew", "client"])
        assert.equal(
          (await call(role, `/commercial-inquiries/${leadId}/context`)).status,
          403,
        );
      await (await import("./recurrence")).generateRecurring();
      assert.equal(
        (
          await pool.query(
            "SELECT count(*) FROM work_order WHERE recurring_service_id=$1",
            [recurring],
          )
        ).rows[0].count,
        "0",
      );
      assert.equal(
        (await pool.query("SELECT count(*) FROM client")).rows[0].count,
        "1",
      );
      assert.equal(
        (await pool.query("SELECT count(*) FROM outbox")).rows[0].count,
        "0",
      );
    } finally {
      (auth.api as any).getSession = original;
      await new Promise<void>((r) => server.close(() => r()));
    }
  },
);
