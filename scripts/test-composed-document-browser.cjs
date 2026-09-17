const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");
const fs = require("node:fs");
const document = {
  title: "Synthetic grounds maintenance agreement",
  revision: 2,
  client_name: "José Álvarez",
  property_name: "Café grounds",
  address: "Synthetic property address",
  scope: "LEGACY-SCOPE-MUST-NOT-DUPLICATE",
  terms: "LEGACY-TERMS-MUST-NOT-DUPLICATE",
  line_items: [],
  amount_cents: 55000,
  expires_at: "2032-01-31T00:00:00Z",
  composition_document: {
    schemaVersion: 1,
    preparedOn: "2032-01-01",
    startsOn: "2032-01-15",
    endsOn: "2032-02-29",
    terms:
      "Agreed MSA opening.\nLiteral <script>terms remain text</script>.\nFinal MSA paragraph.",
    scopeNotes: "Shared access instructions.\nPreserve gates and paths.",
    costNotes: "No additional work without approval.",
    packageNotes: "Client-specific package terms.",
    exclusions: "Tree removal is excluded.",
    authorizedAmountCents: 55000,
    components: [
      {
        title: "One-time work",
        basis: "one_time",
        scope: [
          { title: "Initial cleanup", description: "Remove fallen branches." },
        ],
        costs: [
          {
            description: "Initial cleanup",
            quantity: 1,
            unit: "job",
            unitPriceCents: 10000,
            totalCents: 10000,
          },
        ],
        rateCents: 10000,
        authorizedAmountCents: 10000,
        maximumVisits: null,
        periods: [],
        schedule: null,
      },
      {
        title: "Monthly services",
        basis: "fixed_monthly",
        scope: [
          {
            title: "Grounds care",
            description: "Maintain café access and planting areas.",
          },
        ],
        costs: [
          {
            description: "Monthly care",
            quantity: 1,
            unit: "month",
            unitPriceCents: 20000,
            totalCents: 20000,
          },
        ],
        rateCents: 20000,
        authorizedAmountCents: 30000,
        maximumVisits: null,
        periods: [
          { startsOn: "2032-01-15", endsOn: "2032-01-31", amountCents: 10000 },
          { startsOn: "2032-02-01", endsOn: "2032-02-29", amountCents: 20000 },
        ],
        schedule: {
          cadence: "weekly",
          intervalCount: 2,
          localTime: "09:30",
          firstVisitOn: "2032-01-15",
          timeZone: "America/New_York",
        },
      },
      {
        title: "Per-visit services",
        basis: "per_visit",
        scope: [
          {
            title: "Storm visits",
            description: "Inspect property following a storm.",
          },
        ],
        costs: [
          {
            description: "Storm assessment",
            quantity: 1,
            unit: "visit",
            unitPriceCents: 5000,
            totalCents: 5000,
          },
        ],
        rateCents: 5000,
        authorizedAmountCents: 15000,
        maximumVisits: 3,
        periods: [],
        schedule: {
          cadence: "monthly",
          intervalCount: 1,
          localTime: "10:00",
          firstVisitOn: "2032-01-16",
          timeZone: "America/New_York",
        },
      },
    ],
  },
};
fs.writeFileSync(
  "/tmp/p1-composed-document-fixture.json",
  JSON.stringify(document),
);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1280, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/public/estimates/**", (route) =>
      route.fulfill({ json: document }),
    );
    await page.goto(
      "http://127.0.0.1:4347/estimate-approval/synthetic-composed",
    );
    await page
      .getByRole("heading", {
        name: "Maximum authorized amount: $550.00 USD",
        exact: true,
      })
      .waitFor();
    for (const text of [
      "Monthly charge: 2032-01-15 through 2032-01-31 — $100.00 USD",
      "Monthly charge: 2032-02-01 through 2032-02-29 — $200.00 USD",
      "Maximum authorized visits: 3",
      "Combined rate: $200.00 USD per month",
      "Combined rate: $50.00 USD per visit",
      "Combined rate: $100.00 USD one time",
      "Tree removal is excluded.",
      "Client-specific package terms.",
    ])
      assert.equal(
        await page.getByText(text, { exact: true }).count(),
        1,
        text,
      );
    const narrative = await page.locator(".composed-proposal").innerText();
    assert(!narrative.includes("LEGACY-"));
    assert(narrative.includes("Literal <script>terms remain text</script>"));
    assert.equal(await page.locator(".composed-proposal script").count(), 0);
    assert.equal(
      await page
        .getByText("Agreed MSA opening.", { exact: false })
        .evaluate((node) => getComputedStyle(node).whiteSpace),
      "pre-wrap",
    );
    assert.equal(
      await page
        .getByRole("link", { name: "Download PDF", exact: true })
        .getAttribute("href"),
      "/api/public/estimates/synthetic-composed/pdf",
    );
    await page.screenshot({
      path: "/tmp/p1-composed-document-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => window.document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "/tmp/p1-composed-document-mobile.png",
      fullPage: true,
    });
    document.composition_document.changeOrder={title:"Original approved agreement",revision:2};
    await page.reload();
    await page.getByRole("heading",{name:"Additional work for Original approved agreement, revision 2",exact:true}).waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "Composed customer document passed: all components, explicit periods/visit limits, shared terms, literal text, PDF link and mobile layout.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
