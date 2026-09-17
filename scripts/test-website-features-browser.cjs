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
    let accept = false;
    page.on("dialog", (d) => (accept ? d.accept() : d.dismiss()));
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const defaults = {
      cmsEnabled: true,
      blogEnabled: true,
      eventsEnabled: false,
      crmEnabled: true,
      careersEnabled: false,
    };
    let state = {
        features: {
          ...defaults,
          cmsEnabled: false,
          blogEnabled: false,
          crmEnabled: false,
        },
        defaults,
        version: "a".repeat(64),
      },
      owner = true,
      failRead = true,
      conflict = true,
      lost = false;
    const writes = [];
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let json = [];
      if (path === "/api/v1/setup")
        json = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        json = {
          id: "owner",
          name: "Colleague",
          role: owner ? "owner" : "member",
          capabilities: ["marketing.content.events", "settings.preferences"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = { clients: [], properties: [], staff: [] };
      if (path.endsWith("/website-system/features")) {
        if (route.request().method() === "PUT") {
          const body = route.request().postDataJSON();
          writes.push(body);
          if (conflict) {
            conflict = false;
            state = {
              ...state,
              features: { ...state.features, blogEnabled: true },
              version: "b".repeat(64),
            };
            return route.fulfill({ status: 409, json: { error: "Changed" } });
          }
          state = {
            ...state,
            features: body.features,
            version: "c".repeat(64),
          };
          if (lost) {
            lost = false;
            return route.abort();
          }
          json = { saved: true };
        } else {
          if (failRead) {
            failRead = false;
            return route.fulfill({
              status: 503,
              json: { error: "Unavailable" },
            });
          }
          json = state;
        }
      }
      return route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/marketing/system/features");
    const area = page.getByRole("region", { name: "Website module settings" });
    await area.getByRole("alert").waitFor();
    assert.equal(await area.getByRole("checkbox").count(), 0);
    await area.getByRole("button", { name: "Reload saved modules" }).click();
    await area.getByRole("checkbox", { name: "CMS", exact: true }).waitFor();
    assert.equal(writes.length, 0);
    for (const box of await area.getByRole("checkbox").all())
      assert(!(await box.isChecked()));
    await area.getByRole("checkbox", { name: "Events", exact: true }).check();
    await area.getByRole("button", { name: "Save website modules" }).click();
    await area.getByRole("alert").waitFor();
    assert(
      await area
        .getByRole("checkbox", { name: "Events", exact: true })
        .isChecked(),
    );
    assert(
      await area
        .getByRole("button", { name: "Save website modules" })
        .isDisabled(),
    );
    await area.getByRole("button", { name: "Reload saved modules" }).click();
    assert(
      await area
        .getByRole("checkbox", { name: "Events", exact: true })
        .isChecked(),
    );
    accept = true;
    failRead = true;
    await area.getByRole("button", { name: "Reload saved modules" }).click();
    await area
      .getByText("Could not load website modules.", { exact: false })
      .waitFor();
    assert(
      await area
        .getByRole("checkbox", { name: "Events", exact: true })
        .isChecked(),
    );
    await area.getByRole("button", { name: "Reload saved modules" }).click();
    await page.waitForFunction(
      () => !document.querySelector("fieldset")?.disabled,
    );
    assert(
      !(await area
        .getByRole("checkbox", { name: "Events", exact: true })
        .isChecked()),
    );
    assert(
      await area
        .getByRole("checkbox", { name: "Blog", exact: true })
        .isChecked(),
    );
    await area.getByRole("button", { name: "Use default selections" }).click();
    assert.equal(writes.length, 1);
    assert(
      await area
        .getByRole("checkbox", { name: "CMS", exact: true })
        .isChecked(),
    );
    assert(
      !(await area
        .getByRole("checkbox", { name: "Careers", exact: true })
        .isChecked()),
    );
    lost = true;
    await area.getByRole("button", { name: "Save website modules" }).click();
    await area.getByRole("alert").waitFor();
    assert.equal(writes[1].expectedVersion, "b".repeat(64));
    assert.deepEqual(writes[1].features, defaults);
    await area.getByRole("button", { name: "Reload saved modules" }).click();
    await page.waitForFunction(
      () => !document.querySelector("fieldset")?.disabled,
    );
    assert(
      await area
        .getByRole("checkbox", { name: "CMS", exact: true })
        .isChecked(),
    );
    for (const box of await area.getByRole("checkbox").all())
      await box.uncheck();
    await area.getByRole("button", { name: "Save website modules" }).click();
    await area
      .getByRole("status")
      .filter({ hasText: "Website modules saved" })
      .waitFor();
    assert(Object.values(state.features).every((v) => v === false));
    assert(
      await area
        .getByRole("button", { name: "Reload saved modules" })
        .isEnabled(),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const e = document.querySelector(".sidebar");
      return !e || e.getBoundingClientRect().right <= 0;
    });
    assert(await area.evaluate((e) => e.scrollWidth <= e.clientWidth));
    await area.screenshot({ path: "/tmp/p1-website-features-mobile.png" });
    owner = false;
    await page.reload();
    await page.waitForTimeout(250);
    assert.equal(
      await page
        .getByRole("region", { name: "Website module settings" })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Website modules browser passed: load failure, retained/stale drafts, explicit reload, defaults without save, lost-response reconciliation, all-off recovery, Owner visibility and mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
