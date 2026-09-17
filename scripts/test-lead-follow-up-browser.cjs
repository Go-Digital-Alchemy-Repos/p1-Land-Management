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
    const page = await browser.newPage({ timezoneId: "America/New_York" });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let confirm = false;
    page.on("dialog", (d) => (confirm ? d.accept() : d.dismiss()));
    const id = "10000000-0000-4000-8000-000000000001";
    let lead = {
        id,
        name: "General inquiry fixture",
        status: "new",
        owner_id: null,
        next_action: null,
        next_action_due_at: null,
        last_activity_at: null,
        version: 1,
        converted_client_id: null,
        converted_property_id: null,
      },
      patches = [],
      failRead = false;
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
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
      if (path === "/api/v1/leads")
        json = [
          { ...lead, location: "Test site", description: "Original inquiry" },
        ];
      if (path === "/api/v1/commercial-inquiries")
        json = { items: [], nextCursor: null };
      if (path === `/api/v1/leads/${id}/follow-up`) {
        if (req.method() === "PATCH") {
          const body = req.postDataJSON();
          patches.push(body);
          if (patches.length === 1) {
            lead = {
              ...lead,
              version: 2,
              status: "contacted",
              next_action: "Changed by another colleague",
            };
            return route.fulfill({
              status: 409,
              json: { error: "Inquiry changed" },
            });
          }
          lead = {
            ...lead,
            version: lead.version + 1,
            status: body.status,
            owner_id: body.ownerId,
            next_action: body.nextAction,
            next_action_due_at: body.nextActionDueAt,
            last_activity_at: "2030-01-01T00:00:00Z",
          };
          if (patches.length === 2) return route.abort("failed");
          return route.fulfill({ json: lead });
        }
        if (failRead) {
          failRead = false;
          return route.abort("failed");
        }
        json = { lead, owners: [{ id: "sales", name: "Sales colleague" }] };
      }
      return route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/sales");
    await page
      .getByRole("button", { name: "Manage inquiry", exact: true })
      .click();
    const area = page.getByRole("region", { name: "Inquiry follow-up" });
    await area
      .getByLabel("Next action", { exact: true })
      .fill("Call the prospect");
    await area.getByLabel("Sales owner", { exact: true }).selectOption("sales");
    await area
      .getByLabel("Inquiry stage", { exact: true })
      .selectOption("qualified");
    await area
      .getByLabel("Next action due", { exact: false })
      .fill("2030-03-10T02:30");
    await area
      .getByRole("button", { name: "Save follow-up", exact: true })
      .click();
    await area
      .getByText(
        "Enter a valid local due time. Times skipped by daylight saving are unavailable.",
      )
      .waitFor();
    assert.equal(patches.length, 0);
    await area
      .getByLabel("Next action due", { exact: false })
      .fill("2030-03-01T10:30");
    await area
      .getByRole("button", { name: "Save follow-up", exact: true })
      .click();
    await area
      .getByRole("alert")
      .filter({ hasText: "inquiry may have changed" })
      .waitFor();
    assert.equal(
      await area.getByLabel("Next action", { exact: true }).inputValue(),
      "Call the prospect",
    );
    assert.equal(
      await area
        .getByRole("button", { name: "Save follow-up", exact: true })
        .isDisabled(),
      true,
    );
    await area
      .getByRole("button", { name: "Reload inquiry", exact: true })
      .click();
    assert.equal(
      await area.getByLabel("Next action", { exact: true }).inputValue(),
      "Call the prospect",
    );
    confirm = true;
    await area
      .getByRole("button", { name: "Reload inquiry", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".lead-follow-up textarea")?.value ===
        "Changed by another colleague",
    );
    confirm = false;
    await area
      .getByLabel("Next action", { exact: true })
      .fill("Arrange onboarding");
    await area.getByLabel("Inquiry stage", { exact: true }).selectOption("won");
    await area
      .getByRole("button", { name: "Save follow-up", exact: true })
      .click();
    await area
      .getByRole("alert")
      .filter({ hasText: "inquiry may have changed" })
      .waitFor();
    assert.equal(patches[1].expectedVersion, 2);
    confirm = true;
    await area
      .getByRole("button", { name: "Reload inquiry", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(
          '.lead-follow-up select[aria-label="Inquiry stage"]',
        )?.value === "won",
    );
    confirm = false;
    assert.equal(patches.length, 2);
    assert.equal(
      await area
        .getByRole("button", { name: "Save follow-up", exact: true })
        .isDisabled(),
      true,
    );
    await area
      .getByLabel("Next action", { exact: true })
      .fill("Preserve next step");
    failRead = true;
    confirm = true;
    await area
      .getByRole("button", { name: "Reload inquiry", exact: true })
      .click();
    await area
      .getByText(
        "Could not load the saved inquiry. Your local changes are still here.",
      )
      .waitFor();
    assert.equal(
      await area.getByLabel("Next action", { exact: true }).inputValue(),
      "Preserve next step",
    );
    confirm = false;
    assert.equal(
      await page.evaluate(() =>
        window.dispatchEvent(
          new Event("p1:before-navigation", { cancelable: true }),
        ),
      ),
      false,
    );
    await area
      .getByRole("button", { name: "Save follow-up", exact: true })
      .click();
    await area.getByText("Inquiry follow-up saved.", { exact: true }).waitFor();
    assert.equal(patches[2].expectedVersion, 3);
    assert.equal(lead.converted_client_id, null);
    assert.equal(lead.converted_property_id, null);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar")?.getBoundingClientRect().right <= 0,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.equal(
      await area.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      true,
    );
    await page.screenshot({
      path: "/tmp/p1-lead-follow-up-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "General inquiry browser passed: ownership/stage controls, stale and lost-response recovery, local due-date validation, draft retention, native status update and mobile containment.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
