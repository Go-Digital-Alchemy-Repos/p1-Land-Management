import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
import {
  compositionContent,
  previewComposition,
} from "./agreement-composition.contract";
import { reusableContent } from "./agreement-template-export";
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

test("reusable template preparation strips known context without rewriting placeholders or word fragments", () => {
  const identifier = randomUUID();
  const source = compositionContent.parse({
    terms: `Ann keeps annual care. ANN at 123 Main St. Email unknown@example.test, call (864) 555-0101. Record ${identifier}. Existing {{client.name}}. {{private@example.test}}. {{Ann}}.`,
    scope: {
      items: [
        { id: randomUUID(), title: "Ann scope", description: "123 Main St" },
      ],
      exclusions: "Ann",
    },
    costs: {
      items: [
        {
          id: randomUUID(),
          description: "For Ann",
          unit: "acre",
          quantity: 9.5,
          unitPriceCents: 98765,
          basis: "fixed_monthly",
        },
      ],
    },
    notes: { scope: "Ann", cost: "Ann", package: "Ann" },
  });
  const before = structuredClone(source);
  const output = reusableContent(source, [
    { value: "Ann", placeholder: "client.name" },
    { value: "123 Main St", placeholder: "property.address" },
    { value: "8645550101", phone: true },
  ]);
  assert(
    output.content.terms.startsWith(
      "{{client.name}} keeps annual care. {{client.name}} at {{property.address}}",
    ),
  );
  assert(output.content.terms.includes("Existing {{client.name}}"));
  for (const value of [
    identifier,
    "unknown@example.test",
    "private@example.test",
    "{{Ann}}",
    "864",
    "555-0101",
  ])
    assert(!output.content.terms.includes(value));
  assert.equal(output.content.costs.items[0].quantity, 1);
  assert.equal(output.content.costs.items[0].unitPriceCents, 0);
  assert.equal(output.content.costs.items[0].basis, "fixed_monthly");
  assert.notEqual(output.content.costs.items[0].id, source.costs.items[0].id);
  assert.notEqual(output.content.scope.items[0].id, source.scope.items[0].id);
  assert.deepEqual(source, before);
  assert(output.removedDetails > 0);
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
    // New preparation and related-draft routes must enforce Sales at the server,
    // including users who can read agreements or manage reusable templates.
    for (const path of [
      `/agreement-drafts/${randomUUID()}/prepare`,
      `/estimates/${randomUUID()}/agreement-revision`,
      `/estimates/${randomUUID()}/agreement-change-order`,
    ]) {
      for (const denied of [reader, manager, portal]) {
        assert.equal((await call(denied, path, {})).status, 403);
      }
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
    const pricingInput = {
      expectedVersion: first.version,
      allocations: [
        { basis: "one_time", scopeRowIds: [first.content.scope.items[0].id] },
      ],
    };
    const pricingReview = await call(
      sales,
      `/agreement-drafts/${first.id}/pricing/review`,
      pricingInput,
    );
    assert.equal(pricingReview.status, 200);
    assert.equal(pricingReview.body.pricingValid, false);
    assert.equal(pricingReview.body.authorizedAmountCents, null);
    assert.equal(
      pricingReview.body.allocations[0].authorizedAmountCents,
      12501,
    );
    assert(
      pricingReview.body.blockers.some(
        (b: any) => b.code === "unresolved_placeholders",
      ),
    );
    assert.equal(
      (
        await call(sales, `/agreement-drafts/${first.id}/pricing/review`, {
          ...pricingInput,
          expectedVersion: 999,
        })
      ).status,
      409,
    );
    for (const who of [reader, manager, portal])
      assert.equal(
        (
          await call(
            who,
            `/agreement-drafts/${first.id}/pricing/review`,
            pricingInput,
          )
        ).status,
        403,
      );
    assert.equal(
      (await call(sales, `/agreement-drafts/${first.id}`)).body.version,
      first.version,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM estimate WHERE id=(SELECT estimate_id FROM agreement_composition_draft WHERE id=$1)",
          [first.id],
        )
      ).rows[0].n,
      0,
    );
    {
      // A pricing plan is private, version-bound and invalidated by every content/context mutation.
      const planning = (
        await call(sales, "/agreement-drafts", {
          ...request,
          operationId: randomUUID(),
          title: "Pricing persistence fixture",
        })
      ).body;
      const planPath = `/agreement-drafts/${planning.id}/pricing`;
      const priceRequest = {
        expectedVersion: planning.version,
        allocations: [
          {
            basis: "one_time",
            scopeRowIds: [planning.content.scope.items[0].id],
          },
        ],
      };
      assert.equal((await call(sales, planPath, priceRequest)).status, 422);
      for (const who of [reader, manager, portal])
        assert.equal((await call(who, planPath, priceRequest)).status, 403);
      let planned = (
        await call(
          sales,
          `/agreement-drafts/${planning.id}`,
          {
            expectedVersion: planning.version,
            title: planning.title,
            dates: planning.dates,
            content: { ...planning.content, terms: "Reviewed terms" },
          },
          "PUT",
        )
      ).body;
      priceRequest.expectedVersion = planned.version;
      const planRace = await Promise.all([
        call(sales, planPath, priceRequest),
        call(sales, planPath, priceRequest),
      ]);
      assert.deepEqual(
        planRace.map((result) => result.status).sort(),
        [200, 409],
      );
      planned = planRace.find((result) => result.status === 200)!.body;
      assert.equal(planned.pricing_plan.sourceVersion, planned.version);
      assert.equal(planned.pricing_plan.review.authorizedAmountCents, 12501);
      assert.equal(planned.status, "draft");
      assert.equal(planned.estimate_id, null);
      assert.equal(
        (await call(reader, `/agreement-drafts/${planning.id}`)).body
          .pricing_plan.sourceVersion,
        planned.version,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM audit_event WHERE action='agreement-draft.pricing_saved' AND entity_id=$1",
            [planning.id],
          )
        ).rows[0].n,
        1,
      );
      const savedPlan = structuredClone(planned.pricing_plan);
      await assert.rejects(
        pool.query(
          "UPDATE agreement_composition_draft SET pricing_plan=$2 WHERE id=$1",
          [planning.id, JSON.stringify({ ...savedPlan, sourceVersion: 999 })],
        ),
        /agreement_draft_pricing_shape/,
      );
      await pool.query(
        "UPDATE agreement_composition_draft SET title=title || ' revised' WHERE id=$1",
        [planning.id],
      );
      assert.equal(
        (await call(sales, `/agreement-drafts/${planning.id}`)).body
          .pricing_plan,
        null,
      );
      priceRequest.expectedVersion = planned.version;
      planned = (await call(sales, planPath, priceRequest)).body;
      assert(planned.pricing_plan);
      const refreshed = await call(
        sales,
        `/agreement-drafts/${planning.id}/context`,
        { expectedVersion: planned.version, context: request.context },
      );
      assert.equal(refreshed.status, 200);
      assert.equal(refreshed.body.pricing_plan, null);
      planned = refreshed.body;
      priceRequest.expectedVersion = planned.version;
      const contentRace = await Promise.all([
        call(sales, planPath, priceRequest),
        call(
          sales,
          `/agreement-drafts/${planning.id}`,
          {
            expectedVersion: planned.version,
            title: planned.title,
            dates: planned.dates,
            content: {
              ...planned.content,
              terms: "Changed during pricing save",
            },
          },
          "PUT",
        ),
      ]);
      assert.deepEqual(
        contentRace.map((result) => result.status).sort(),
        [200, 409],
      );
      const finalPlan = (await call(sales, `/agreement-drafts/${planning.id}`))
        .body;
      assert.equal(
        Boolean(finalPlan.pricing_plan),
        contentRace[0].status === 200,
      );
      assert.equal(finalPlan.estimate_id, null);
      priceRequest.expectedVersion = finalPlan.version;
      const beforePriceChange = (await call(sales, planPath, priceRequest))
        .body;
      assert(beforePriceChange.pricing_plan);
      await pool.query(
        "UPDATE agreement_composition_draft SET content=jsonb_set(content,'{costs,items,0,unitPriceCents}','201'::jsonb),pricing_plan=$2 WHERE id=$1",
        [planning.id, JSON.stringify(beforePriceChange.pricing_plan)],
      );
      const afterPriceChange = (
        await call(sales, `/agreement-drafts/${planning.id}`)
      ).body;
      assert.equal(afterPriceChange.pricing_plan, null);
      priceRequest.expectedVersion = afterPriceChange.version;
      const repriced = (await call(sales, planPath, priceRequest)).body;
      assert.equal(repriced.pricing_plan.review.authorizedAmountCents, 251);
    }
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
    assert.equal(seen.size, 4); // Includes the independent pricing-plan fixture.
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

    const exporter = await user([
      "revenue.agreements",
      "revenue.agreement-templates.manage",
    ]);
    const organizationId = randomUUID(),
      contactId = randomUUID();
    await pool.query(
      "INSERT INTO business_organization(id,display_name,legal_name,client_id,owner_id) VALUES($1,'Private Organization','Private Legal Company',$2,$3)",
      [organizationId, clientA, sales.id],
    );
    await pool.query(
      "INSERT INTO contact(id,name,email,phone) VALUES($1,'Private Procurement','private@example.test','8645550101')",
      [contactId],
    );
    await pool.query(
      "INSERT INTO organization_contact(organization_id,contact_id,role,source) VALUES($1,$2,'procurement','synthetic-test')",
      [organizationId, contactId],
    );
    const exportSource = (await call(sales, `/agreement-drafts/${first.id}`))
      .body;
    assert.equal(
      (
        await call(
          sales,
          `/agreement-drafts/${first.id}`,
          {
            expectedVersion: exportSource.version,
            title: exportSource.title,
            dates: exportSource.dates,
            content: {
              ...exportSource.content,
              terms:
                "Client A / Private Organization / Private Legal Company / Private Procurement / private@example.test / (864) 555-0101",
            },
          },
          "PUT",
        )
      ).status,
      200,
    );
    const exportPath = `/agreement-drafts/${first.id}/template-export`;
    const savedBeforeExport = (
      await call(sales, `/agreement-drafts/${first.id}`)
    ).body;
    const exportRequest = {
      expectedVersion: savedBeforeExport.version,
      kind: "msa",
    };
    for (const who of [sales, manager, reader, portal])
      assert.equal((await call(who, exportPath, exportRequest)).status, 403);
    assert.equal(
      (
        await call(exporter, exportPath, {
          ...exportRequest,
          expectedVersion: 1,
        })
      ).status,
      409,
    );
    const tableCount = (
      await pool.query("SELECT count(*)::int AS n FROM agreement_template")
    ).rows[0].n;
    for (const kind of ["msa", "scope", "cost"]) {
      const candidate = await call(exporter, exportPath, {
        ...exportRequest,
        kind,
      });
      assert.equal(candidate.status, 200, JSON.stringify(candidate.body));
      assert.equal(candidate.body.kind, kind);
      if (kind === "msa") {
        assert(candidate.body.body.includes("{{client.name}}"));
        for (const value of [
          "Private Organization",
          "Private Legal Company",
          "Private Procurement",
          "private@example.test",
          "864",
        ])
          assert(!candidate.body.body.includes(value));
      }

      assert.equal(candidate.body.sourceVersion, savedBeforeExport.version);
      for (const field of [
        "id",
        "client_id",
        "lead_id",
        "source_templates",
        "context_snapshot",
      ])
        assert.equal(candidate.body[field], undefined);
      assert(!candidate.body.name.includes(savedBeforeExport.title));
      if (kind === "cost") {
        assert.equal(candidate.body.payload.items[0].quantity, 1);
        assert.equal(candidate.body.payload.items[0].unitPriceCents, 0);
        assert.notEqual(
          candidate.body.payload.items[0].id,
          savedBeforeExport.content.costs.items[0].id,
        );
      }
    }
    assert.equal(
      (await pool.query("SELECT count(*)::int AS n FROM agreement_template"))
        .rows[0].n,
      tableCount,
    );
    assert.deepEqual(
      (await call(sales, `/agreement-drafts/${first.id}`)).body,
      savedBeforeExport,
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
