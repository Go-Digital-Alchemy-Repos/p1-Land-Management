import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Template tests require isolated local origin");
after(() => pool.end());
test(
  "agreement templates retain immutable versions with scoped publication, CAS, typed rows and package references",
  { skip: !base },
  async () => {
    async function user(capabilities: string[]) {
      const id = randomUUID(),
        token = randomUUID();
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,\'Template fixture\',$2,true)',
        [id, `${id}@example.test`],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,'member')",
        [id],
      );
      await pool.query(
        "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)",
        [id, capabilities],
      );
      await pool.query(
        'INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval \'1 hour\',$2,$3)',
        [randomUUID(), token, id],
      );
      return (
        "p1-dashboard.session_token=" +
        encodeURIComponent(
          token +
            "." +
            createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
              .update(token)
              .digest("base64"),
        )
      );
    }
    const manager = await user(["revenue.agreement-templates.manage"]),
      sales = await user(["revenue.sales"]);
    async function call(
      cookie: string,
      path: string,
      body?: unknown,
      method = body === undefined ? "GET" : "POST",
    ) {
      const response = await fetch(base + "/api/v1" + path, {
        method,
        headers: {
          cookie,
          origin: base!,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, body: (await response.json()) as any };
    }
    async function create(kind: string, payload: any = {}, body = "") {
      const result = await call(manager, "/agreement-templates", {
        kind,
        name: `Fixture ${randomUUID()}`,
        description: "Synthetic reusable content",
        body,
        payload,
      });
      assert.equal(result.status, 201, JSON.stringify(result.body));
      return result.body;
    }
    async function publish(row: any) {
      const result = await call(
        manager,
        `/agreement-templates/${row.id}/publish`,
        { expectedEditVersion: row.edit_version },
      );
      assert.equal(result.status, 200, JSON.stringify(result.body));
      return result.body;
    }
    const draft = await create("msa", {}, "Original {{client.name}} terms");
    assert.equal(draft.status, "draft");
    assert.equal(draft.active, false);
    assert.equal(
      (await call(sales, `/agreement-templates/${draft.id}`)).status,
      404,
    );
    assert.equal(
      (await call(sales, "/agreement-templates?state=all&kind=all")).status,
      403,
    );
    assert.equal(
      (
        await call(sales, `/agreement-templates/${draft.id}/publish`, {
          expectedEditVersion: 1,
        })
      ).status,
      403,
    );
    const edit = {
      name: draft.name,
      description: draft.description,
      body: "Reviewed {{client.name}} terms",
      payload: {},
      expectedEditVersion: 1,
    };
    const outcomes = await Promise.all([
      call(manager, `/agreement-templates/${draft.id}`, edit, "PUT"),
      call(manager, `/agreement-templates/${draft.id}`, edit, "PUT"),
    ]);
    assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
    const msa = await publish(outcomes.find((r) => r.status === 200)!.body);
    assert.equal(
      (
        await call(
          manager,
          `/agreement-templates/${msa.id}`,
          { ...edit, expectedEditVersion: msa.edit_version },
          "PUT",
        )
      ).status,
      409,
    );
    const scope = await publish(
      await create("scope", {
        items: [
          {
            id: randomUUID(),
            title: "Synthetic service",
            description: "Reusable scope",
          },
        ],
        exclusions: "Fixture exclusion",
      }),
    );
    const costPayload = {
      items: [
        {
          id: randomUUID(),
          description: "Synthetic service",
          unit: "acre",
          quantity: 1.25,
          unitPriceCents: 10001,
          basis: "one_time",
        },
      ],
    };
    const cost = await publish(await create("cost", costPayload));
    const invalid = await call(manager, "/agreement-templates", {
      kind: "cost",
      name: "Invalid precision",
      payload: { items: [{ ...costPayload.items[0], quantity: 1.001 }] },
    });
    assert.equal(invalid.status, 400);
    assert.equal(
      (
        await call(manager, "/agreement-templates", {
          kind: "cost",
          name: "Excess precision",
          payload: {
            items: [{ ...costPayload.items[0], quantity: 1.0000000001 }],
          },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(manager, "/agreement-templates", {
          kind: "scope",
          name: "Duplicate rows",
          payload: {
            items: [
              { id: costPayload.items[0]!.id, title: "A", description: "" },
              { id: costPayload.items[0]!.id, title: "B", description: "" },
            ],
            exclusions: "",
          },
        })
      ).status,
      400,
    );
    const packageDraft = await create("package", {
      msaId: msa.id,
      scopeId: scope.id,
      costId: cost.id,
    });
    const packageRow = await publish(packageDraft);
    const wrong = await create("package", {
      msaId: scope.id,
      scopeId: scope.id,
      costId: cost.id,
    });
    assert.equal(
      (
        await call(manager, `/agreement-templates/${wrong.id}/publish`, {
          expectedEditVersion: wrong.edit_version,
        })
      ).status,
      409,
    );
    const list = await call(sales, "/agreement-templates");
    assert.equal(list.status, 200);
    assert(
      list.body.every(
        (row: any) => row.kind === "msa" && row.status === "published",
      ),
    );
    assert(
      (await call(sales, "/agreement-templates?kind=package")).body.some(
        (row: any) => row.id === packageRow.id,
      ),
    );
    // The existing estimate contract accepts only published MSAs and snapshots exact text.
    const clientId = randomUUID(),
      propertyId = randomUUID();
    await pool.query(
      "INSERT INTO client(id,name) VALUES($1,'Template client')",
      [clientId],
    );
    await pool.query(
      "INSERT INTO property(id,client_id,name,address,lifecycle) VALUES($1,$2,'Template property','Fixture address','operational')",
      [propertyId, clientId],
    );
    const estimateBody = {
      propertyId,
      title: "Synthetic agreement",
      scope: "Reviewed scope",
      kind: "recurring",
      agreementTemplateId: msa.id,
      lineItems: [
        { description: "Service", quantity: 1, unitPriceCents: 10000 },
      ],
      recurring: {
        cadence: "weekly",
        intervalCount: 1,
        startsOn: "2030-01-01",
        endsOn: "2030-12-31",
        localTime: "08:00",
        billingMode: "per_visit",
        unitAmountCents: 10000,
        periods: [],
      },
    };
    const estimate = await call(sales, "/estimates", estimateBody);
    assert.equal(estimate.status, 201, JSON.stringify(estimate.body));
    assert.equal(
      (
        await call(sales, "/estimates", {
          ...estimateBody,
          agreementTemplateId: cost.id,
        })
      ).status,
      409,
    );
    const revision = await call(
      manager,
      `/agreement-templates/${msa.id}/revise`,
      { expectedEditVersion: msa.edit_version },
    );
    assert.equal(revision.status, 201);
    assert.equal(revision.body.status, "draft");
    assert.equal(revision.body.version, 2);
    assert.equal(
      (
        await call(manager, `/agreement-templates/${msa.id}/revise`, {
          expectedEditVersion: msa.edit_version,
        })
      ).status,
      409,
    );
    const revisedEdit = await call(
      manager,
      `/agreement-templates/${revision.body.id}`,
      { ...edit, body: "New revision terms", expectedEditVersion: 1 },
      "PUT",
    );
    assert.equal(revisedEdit.status, 200);
    const publishedRevision = await publish(revisedEdit.body);
    const old = (await call(sales, `/agreement-templates/${msa.id}`)).body;
    assert.equal(old.status, "archived");
    assert.equal(old.body, msa.body);
    assert.equal(
      (
        await pool.query(
          "SELECT agreement_template_snapshot FROM estimate WHERE id=$1",
          [estimate.body.id],
        )
      ).rows[0].agreement_template_snapshot,
      msa.body,
    );
    assert.deepEqual(
      (await call(sales, `/agreement-templates/${packageRow.id}`)).body.payload,
      packageRow.payload,
    );
    const duplicate = await call(
      manager,
      `/agreement-templates/${publishedRevision.id}/duplicate`,
      {
        name: "Independent copy",
        expectedEditVersion: publishedRevision.edit_version,
      },
    );
    assert.equal(duplicate.status, 201);
    assert.notEqual(duplicate.body.family_id, msa.family_id);
    assert.equal(duplicate.body.status, "draft");
    const archived = await call(
      manager,
      `/agreement-templates/${publishedRevision.id}/archive`,
      { expectedEditVersion: publishedRevision.edit_version },
    );
    assert.equal(archived.status, 200);
    assert.equal(archived.body.active, false);
    assert.equal(
      (
        await call(sales, "/estimates", {
          ...estimateBody,
          agreementTemplateId: publishedRevision.id,
        })
      ).status,
      409,
    );
    const legacy = await call(manager, "/agreement-templates", {
      name: `Legacy ${randomUUID()}`,
      body: "Legacy terms",
    });
    assert.equal(legacy.status, 201);
    assert.equal(legacy.body.status, "published");
    const legacyRevision = await call(
      manager,
      `/agreement-templates/${legacy.body.id}/revise`,
      { body: "Legacy revised terms" },
    );
    assert.equal(legacyRevision.status, 201);
    assert.equal(legacyRevision.body.status, "published");
    assert.equal(legacyRevision.body.version, 2);
    assert(
      (
        await pool.query(
          "SELECT 1 FROM audit_event WHERE entity_id=$1 AND action='agreement-template.published'",
          [publishedRevision.id],
        )
      ).rowCount,
    );
  },
);

test(
  "template library migration preserves populated legacy rows without guessing revision families",
  { skip: !base },
  async () => {
    const client = await pool.connect(),
      schema = `template_migration_${randomUUID().replaceAll("-", "")}`;
    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query('CREATE TABLE "user" (id text PRIMARY KEY)');
      await client.query('INSERT INTO "user"(id) VALUES($1)', ["legacy-owner"]);
      const prior = await readFile(
        new URL(
          "../../migrations/dashboard/0027_jobs_lifecycle.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await client.query(
        prior.slice(
          prior.indexOf("CREATE TABLE agreement_template"),
          prior.indexOf("ALTER TABLE estimate"),
        ),
      );
      const oldId = randomUUID(),
        currentId = randomUUID();
      await client.query(
        "INSERT INTO agreement_template(id,name,version,body,active,created_by) VALUES($1,'Existing agreement',1,'Historical exact terms',false,'legacy-owner'),($2,'Existing agreement',2,'Current exact terms',true,'legacy-owner')",
        [oldId, currentId],
      );
      const before = (
        await client.query("SELECT * FROM agreement_template ORDER BY version")
      ).rows;
      const migration = await readFile(
        new URL(
          "../../migrations/dashboard/0029_agreement_template_library.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await client.query(migration);
      const after = (
        await client.query("SELECT * FROM agreement_template ORDER BY version")
      ).rows;
      assert.equal(after.length, 2);
      for (let i = 0; i < before.length; i++) {
        for (const key of Object.keys(before[i]))
          assert.deepEqual(after[i][key], before[i][key], key);
        assert.equal(after[i].kind, "msa");
        assert.equal(after[i].family_id, after[i].id);
        assert.equal(after[i].edit_version, 1);
      }
      assert.equal(after[0].status, "archived");
      assert.equal(after[1].status, "published");
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  },
);
