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
    let accept = false;
    page.on("dialog", (d) => (accept ? d.accept() : d.dismiss()));
    const id = "10000000-0000-4000-8000-000000000001";
    let saved = {
        id,
        version: 1,
        name: "Original contact",
        email: "old@example.test",
        phone: null,
        reported_company_name: null,
        location: "Original site",
        description: "Original message",
      },
      patches = [],
      failRead = false;
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        path = url.pathname;
      let json = [];
      if (path === "/api/v1/setup")
        json = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        json = {
          id: "sales",
          name: "Sales colleague",
          role: "member",
          capabilities: ["revenue.sales"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = { clients: [], properties: [], staff: [] };
      if (path === "/api/v1/commercial-inquiries")
        json = { items: [], nextCursor: null };
      if (path === "/api/v1/sales/inquiries")
        json = { items: [{ ...saved, status: "new" }], nextCursor: null };
      if (path === `/api/v1/leads/${id}/details`) {
        if (req.method() === "PATCH") {
          const body = req.postDataJSON();
          patches.push(body);
          if (patches.length === 1) {
            saved = { ...saved, name: "Other colleague", version: 2 };
            return route.fulfill({ status: 409, json: { message: "Changed" } });
          }
          assert.equal(body.expectedVersion, 2);
          saved = { ...saved, ...body, version: 3 };
          delete saved.expectedVersion;
          return route.abort("failed");
        }
        if (failRead)
          return route.fulfill({
            status: 503,
            json: { message: "Unavailable" },
          });
        json = saved;
      }
      if (path === `/api/v1/leads/${id}/details/history`) {
        const older = url.searchParams.has("beforeVersion");
        json = {
          items: [
            {
              version: older ? 1 : 2,
              kind: older ? "created" : "edited",
              actor_name: older ? null : "Sales colleague",
              recorded_at: "2030-01-01T00:00:00Z",
              fields: {
                ...saved,
                description: older
                  ? "Original <img src=x onerror=alert(1)>"
                  : "Corrected message",
              },
            },
          ],
          nextBeforeVersion: older ? null : 2,
        };
      }
      return route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/sales");
    await page
      .getByRole("button", { name: "Contact & inquiry details", exact: true })
      .click();
    const area = page.getByRole("region", { name: "Inquiry contact details" });
    await area
      .getByLabel("Contact name", { exact: true })
      .fill("My correction");
    await area
      .getByRole("button", { name: "Save inquiry details", exact: true })
      .click();
    await area.getByRole("alert").waitFor();
    assert.equal(
      await area.getByLabel("Contact name", { exact: true }).inputValue(),
      "My correction",
    );
    assert(await area.getByLabel("Contact name", { exact: true }).isDisabled());
    await area
      .getByRole("button", { name: "Reload inquiry details", exact: true })
      .click();
    assert.equal(
      await area.getByLabel("Contact name", { exact: true }).inputValue(),
      "My correction",
    );
    accept = true;
    failRead = true;
    await area
      .getByRole("button", { name: "Reload inquiry details", exact: true })
      .click();
    await area
      .getByText(
        "Could not load inquiry details. Your local changes are retained.",
      )
      .waitFor();
    assert.equal(
      await area.getByLabel("Contact name", { exact: true }).inputValue(),
      "My correction",
    );
    failRead = false;
    await area
      .getByRole("button", { name: "Reload inquiry details", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector('[aria-label="Contact name"]')?.value ===
        "Other colleague",
    );
    await area
      .getByLabel("Contact name", { exact: true })
      .fill("Final correction");
    await area
      .getByLabel("Company", { exact: true })
      .fill("Company correction");
    await area
      .getByRole("button", { name: "Load older detail history", exact: true })
      .click();
    await area.getByText(/Version 1 · created/).click();
    assert.equal(await area.locator("img").count(), 0);
    await area
      .getByText("Original <img src=x onerror=alert(1)>", { exact: true })
      .waitFor();
    assert.equal(
      await area.getByLabel("Contact name", { exact: true }).inputValue(),
      "Final correction",
    );
    accept = false;
    assert.equal(
      await page.evaluate(() =>
        window.dispatchEvent(
          new Event("p1:before-navigation", { cancelable: true }),
        ),
      ),
      false,
    );
    await area
      .getByRole("button", { name: "Save inquiry details", exact: true })
      .click();
    await area.getByRole("alert").waitFor();
    assert(await area.getByLabel("Contact name", { exact: true }).isDisabled());
    accept = true;
    await area
      .getByRole("button", { name: "Reload inquiry details", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector('[aria-label="Contact name"]')?.value ===
          "Final correction" &&
        !document.querySelector('[aria-label="Contact name"]')?.disabled,
    );
    assert.equal(patches.length, 2);
    assert.equal(
      await area.getByLabel("Company", { exact: true }).inputValue(),
      "Company correction",
    );
    assert(
      await area
        .getByRole("button", { name: "Save inquiry details", exact: true })
        .isDisabled(),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const e = document.querySelector(".sidebar");
      return !e || e.getBoundingClientRect().right <= 0;
    });
    assert(await area.evaluate((e) => e.scrollWidth <= e.clientWidth));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: "/tmp/p1-lead-details-mobile.png", fullPage: true });
    assert.deepEqual(errors, []);
    console.log(
      "Lead details browser passed: stale and lost-response recovery, retained drafts, literal history, navigation guard and mobile containment.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
