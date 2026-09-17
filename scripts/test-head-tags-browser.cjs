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
    let owner = true,
      failRead = false,
      conflict = true,
      lost = false;
    const writes = [];
    let current = {
      html: "<script>window.shouldNotRun=true</script>",
      version: "a".repeat(64),
    };
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let json = [];
      if (path === "/api/v1/setup")
        json = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        json = {
          id: "test",
          name: "User",
          role: owner ? "owner" : "member",
          capabilities: ["marketing.content.pages"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = { clients: [], properties: [], staff: [] };
      if (path.endsWith("/website-system/head-tags")) {
        if (route.request().method() === "PUT") {
          const body = route.request().postDataJSON();
          writes.push(body);
          if (conflict) {
            conflict = false;
            current = {
              html: "Concurrent saved value",
              version: "b".repeat(64),
            };
            return route.fulfill({ status: 409, json: { error: "Changed" } });
          }
          current = { html: body.html, version: "c".repeat(64) };
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
          json = current;
        }
      }
      return route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/marketing/system/head-tags");
    const input = page.getByLabel("Public website head markup");
    await input.waitFor();
    await page.waitForFunction(() =>
      document.querySelector("textarea")?.value.includes("<script>"),
    );
    assert.equal(await page.evaluate(() => window.shouldNotRun), undefined);
    await input.fill('<meta name="test" content="Draft">');
    await page
      .getByRole("button", { name: "Save website head tags", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    assert.equal(
      await input.inputValue(),
      '<meta name="test" content="Draft">',
    );
    assert(
      await page
        .getByRole("button", { name: "Save website head tags", exact: true })
        .isDisabled(),
    );
    await page.getByRole("button", { name: "Reload saved tags" }).click();
    assert.equal(
      await input.inputValue(),
      '<meta name="test" content="Draft">',
    );
    accept = true;
    failRead = true;
    await page.getByRole("button", { name: "Reload saved tags" }).click();
    await page
      .getByText("Could not load website head tags", { exact: false })
      .waitFor();
    assert.equal(
      await input.inputValue(),
      '<meta name="test" content="Draft">',
    );
    await page.getByRole("button", { name: "Reload saved tags" }).click();
    await page.waitForFunction(
      () =>
        document.querySelector("textarea")?.value === "Concurrent saved value",
    );
    await input.fill("<meta name='final' content='literal'>");
    lost = true;
    await page
      .getByRole("button", { name: "Save website head tags", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    await page.getByRole("button", { name: "Reload saved tags" }).click();
    await page.waitForFunction(
      () => !document.querySelector("textarea")?.disabled,
    );
    assert.equal(await input.inputValue(), current.html);
    assert.equal(writes[1].expectedVersion, "b".repeat(64));
    await input.fill("");
    await page
      .getByRole("button", { name: "Save website head tags", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Website head tags saved" })
      .waitFor();
    assert.equal(current.html, "");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const e = document.querySelector(".sidebar");
      return !e || e.getBoundingClientRect().right <= 0;
    });
    const area = page.getByRole("region", {
      name: "Website head tag settings",
    });
    assert(await area.evaluate((e) => e.scrollWidth <= e.clientWidth));
    await area.screenshot({ path: "/tmp/p1-head-tags-mobile.png" });
    owner = false;
    await page.reload();
    await page.waitForTimeout(250);
    assert.equal(
      await page.getByLabel("Public website head markup").count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Website head tags browser passed: literal markup, stale and lost-response recovery, draft retention, explicit clearing, Owner visibility and mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
