import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
import {
  compositionContent,
  previewComposition,
} from "./agreement-composition.contract";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Composition tests require an isolated local origin");
after(() => pool.end());
test("agreement preview resolves only supported placeholders and rounds exact cents by billing basis", () => {
  const content = compositionContent.parse({
    terms: "{{client.name}} {{agreement.starts_on}} {{toString}}",
    scope: { items: [], exclusions: "" },
    costs: {
      items: [
        {
          id: randomUUID(),
          description: "Half cent",
          unit: "",
          quantity: 1.5,
          unitPriceCents: 101,
          basis: "one_time",
        },
        {
          id: randomUUID(),
          description: "Monthly",
          unit: "",
          quantity: 1.25,
          unitPriceCents: 10001,
          basis: "fixed_monthly",
        },
      ],
    },
    notes: { scope: "", cost: "", package: "" },
  });
  const result = previewComposition(
    content,
    { "client.name": "Literal {{nested}}" },
    { startsOn: "2030-01-01", endsOn: null, preparedOn: null },
  );
  assert.equal(
    result.content.terms,
    "Literal {{nested}} 2030-01-01 {{toString}}",
  );
  assert.deepEqual(result.unresolvedPlaceholders, ["toString"]);
  assert.deepEqual(result.totalsByBasis, {
    one_time: 152,
    fixed_monthly: 12501,
    per_visit: 0,
  });
  assert.equal(
    content.terms,
    "{{client.name}} {{agreement.starts_on}} {{toString}}",
  );
});
test(
  "client agreement drafts snapshot templates independently, serialize retries and edits, preserve inquiry-only context and paginate exact timestamps",
  { skip: !base },
  async () => {
    async function user(capabilities: string[], role = "member") {
      const id = randomUUID(),
        token = randomUUID();
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,\'Composition fixture\',$2,true)',
        [id, `${id}@example.test`],
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
        [randomUUID(), token, id],
      );
      return {
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
    const sales = await user(["revenue.sales"]),
      manager = await user(["revenue.agreement-templates.manage"]),
      reader = await user(["revenue.agreements"]),
      portal = await user([], "client");
    async function call(
      who: typeof sales,
      path: string,
      body?: unknown,
      method = body === undefined ? "GET" : "POST",
    ) {
      const response = await fetch(base + "/api/v1" + path, {
        method,
        headers: {
          cookie: who.cookie,
          origin: base!,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, body: (await response.json()) as any };
    }
    async function template(kind: string, body: string, payload: unknown) {
      const id = randomUUID();
      await pool.query(
        "INSERT INTO agreement_template(id,name,body,created_by,kind,payload,family_id) VALUES($1,$2,$3,$4,$5,$6,$1)",
        [
          id,
          `Composition ${kind}`,
          body,
          manager.id,
          kind,
          JSON.stringify(payload),
        ],
      );
      return id;
    }
    const msa = await template(
        "msa",
        "{{client.name}} · {{property.name}} · {{agreement.starts_on}} · {{unsupported}}",
        {},
      ),
      scope = await template("scope", "Scope notes", {
        items: [
          {
            id: randomUUID(),
            title: "Site care",
            description: "For {{client.name}}",
          },
        ],
        exclusions: "Fixture exclusion",
      }),
      cost = await template("cost", "Cost notes", {
        items: [
          {
            id: randomUUID(),
            description: "Service",
            unit: "acre",
            quantity: 1.25,
            unitPriceCents: 10001,
            basis: "one_time",
          },
        ],
      });
    const packageId = await template("package", "Package notes", {
      msaId: msa,
      scopeId: scope,
      costId: cost,
    });
    const clientA = randomUUID(),
      clientB = randomUUID(),
      propertyA = randomUUID(),
      propertyB = randomUUID(),
      leadId = randomUUID();
    await pool.query(
      "INSERT INTO client(id,name) VALUES($1,'Client A'),($2,'Client B')",
      [clientA, clientB],
    );
    await pool.query(
      "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Property A','Address A'),($3,$4,'Property B','Address B')",
      [propertyA, clientA, propertyB, clientB],
    );
    await pool.query(
      "INSERT INTO lead(id,name,email,location,description) VALUES($1,'Inquiry contact','lead@example.test','Reported area','Synthetic inquiry')",
      [leadId],
    );
    const request = {
      operationId: randomUUID(),
      title: "Client A draft",
      context: { clientId: clientA, propertyId: propertyA },
      selection: { packageId },
    };
    const concurrent = await Promise.all([
      call(sales, "/agreement-drafts", request),
      call(sales, "/agreement-drafts", request),
    ]);
    for (const result of concurrent)
      assert.equal(result.status, 201, JSON.stringify(result.body));
    assert.equal(concurrent[0].body.id, concurrent[1].body.id);
    const first = concurrent[0].body;
    assert.equal(first.creation_fingerprint, undefined);
    assert.equal(first.creation_key, undefined);
    assert.equal(first.source_templates.length, 4);
    assert.equal(first.preview.totalsByBasis.one_time, 12501);
    assert.deepEqual(first.preview.unresolvedPlaceholders, [
      "agreement.starts_on",
      "unsupported",
    ]);
    assert(first.preview.content.terms.startsWith("Client A · Property A"));
    assert.equal(
      (
        await call(sales, "/agreement-drafts", {
          ...request,
          title: "Different retry",
        })
      ).status,
      409,
    );
    const secondResult = await call(sales, "/agreement-drafts", {
      ...request,
      operationId: randomUUID(),
      title: "Client B draft",
      context: { clientId: clientB, propertyId: propertyB },
    });
    assert.equal(secondResult.status, 201);
    const second = secondResult.body;
    assert.notEqual(
      first.content.scope.items[0].id,
      second.content.scope.items[0].id,
    );
    const edits = {
      expectedVersion: first.version,
      title: "Customized A",
      content: { ...first.content, terms: "Custom A only" },
      dates: { preparedOn: null, startsOn: "2030-01-01", endsOn: "2030-12-31" },
    };
    const editsResult = await Promise.all([
      call(sales, `/agreement-drafts/${first.id}`, edits, "PUT"),
      call(sales, `/agreement-drafts/${first.id}`, edits, "PUT"),
    ]);
    assert.deepEqual(editsResult.map((r) => r.status).sort(), [200, 409]);
    assert.equal(
      (await call(sales, `/agreement-drafts/${second.id}`)).body.content.terms,
      second.content.terms,
    );
    assert.equal(
      (
        await pool.query("SELECT body FROM agreement_template WHERE id=$1", [
          msa,
        ])
      ).rows[0].body,
      first.content.terms,
    );
    await pool.query(
      "UPDATE agreement_template SET status='archived',active=false WHERE id=$1",
      [msa],
    );
    assert.equal(
      (
        await call(sales, "/agreement-drafts", {
          ...request,
          operationId: randomUUID(),
        })
      ).status,
      409,
    );
    assert.equal(
      (await call(sales, "/agreement-drafts", request)).body.id,
      first.id,
    );
    const replacement = await template("msa", first.content.terms, {});
    const currentPackage = await template("package", "Current package notes", {
      msaId: replacement,
      scopeId: scope,
      costId: cost,
    });
    const third = await call(sales, "/agreement-drafts", {
      ...request,
      operationId: randomUUID(),
      selection: { packageId: currentPackage },
    });
    assert.equal(third.status, 201);
    assert.equal(third.body.content.terms, first.content.terms);
    assert.equal(
      (
        await call(sales, "/agreement-drafts", {
          ...request,
          operationId: randomUUID(),
          selection: { msaId: msa },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(sales, "/agreement-drafts", {
          ...request,
          operationId: randomUUID(),
          context: { clientId: clientA, propertyId: propertyB },
        })
      ).status,
      409,
    );
    await pool.query("UPDATE lead SET property_id=$2 WHERE id=$1", [
      leadId,
      propertyB,
    ]);
    assert.equal(
      (
        await call(sales, "/agreement-drafts", {
          ...request,
          operationId: randomUUID(),
          context: { leadId, clientId: clientA, propertyId: propertyA },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(sales, "/agreement-drafts", {
          ...request,
          operationId: randomUUID(),
          context: { leadId, clientId: clientA },
        })
      ).status,
      409,
    );
    await pool.query("UPDATE lead SET property_id=NULL WHERE id=$1", [leadId]);
    const prospect = await call(sales, "/agreement-drafts", {
      operationId: randomUUID(),
      title: "Inquiry draft",
      context: { leadId },
      selection: { packageId: currentPackage },
    });
    assert.equal(prospect.status, 201);
    assert.equal(prospect.body.client_id, null);
    assert.equal(prospect.body.property_id, null);
    assert(
      prospect.body.preview.unresolvedPlaceholders.includes("client.name"),
    );
    assert.deepEqual(
      (
        await pool.query(
          "SELECT organization_id,contact_id,property_id FROM lead WHERE id=$1",
          [leadId],
        )
      ).rows[0],
      { organization_id: null, contact_id: null, property_id: null },
    );
    const assigned = await call(
      sales,
      `/agreement-drafts/${prospect.body.id}/context`,
      {
        expectedVersion: 1,
        context: { leadId, clientId: clientA, propertyId: propertyA },
      },
    );
    assert.equal(assigned.status, 200);
    assert.equal(
      assigned.body.preview.content.scope.items[0].description,
      "For Client A",
    );
    assert.equal(assigned.body.content.terms, prospect.body.content.terms);
    for (const who of [manager, portal]) {
      assert.equal(
        (await call(who, `/agreement-drafts/${first.id}`)).status,
        403,
      );
      assert.equal((await call(who, "/agreement-drafts", request)).status, 403);
    }
    assert.equal(
      (await call(reader, `/agreement-drafts/${first.id}`)).status,
      200,
    );
    assert.equal(
      (await call(reader, `/agreement-drafts/${first.id}`, edits, "PUT"))
        .status,
      403,
    );
    await pool.query(
      "UPDATE agreement_composition_draft SET created_at='2030-01-01T00:00:00.123456Z' WHERE client_id=$1",
      [clientA],
    );
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const result = await call(
        sales,
        `/agreement-drafts?clientId=${clientA}&limit=1${cursor ? `&cursor=${cursor}` : ""}`,
      );
      assert.equal(result.status, 200);
      for (const item of result.body.items) {
        assert(!seen.has(item.id));
        seen.add(item.id);
      }
      cursor = result.body.nextCursor;
    } while (cursor);
    assert.equal(seen.size, 3);
    assert(seen.has(first.id));
    assert(seen.has(third.body.id));
    assert(seen.has(prospect.body.id));
    assert.equal(
      (await call(sales, "/agreement-drafts?cursor=invalid")).status,
      400,
    );
    assert(
      (
        await pool.query(
          "SELECT 1 FROM audit_event WHERE entity_id=$1 AND action='agreement-draft.updated'",
          [first.id],
        )
      ).rowCount,
    );

    const replacementScope = await template(
      "scope",
      "Replacement scope notes",
      {
        items: [
          {
            id: randomUUID(),
            title: "New scope",
            description: "Replacement for {{client.name}}",
          },
        ],
        exclusions: "New exclusions",
      },
    );
    const switchPath = `/agreement-drafts/${first.id}/templates`;
    const beforeSwitch = (await call(sales, `/agreement-drafts/${first.id}`))
      .body;
    const switchRequest = {
      expectedVersion: beforeSwitch.version,
      selection: { scopeId: replacementScope },
      sections: ["scope"],
    };
    const reviewed = await call(sales, switchPath + "/review", switchRequest);
    assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body));
    assert.deepEqual(reviewed.body.before, beforeSwitch.content);
    assert.deepEqual(reviewed.body.after.costs, beforeSwitch.content.costs);
    assert.equal(reviewed.body.after.terms, "Custom A only");
    assert.equal(
      reviewed.body.after.notes.cost,
      beforeSwitch.content.notes.cost,
    );
    assert.equal(
      reviewed.body.preview.content.scope.items[0].description,
      "Replacement for Client A",
    );
    assert.deepEqual(
      (await call(sales, `/agreement-drafts/${first.id}`)).body,
      beforeSwitch,
      "Review must not mutate draft",
    );
    for (const who of [manager, reader, portal]) {
      for (const action of ["review", "apply"])
        assert.equal(
          (
            await call(who, switchPath + "/" + action, {
              ...switchRequest,
              ...(action === "apply"
                ? { reviewToken: reviewed.body.reviewToken }
                : {}),
            })
          ).status,
          403,
        );
    }
    assert.equal(
      (
        await call(sales, switchPath + "/review", {
          ...switchRequest,
          sections: ["scope", "scope"],
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(sales, switchPath + "/review", {
          ...switchRequest,
          sections: ["terms"],
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(sales, switchPath + "/apply", {
          ...switchRequest,
          reviewToken: "0".repeat(64),
        })
      ).status,
      409,
    );
    // A source changed out of band between review/apply must not be substituted silently.
    await pool.query(
      "UPDATE agreement_template SET body='Changed source notes' WHERE id=$1",
      [replacementScope],
    );
    assert.equal(
      (
        await call(sales, switchPath + "/apply", {
          ...switchRequest,
          reviewToken: reviewed.body.reviewToken,
        })
      ).status,
      409,
    );
    const refreshed = await call(sales, switchPath + "/review", switchRequest);
    const applyRequest = {
      ...switchRequest,
      reviewToken: refreshed.body.reviewToken,
    };
    const applied = await Promise.all([
      call(sales, switchPath + "/apply", applyRequest),
      call(sales, switchPath + "/apply", applyRequest),
    ]);
    assert.deepEqual(applied.map((result) => result.status).sort(), [200, 409]);
    const switched = applied.find((result) => result.status === 200)!.body;
    assert.equal(switched.version, beforeSwitch.version + 1);
    assert.equal(switched.content.scope.items[0].title, "New scope");
    assert.notEqual(
      switched.content.scope.items[0].id,
      beforeSwitch.content.scope.items[0].id,
    );
    assert.equal(switched.content.notes.scope, "Changed source notes");
    for (const key of ["terms", "costs"])
      assert.deepEqual(switched.content[key], beforeSwitch.content[key]);
    assert.deepEqual(switched.dates, beforeSwitch.dates);
    assert.deepEqual(switched.context_snapshot, beforeSwitch.context_snapshot);
    assert.equal(
      switched.source_templates.length,
      beforeSwitch.source_templates.length + 1,
    );
    assert.deepEqual(
      switched.source_templates.slice(0, beforeSwitch.source_templates.length),
      beforeSwitch.source_templates,
    );
    assert.equal(
      (await call(sales, `/agreement-drafts/${second.id}`)).body.content.terms,
      second.content.terms,
    );
    assert.equal(
      (await call(sales, switchPath + "/apply", applyRequest)).status,
      409,
    );
    const currentSwitch = {
      ...switchRequest,
      expectedVersion: switched.version,
    };
    const beforeArchive = await call(
      sales,
      switchPath + "/review",
      currentSwitch,
    );
    await pool.query(
      "UPDATE agreement_template SET status='archived',active=false WHERE id=$1",
      [replacementScope],
    );
    assert.equal(
      (
        await call(sales, switchPath + "/apply", {
          ...currentSwitch,
          reviewToken: beforeArchive.body.reviewToken,
        })
      ).status,
      409,
    );
    assert.equal(
      (await call(sales, `/agreement-drafts/${first.id}`)).body.version,
      switched.version,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM audit_event WHERE entity_id=$1 AND action='agreement-draft.templates-replaced'",
          [first.id],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM estimate WHERE created_by=$1",
          [sales.id],
        )
      ).rows[0].n,
      0,
    );
  },
);
