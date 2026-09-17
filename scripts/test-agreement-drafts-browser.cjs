const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
    });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const clientId = randomUUID(),
      propertyId = randomUUID(),
      leadId = randomUUID();
    const refs = {
      clients: [{ id: clientId, name: "Synthetic Client" }],
      properties: [
        {
          id: propertyId,
          client_id: clientId,
          name: "Synthetic Property",
          address: "Synthetic address",
        },
      ],
      staff: [],
    };
    const template = {
      id: randomUUID(),
      kind: "package",
      name: "Synthetic package",
      status: "published",
      version: 3,
      edit_version: 1,
      payload: {},
      body: "",
      description: "",
    };
    const replacement = {
      ...template,
      id: randomUUID(),
      kind: "scope",
      name: "Replacement scope",
      body: "Replacement notes",
      payload: {
        items: [
          {
            id: randomUUID(),
            title: "Replacement scope item",
            description: "New scope detail",
          },
        ],
        exclusions: "Replacement exclusion",
      },
    };
    let applyConflict = true,
      applyCount = 0;
    let row,
      lostResponse = true,
      conflict = false,
      readOnly = false,
      deny = false,
      lastUpdate,
      contextUpdate,
      catalogFail = true;
    const creates = [],
      writes = [];
    const preview = () => ({
      content: {
        ...structuredClone(row.content),
        terms: row.content.terms.replace(
          "{{client.name}}",
          row.client_id ? "Synthetic Client" : "{{client.name}}",
        ),
        costs: {
          items: row.content.costs.items.map((item) => ({
            ...item,
            totalCents: Math.round(item.quantity * item.unitPriceCents),
          })),
        },
      },
      unresolvedPlaceholders: row.client_id ? [] : ["client.name"],
      totalsByBasis: { one_time: 0, fixed_monthly: 0, per_visit: 12501 },
    });
    await page.route("**/api/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        path = url.pathname,
        method = request.method();
      let body = [];
      if (path === "/api/v1/setup")
        body = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        body = {
          id: "synthetic",
          name: "Agreement staff",
          role: "member",
          capabilities: deny
            ? []
            : [readOnly ? "revenue.agreements" : "revenue.sales"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references") body = refs;
      if (path === "/api/v1/leads")
        body = [
          {
            id: leadId,
            name: "Synthetic inquiry",
            location: "Inquiry location",
            email: "",
            description: "",
            status: "new",
            created_at: new Date().toISOString(),
          },
        ];
      if (path === "/api/v1/agreement-templates") {
        if (catalogFail)
          return route.fulfill({
            status: 503,
            json: { message: "Synthetic catalog unavailable" },
          });
        body = [template, replacement];
      }
      if (path === "/api/v1/agreement-drafts") {
        if (method === "POST") {
          const input = request.postDataJSON();
          creates.push(input);
          if (!row) {
            row = {
              id: randomUUID(),
              title: input.title,
              client_id: input.context.clientId || null,
              property_id: input.context.propertyId || null,
              lead_id: input.context.leadId || null,
              source_estimate_id: null,
              estimate_id: null,
              status: "draft",
              version: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: "synthetic",
              dates: { preparedOn: null, startsOn: null, endsOn: null },
              source_templates: [{ ...template }],
              context_snapshot: {
                "client.name": input.context.clientId
                  ? "Synthetic Client"
                  : null,
                "property.name": null,
              },
              content: {
                terms: "Terms for {{client.name}}",
                scope: {
                  items: [
                    {
                      id: randomUUID(),
                      title: "Synthetic scope",
                      description: "Scope detail",
                    },
                  ],
                  exclusions: "",
                },
                costs: {
                  items: [
                    {
                      id: randomUUID(),
                      description: "Synthetic service",
                      unit: "visit",
                      quantity: 1.25,
                      unitPriceCents: 10001,
                      basis: "per_visit",
                    },
                  ],
                },
                notes: { scope: "", cost: "", package: "" },
              },
            };
            row.preview = preview();
          }
          if (lostResponse) {
            lostResponse = false;
            return route.abort("failed");
          }
          body = row;
        } else body = { items: row ? [row] : [], nextCursor: null };
      }
      if (row && path === `/api/v1/agreement-drafts/${row.id}`) {
        if (method === "PUT") {
          lastUpdate = request.postDataJSON();
          writes.push(lastUpdate);
          if (conflict)
            return route.fulfill({
              status: 409,
              json: { message: "Synthetic agreement version conflict" },
            });
          row = { ...row, ...lastUpdate, version: row.version + 1 };
          row.preview = preview();
        }
        body = row;
      }
      if (row && path === `/api/v1/agreement-drafts/${row.id}/context`) {
        contextUpdate = request.postDataJSON();
        row = {
          ...row,
          client_id: contextUpdate.context.clientId,
          property_id: contextUpdate.context.propertyId,
          lead_id: contextUpdate.context.leadId,
          version: row.version + 1,
          context_snapshot: {
            "client.name": "Synthetic Client",
            "property.name": "Synthetic Property",
          },
        };
        row.preview = preview();
        body = row;
      }

      if (
        row &&
        path === `/api/v1/agreement-drafts/${row.id}/templates/review`
      ) {
        const input = request.postDataJSON();
        assert.equal(input.selection.scopeId, replacement.id);
        assert.deepEqual(input.sections, ["scope"]);
        body = {
          draftId: row.id,
          expectedVersion: row.version,
          reviewToken: "a".repeat(64),
          sections: input.sections,
          before: row.content,
          after: {
            ...row.content,
            scope: replacement.payload,
            notes: { ...row.content.notes, scope: replacement.body },
          },
          preview: row.preview,
          sources: [replacement],
        };
      }
      if (
        row &&
        path === `/api/v1/agreement-drafts/${row.id}/templates/apply`
      ) {
        const input = request.postDataJSON();
        applyCount++;
        assert.equal(input.reviewToken, "a".repeat(64));
        assert.equal(input.expectedVersion, row.version);
        if (applyConflict)
          return route.fulfill({
            status: 409,
            json: { message: "Synthetic replacement changed" },
          });
        row = {
          ...row,
          version: row.version + 1,
          content: {
            ...row.content,
            scope: replacement.payload,
            notes: { ...row.content.notes, scope: replacement.body },
          },
          source_templates: [...row.source_templates, replacement],
        };
        row.preview = preview();
        body = row;
      }
      return route.fulfill({ json: body });
    });
    await page.goto("http://127.0.0.1:4347/agreements/drafts");
    await page
      .getByRole("button", { name: "New agreement draft", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Synthetic catalog unavailable" })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Create agreement draft", exact: true })
        .isDisabled(),
      true,
    );
    catalogFail = false;
    await page
      .getByRole("button", { name: "Refresh published templates", exact: true })
      .click();
    await page
      .getByLabel("Agreement title", { exact: true })
      .fill("Synthetic agreement");
    await page
      .getByLabel("Agreement inquiry", { exact: true })
      .selectOption(leadId);
    await page
      .getByLabel("Agreement package", { exact: true })
      .selectOption(template.id);
    await page
      .getByRole("button", { name: "Create agreement draft", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Retry uses the same request" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Agreement title", { exact: true }).isDisabled(),
      true,
    );
    await page
      .getByRole("button", { name: "Retry creating this draft", exact: true })
      .click();
    await page
      .getByRole("region", { name: "Client agreement draft", exact: true })
      .waitFor();
    assert.equal(creates.length, 2);
    assert.deepEqual(creates[0], creates[1]);
    assert.equal(creates[0].context.leadId, leadId);
    assert.equal(new URL(page.url()).pathname, `/agreements/drafts/${row.id}`);
    assert.equal(
      await page.getByText("Unresolved placeholders", { exact: true }).count(),
      1,
    );
    await page
      .getByLabel("Agreement terms", { exact: true })
      .fill("Private terms for {{client.name}}");
    await page.getByLabel("Unit price (USD)", { exact: true }).fill("100.01");
    await page.getByLabel("Quantity", { exact: true }).fill("1.25");
    await page
      .getByText("Unsaved changes are not shown here.", { exact: false })
      .waitFor();
    const savedPreview = page.getByRole("region", {
      name: "Saved agreement preview",
    });
    assert.equal(
      await savedPreview.getByText("Private terms", { exact: false }).count(),
      0,
    );
    await page.getByLabel("Quantity", { exact: true }).fill("0.001");
    await page
      .getByRole("button", { name: "Save agreement draft", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({
        hasText: "Quantity must be positive with at most two decimal places",
      })
      .waitFor();
    assert.equal(writes.length, 0);
    await page.getByLabel("Quantity", { exact: true }).fill("1.25");
    conflict = true;
    await page
      .getByRole("button", { name: "Save agreement draft", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Synthetic agreement version conflict" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Agreement terms", { exact: true }).inputValue(),
      "Private terms for {{client.name}}",
    );
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Reload saved draft", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Agreement terms", { exact: true }).inputValue(),
      "Private terms for {{client.name}}",
    );
    conflict = false;
    await page
      .getByRole("button", { name: "Save agreement draft", exact: true })
      .click();
    await page
      .getByRole("heading", {
        name: "Saved draft preview · version 2",
        exact: true,
      })
      .waitFor();
    assert.equal(lastUpdate.content.costs.items[0].unitPriceCents, 10001);
    assert.equal(lastUpdate.content.costs.items[0].quantity, 1.25);
    assert.equal(lastUpdate.content.costs.items[0].basis, "per_visit");
    assert.equal(lastUpdate.expectedVersion, 1);
    await page
      .getByRole("button", { name: "Change agreement context", exact: true })
      .click();
    await page
      .getByLabel("Agreement client", { exact: true })
      .selectOption(clientId);
    await page
      .getByLabel("Agreement property", { exact: true })
      .selectOption(propertyId);
    await page
      .getByRole("button", { name: "Save agreement context", exact: true })
      .click();
    await page
      .getByRole("heading", {
        name: "Saved draft preview · version 3",
        exact: true,
      })
      .waitFor();
    assert.equal(contextUpdate.expectedVersion, 2);
    await savedPreview
      .getByText("Private terms for Synthetic Client", { exact: true })
      .waitFor();
    assert.equal(row.content.terms, "Private terms for {{client.name}}");
    await page
      .getByLabel("Agreement terms", { exact: true })
      .fill("Discard this local edit");
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Reload saved draft", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector('textarea[aria-label="Agreement terms"]')
          .value === "Private terms for {{client.name}}",
    );

    await page
      .getByRole("button", { name: "Replace template sections", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Reload saved draft", exact: true })
        .isDisabled(),
      true,
    );
    await page
      .getByRole("checkbox", { name: "Scope and scope notes", exact: true })
      .check();
    await page
      .getByLabel("Scope and scope notes replacement", { exact: true })
      .selectOption(replacement.id);
    await page
      .getByRole("button", { name: "Compare replacement", exact: true })
      .click();
    await page.getByText("Replacement scope item", { exact: true }).waitFor();
    assert.equal(row.content.scope.items[0].title, "Synthetic scope");
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Apply reviewed replacement", exact: true })
      .click();
    assert.equal(applyCount, 0);
    await page
      .getByRole("checkbox", { name: "Scope and scope notes", exact: true })
      .uncheck();
    assert.equal(
      await page
        .getByRole("button", {
          name: "Apply reviewed replacement",
          exact: true,
        })
        .count(),
      0,
    );
    await page
      .getByRole("checkbox", { name: "Scope and scope notes", exact: true })
      .check();
    await page
      .getByLabel("Scope and scope notes replacement", { exact: true })
      .selectOption(replacement.id);
    await page
      .getByRole("button", { name: "Compare replacement", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Apply reviewed replacement", exact: true })
      .waitFor();
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Apply reviewed replacement", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Synthetic replacement changed" })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", {
          name: "Apply reviewed replacement",
          exact: true,
        })
        .count(),
      0,
    );
    assert.equal(row.content.scope.items[0].title, "Synthetic scope");
    applyConflict = false;
    await page
      .getByRole("button", { name: "Compare replacement", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Apply reviewed replacement", exact: true })
      .waitFor();
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Apply reviewed replacement", exact: true })
      .click();
    await page
      .getByRole("heading", {
        name: "Saved draft preview · version 4",
        exact: true,
      })
      .waitFor();
    assert.equal(row.content.terms, "Private terms for {{client.name}}");
    assert.equal(row.content.costs.items[0].unitPriceCents, 10001);
    assert.equal(row.content.scope.items[0].title, "Replacement scope item");
    readOnly = true;
    await page.reload();
    await page
      .getByText("This agreement draft is read-only.", { exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Agreement terms", { exact: true }).isDisabled(),
      true,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Save agreement draft", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Change agreement context", exact: true })
        .count(),
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: "/tmp/p1-agreement-draft-mobile.png",
      fullPage: false,
    });
    deny = true;
    await page.reload();
    await page.waitForURL("**/profile");
    assert.equal(
      await page
        .getByRole("region", { name: "Client agreement draft", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Agreement drafts browser passed: lost response/idempotent retry, exact source selection, saved preview, CAS conflict, reload discard, exact costs, context refresh, read-only and denied grants, mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
