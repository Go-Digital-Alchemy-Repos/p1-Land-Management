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
    let failList = true,
      failDetail = true,
      failAppend = true;
    const queries = [];
    const record = (id, collection = "leads") => ({
      sourceInstanceId: "original-crm",
      sourceId: id,
      collection,
      sourceSha256: "a".repeat(64),
      importedAt: "2020-02-29T12:34:56.123456Z",
    });
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url()),
        path = url.pathname;
      let json = [];
      if (path === "/api/v1/setup")
        json = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        json = {
          id: "owner",
          name: "Owner",
          role: "owner",
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = { clients: [], properties: [], staff: [] };
      if (path === "/api/v1/commercial-inquiries")
        json = { items: [], nextCursor: null };
      if (path === "/api/v1/sales/inquiries")
        json = {
          items: [
            {
              id: "first",
              name: "First inquiry",
              status: "new",
              version: 1,
              location: "Test",
              description: "Test",
            },
          ],
          nextCursor: null,
        };
      if (path.endsWith("/notes")) json = { items: [], nextCursor: null };
      if (path.endsWith("/tasks")) json = { items: [], nextCursor: null };
      if (path.endsWith("/workspace"))
        json = {
          client: { id: "20000000-0000-4000-8000-000000000001", name: "Synthetic customer" },
          properties: [],
          contacts: [],
          agreements: [],
          schedule: [],
          requests: [],
          projects: [],
          notes: [],
          activity: [],
        };
      if (path.endsWith("/crm-archive")) {
        queries.push(path + url.search);
        if (failList) {
          failList = false;
          return route.fulfill({ status: 503, json: { error: "Synthetic" } });
        }
        if (url.searchParams.has("cursor") && failAppend) {
          failAppend = false;
          return route.fulfill({ status: 503, json: { error: "Synthetic" } });
        }
        json = path.includes("/clients/")
          ? {
              items: [record("customer-original", "clients")],
              nextCursor: null,
            }
          : url.searchParams.has("cursor")
            ? { items: [record("older", "leadTasks")], nextCursor: null }
            : { items: [record("first")], nextCursor: "next" };
      }
      if (path.endsWith("/crm-archive/record")) {
        if (failDetail) {
          failDetail = false;
          return route.fulfill({ status: 503, json: { error: "Synthetic" } });
        }
        json = {
          ...record(
            url.searchParams.get("sourceId"),
            url.searchParams.get("collection"),
          ),
          sourceJson:
            '{\n  "name": "<img src=x onerror=alert(1)>",\n  "number": 9007199254740993,\n  "long": "' +
            "x".repeat(400) +
            '"\n}',
        };
      }
      return route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/sales");
    const area = page.getByRole("region", { name: "Sales inquiry list" });
    await area.getByText("First inquiry", { exact: true }).waitFor();
    assert.equal(queries.length, 0);
    await area
      .getByRole("button", { name: "Inquiry notes", exact: true })
      .click();
    await area.getByLabel("New inquiry note").fill("Keep draft");
    await area
      .getByRole("button", { name: "Imported CRM history", exact: true })
      .click();
    const history = area.getByRole("region", {
      name: "Imported CRM history",
      exact: true,
    });
    await history.getByRole("alert").waitFor();
    await history
      .getByRole("button", { name: "Refresh imported history" })
      .click();
    await history
      .getByRole("button", { name: "Inquiry · first", exact: true })
      .click();
    await history.getByRole("alert").waitFor();
    await history
      .getByRole("button", { name: "Inquiry · first", exact: true })
      .click();
    const original = history.getByLabel("Original CRM fields");
    await original.waitFor();
    assert.match(await original.textContent(), /9007199254740993/);
    assert.equal(await original.locator("img").count(), 0);
    await history
      .getByRole("button", { name: "Load more imported records" })
      .click();
    await history.getByRole("alert").waitFor();
    assert(await original.isVisible());
    await history
      .getByRole("button", { name: "Load more imported records" })
      .click();
    await history
      .getByRole("button", { name: "Inquiry task · older" })
      .waitFor();
    assert.equal(
      await area.getByLabel("New inquiry note").inputValue(),
      "Keep draft",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const e = document.querySelector(".sidebar");
      return !e || e.getBoundingClientRect().right <= 0;
    });
    assert(await history.evaluate((e) => e.scrollWidth <= e.clientWidth));
    await history.screenshot({ path: "/tmp/p1-crm-archive-mobile.png" });
    await page.goto("http://127.0.0.1:4347/clients/20000000-0000-4000-8000-000000000001/notes");
    await page
      .getByRole("button", { name: "Imported CRM history", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Customer · customer-original" })
      .click();
    await page.getByLabel("Original CRM fields").waitFor();
    assert(
      queries.some((q) => q.startsWith("/api/v1/clients/20000000-0000-4000-8000-000000000001/crm-archive")),
    );
    assert.deepEqual(errors, []);
    console.log(
      "CRM history browser passed: lazy access, retry, paginated retention, note draft preservation, literal precision, customer integration and mobile containment.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
