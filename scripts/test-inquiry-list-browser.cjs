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
    let accept = false,
      failAppend = true;
    const queries = [];
    page.on("dialog", (d) => (accept ? d.accept() : d.dismiss()));
    const inquiry = (id, name) => ({
      id,
      name,
      status: "new",
      version: 1,
      location: "Synthetic site",
      description: "Synthetic inquiry",
      owner_id: null,
      converted_property_id: null,
    });
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url()),
        path = url.pathname;
      let json = [];
      if (path === "/api/v1/setup")
        json = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        json = {
          id: "sales",
          name: "Sales",
          role: "member",
          capabilities: ["revenue.sales"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = { clients: [], properties: [], staff: [] };
      if (path === "/api/v1/commercial-inquiries")
        json = { items: [], nextCursor: null };
      if (path === "/api/v1/sales/inquiries") {
        queries.push(Object.fromEntries(url.searchParams));
        if (url.searchParams.has("cursor") && failAppend) {
          failAppend = false;
          return route.fulfill({
            status: 503,
            json: { error: "Synthetic failure" },
          });
        }
        json = url.searchParams.has("q")
          ? {
              items: [inquiry("filtered", "Filtered inquiry")],
              nextCursor: null,
            }
          : url.searchParams.has("cursor")
            ? { items: [inquiry("older", "Older inquiry")], nextCursor: null }
            : {
                items: [inquiry("first", "First inquiry")],
                nextCursor: "older-page",
              };
      }
      if (path.endsWith("/notes")) json = { items: [], nextCursor: null };
      return route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/sales");
    const area = page.getByRole("region", { name: "Sales inquiry list" });
    await area.getByText("First inquiry", { exact: true }).waitFor();
    await area
      .getByRole("button", { name: "Inquiry notes", exact: true })
      .click();
    const draft = area.getByLabel("New inquiry note");
    await draft.fill("Keep my draft");
    await area
      .getByRole("button", { name: "Refresh inquiries", exact: true })
      .click();
    assert.equal(queries.length, 1);
    assert.equal(await draft.inputValue(), "Keep my draft");
    await area.getByRole("button", { name: "Load older inquiries" }).click();
    await area.getByRole("alert").waitFor();
    assert.equal(await draft.inputValue(), "Keep my draft");
    await area.getByRole("button", { name: "Load older inquiries" }).click();
    await area.getByText("Older inquiry", { exact: true }).waitFor();
    assert.equal(await draft.inputValue(), "Keep my draft");
    assert.equal(queries[1].cursor, queries[2].cursor);
    await area.getByLabel("Search inquiries").fill("Filtered");
    await area.getByLabel("Filter inquiry stage").selectOption("qualified");
    await area.getByLabel("Filter inquiry owner").selectOption("unassigned");
    await area.getByLabel("Filter inquiry type").selectOption("general");
    await area.getByLabel("Overdue follow-ups only").check();
    await area.getByRole("button", { name: "Apply filters" }).click();
    assert.equal(queries.length, 3);
    accept = true;
    await area.getByRole("button", { name: "Apply filters" }).click();
    await area.getByText("Filtered inquiry", { exact: true }).waitFor();
    assert.deepEqual(queries.at(-1), {
      kind: "general",
      q: "Filtered",
      status: "qualified",
      ownerId: "unassigned",
      overdue: "true",
    });
    assert.equal(
      await area.getByText("First inquiry", { exact: true }).count(),
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const el = document.querySelector(".sidebar");
      return !el || el.getBoundingClientRect().right <= 0;
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    assert(await area.evaluate((el) => el.scrollWidth <= el.clientWidth));
    await page.screenshot({
      path: "/tmp/p1-inquiry-list-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Inquiry list browser: pagination retries, draft guards, filters and mobile passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
