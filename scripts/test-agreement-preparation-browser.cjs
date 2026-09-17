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
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const id = randomUUID(),
      estimate = randomUUID();
    const content = {
      terms: "Synthetic MSA",
      scope: { items: [], exclusions: "" },
      costs: { items: [] },
      notes: { scope: "", cost: "", package: "" },
    };
    let row = {
      id,
      title: "Synthetic preparation",
      client_id: randomUUID(),
      property_id: randomUUID(),
      lead_id: null,
      source_estimate_id: null,
      estimate_id: null,
      status: "draft",
      version: 4,
      content,
      dates: {
        preparedOn: "2030-01-01",
        startsOn: "2030-01-01",
        endsOn: "2030-12-31",
      },
      source_templates: [],
      context_snapshot: {
        "client.name": "Synthetic client",
        "property.name": "Synthetic property",
      },
      updated_at: "2030-01-01T00:00:00Z",
      pricing_plan: {
        sourceVersion: 4,
        review: {
          pricingValid: true,
          authorizedAmountCents: 150000,
          allocations: [
            { basis: "fixed_monthly", authorizedAmountCents: 120000 },
            {
              basis: "per_visit",
              authorizedAmountCents: 30000,
              maximumVisits: 3,
            },
          ],
        },
      },
      preview: {
        content,
        unresolvedPlaceholders: [],
        totalsByBasis: { fixed_monthly: 10000, per_visit: 10000 },
      },
    };
    const requests = [];
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let json = [];
      if (path === "/api/v1/setup")
        json = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        json = {
          id: "synthetic",
          name: "Sales staff",
          role: "member",
          capabilities: ["revenue.sales"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = { clients: [], properties: [], staff: [] };
      if (path === `/api/v1/agreement-drafts/${id}`) json = row;
      if (path === `/api/v1/agreement-drafts/${id}/prepare`) {
        requests.push(route.request().postDataJSON());
        if (requests.length === 1) return route.abort("failed");
        row = { ...row, status: "prepared", version: 5, estimate_id: estimate };
        json = { draft: row, created: false, estimateId: estimate };
      }
      await route.fulfill({ json });
    });
    await page.goto(`http://127.0.0.1:4347/agreements/drafts/${id}`);
    await page
      .getByRole("button", { name: "Prepare proposal", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Prepare proposal", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Prepare proposal", exact: true })
      .click();
    assert.equal(requests.length, 0, "first visit dates required");
    await page
      .getByLabel("First visit", { exact: true })
      .nth(0)
      .fill("2030-01-07");
    await page
      .getByLabel("First visit", { exact: true })
      .nth(1)
      .fill("2030-02-01");
    await page
      .getByRole("combobox", { name: /Cadence/ })
      .nth(1)
      .selectOption("monthly");
    await page
      .getByRole("button", { name: "Prepare proposal", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Retry same preparation" })
      .waitFor();
    assert.equal(await page.getByLabel("Valid for days").isDisabled(), true);
    assert.equal(
      await page.getByRole("button", { name: "Back to draft" }).isDisabled(),
      true,
    );
    await page.getByRole("button", { name: "Retry same preparation" }).click();
    await page.getByRole("link", { name: "Open proposal in Sales" }).waitFor();
    assert.deepEqual(requests[0], requests[1]);
    assert.equal(requests[0].expectedVersion, 4);
    assert.deepEqual(
      requests[0].schedules.map((s) => [s.basis, s.cadence, s.firstVisitOn]),
      [
        ["fixed_monthly", "weekly", "2030-01-07"],
        ["per_visit", "monthly", "2030-02-01"],
      ],
    );
    assert.equal(
      await page
        .getByRole("link", { name: "Open proposal in Sales" })
        .getAttribute("href"),
      `/sales#estimate-${estimate}`,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Preparation browser checks passed: required dates, separate schedules, lost-response exact retry, frozen inputs, prepared Sales link.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
