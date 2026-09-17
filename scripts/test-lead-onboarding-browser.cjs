const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.dismiss());
    let grant = true,
      stage = "qualified",
      version = 1,
      linked = null,
      failRead = true,
      conflict = true,
      loseResponse = true;
    const posts = [];
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      let json = [];
      if (path === "/api/v1/setup")
        json = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        json = {
          id: "staff",
          name: "Colleague",
          role: "member",
          capabilities: grant
            ? ["revenue.sales", "customers.clients"]
            : ["revenue.sales"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = {
          clients: [
            {
              id: "20000000-0000-4000-8000-000000000001",
              name: "Existing client",
            },
          ],
          properties: [],
          staff: [],
        };
      if (path === "/api/v1/commercial-inquiries")
        json = { items: [], nextCursor: null };
      if (path === "/api/v1/sales/inquiries")
        json = {
          items: [
            {
              id: "first",
              name: "First inquiry",
              status: stage,
              version,
              location: "Site",
              description: "Inquiry",
            },
          ],
          nextCursor: null,
        };
      if (path.endsWith("/onboarding")) {
        if (req.method() === "POST") {
          const body = req.postDataJSON();
          posts.push(body);
          if (conflict) {
            conflict = false;
            version++;
            return route.fulfill({ status: 409, json: { error: "Stale" } });
          }
          linked = "20000000-0000-4000-8000-000000000001";
          if (loseResponse) {
            loseResponse = false;
            return route.abort();
          }
          json = { clientId: linked, version: version + 1, replayed: true };
        } else {
          if (failRead) {
            failRead = false;
            return route.fulfill({ status: 503, json: { error: "Synthetic" } });
          }
          json = {
            id: "first",
            version,
            status: stage,
            clientId: linked,
            clientName: linked ? "Reviewed name" : null,
            clientArchived: false,
          };
        }
      }
      return route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/sales");
    await page
      .getByRole("button", { name: "Customer onboarding", exact: true })
      .click();
    const area = page.getByRole("region", {
      name: "Customer onboarding",
      exact: true,
    });
    await area.getByRole("alert").waitFor();
    await area.getByRole("button", { name: "Refresh onboarding" }).click();
    await area.getByText("Mark this inquiry Won", { exact: false }).waitFor();
    assert.equal(posts.length, 0);
    stage = "won";
    await area.getByRole("button", { name: "Refresh onboarding" }).click();
    await area.getByLabel("Onboarding choice").selectOption("create");
    await area
      .getByLabel("Customer name", { exact: true })
      .fill("Reviewed name");
    await area
      .getByLabel("Customer email", { exact: true })
      .fill("reviewed@example.test");
    await area
      .getByRole("button", { name: "Create and link customer" })
      .click();
    await area.getByRole("alert").waitFor();
    assert(
      await area
        .getByRole("button", { name: "Create and link customer" })
        .isDisabled(),
    );
    assert.equal(
      await area.getByLabel("Customer name", { exact: true }).inputValue(),
      "Reviewed name",
    );
    await area.getByRole("button", { name: "Refresh onboarding" }).click();
    await area
      .getByRole("button", { name: "Create and link customer" })
      .click();
    await area
      .getByRole("button", { name: "Retry customer onboarding" })
      .waitFor();
    assert(
      await area.getByLabel("Customer name", { exact: true }).isDisabled(),
    );
    assert(
      await area
        .getByRole("button", { name: "Refresh onboarding" })
        .isDisabled(),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const e = document.querySelector(".sidebar");
      return !e || e.getBoundingClientRect().right <= 0;
    });
    assert(await area.evaluate((e) => e.scrollWidth <= e.clientWidth));
    await area.screenshot({ path: "/tmp/p1-onboarding-mobile.png" });
    await area
      .getByRole("button", { name: "Retry customer onboarding" })
      .click();
    await area.getByText("Customer linked.", { exact: false }).waitFor();
    assert.deepEqual(posts[1], posts[2]);
    assert.notEqual(posts[0].operationId, posts[1].operationId);
    assert.equal(posts[1].expectedVersion, 2);
    assert.deepEqual(posts[1].customer, {
      create: {
        name: "Reviewed name",
        email: "reviewed@example.test",
        phone: null,
      },
    });
    assert.equal(
      await area
        .getByRole("link", { name: "Reviewed name" })
        .getAttribute("href"),
      "/clients/20000000-0000-4000-8000-000000000001",
    );
    grant = false;
    await page.reload();
    await page.getByText("First inquiry", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Customer onboarding", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Won onboarding browser passed: stage gate, failure recovery, stale drafts, exact uncertain retry, customer link, grants and mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
