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
    const scopes = ["Setup", "Monthly care", "Visits"].map((title) => ({
      id: randomUUID(),
      title,
      description: "Synthetic scope",
    }));
    const bases = ["one_time", "fixed_monthly", "per_visit"];
    const costs = bases.map((basis) => ({
      id: randomUUID(),
      description: basis,
      basis,
      unit: "unit",
      quantity: 1,
      unitPriceCents: 10001,
      totalCents: 10001,
    }));
    const row = {
      id: randomUUID(),
      title: "Synthetic mixed agreement",
      client_id: randomUUID(),
      property_id: randomUUID(),
      lead_id: null,
      source_estimate_id: null,
      estimate_id: null,
      status: "draft",
      version: 7,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: "synthetic",
      source_templates: [],
      context_snapshot: {
        "client.name": "Synthetic client",
        "property.name": "Synthetic property",
      },
      dates: { preparedOn: null, startsOn: "2032-01-15", endsOn: "2032-02-29" },
      content: {
        terms: "Synthetic terms",
        scope: { items: scopes, exclusions: "" },
        costs: { items: costs },
        notes: { scope: "", cost: "", package: "" },
      },
    };
    row.preview = {
      content: row.content,
      unresolvedPlaceholders: [],
      totalsByBasis: Object.fromEntries(bases.map((basis) => [basis, 10001])),
    };
    let readOnly = false,
      stale = false,
      requests = [];
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body = [];
      if (path === "/api/v1/setup")
        body = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        body = {
          id: "synthetic",
          name: "Staff",
          role: "member",
          capabilities: [readOnly ? "revenue.agreements" : "revenue.sales"],
          mfaRequired: false,
        };
      if (path === `/api/v1/agreement-drafts/${row.id}`) body = row;
      if (path === `/api/v1/agreement-drafts/${row.id}/pricing/review`) {
        const input = route.request().postDataJSON();
        requests.push(input);
        if (stale)
          return route.fulfill({
            status: 409,
            json: { message: "Draft changed; reload before review" },
          });
        const needsReview = !input.allocations[1].periods[0].reviewReason;
        body = {
          sourceVersion: 7,
          pricingValid: !needsReview,
          authorizedAmountCents: needsReview ? null : 45004,
          unallocatedScopeRowIds: [],
          blockers: needsReview
            ? [
                {
                  code: "period_review_required",
                  basis: "fixed_monthly",
                  message: "Explain the partial period.",
                },
              ]
            : [],
          allocations: input.allocations.map((allocation, i) => ({
            ...allocation,
            costRowIds: [costs[i].id],
            rateCents: 10001,
            maximumVisits: allocation.maximumVisits || null,
            periods: allocation.periods || [],
            authorizedAmountCents: [10001, 15001, 20002][i],
          })),
        };
      }
      return route.fulfill({ json: body });
    });
    await page.goto(`http://127.0.0.1:4347/agreements/drafts/${row.id}`);
    await page
      .getByRole("button", { name: "Review pricing allocations" })
      .click();
    for (const [i, label] of [
      "One-time",
      "Fixed monthly",
      "Per visit",
    ].entries())
      await page
        .getByRole("region", { name: `${label} allocation`, exact: true })
        .getByRole("checkbox", { name: scopes[i].title })
        .check();
    await page.getByLabel("Maximum authorized visits").fill("2");
    const amounts = page.getByLabel("Period amount (USD)", { exact: true });
    await amounts.nth(0).fill("50.00");
    await amounts.nth(1).fill("100.01");
    await page
      .getByRole("button", { name: "Calculate authorized amounts" })
      .click();
    await page.getByText("Explain the partial period.").waitFor();
    assert.equal(requests[0].expectedVersion, 7);
    assert.equal(requests[0].allocations[1].periods[0].amountCents, 5000);
    assert.equal(requests[0].allocations[1].periods[1].endsOn, "2032-02-29");
    await page
      .getByLabel("Charge review explanation")
      .nth(0)
      .fill("Reviewed first partial month");
    assert.equal(
      await page.getByRole("region", { name: "Pricing review result" }).count(),
      0,
    );
    await page
      .getByRole("button", { name: "Calculate authorized amounts" })
      .click();
    await page.getByText("Combined authorized maximum: $450.04").waitFor();
    await page.getByLabel("Maximum authorized visits").fill("3");
    assert.equal(
      await page.getByRole("region", { name: "Pricing review result" }).count(),
      0,
    );
    stale = true;
    await page
      .getByRole("button", { name: "Calculate authorized amounts" })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "reload before review" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Maximum authorized visits").inputValue(),
      "3",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Back to agreement draft" }).click();
    readOnly = true;
    await page.reload();
    await page.getByText("This agreement draft is read-only.").waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Review pricing allocations" })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Agreement pricing UI passed: exact amounts, leap/partial periods, explicit scope, blockers, invalidation, conflict retention, mobile, and read-only access.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
