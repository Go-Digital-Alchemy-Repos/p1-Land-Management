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
    const lead = "10000000-0000-4000-8000-000000000001";
    let posts = [],
      saved = null,
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
          id: "synthetic",
          name: "Sales colleague",
          role: "member",
          capabilities: ["revenue.sales"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = { clients: [], properties: [], staff: [] };
      if (path === "/api/v1/leads")
        json = [
          {
            id: lead,
            name: "Synthetic inquiry",
            location: "Test site",
            description: "Synthetic only",
            status: "new",
          },
        ];
      if (path.includes("commercial") && path.endsWith("inquiries"))
        json = { items: [], nextCursor: null };
      if (path === `/api/v1/leads/${lead}/notes`) {
        if (req.method() === "POST") {
          const body = req.postDataJSON();
          posts.push(body);
          saved = {
            ...body,
            authorName: "Sales colleague",
            createdAt: "2030-01-01T00:00:00Z",
            imported: false,
          };
          if (posts.length === 1) return route.abort("failed");
          assert.deepEqual(posts[0], body);
          return route.fulfill({ json: { id: body.id, replayed: true } });
        }
        if (failRead) {
          failRead = false;
          return route.abort("failed");
        }
        json = url.searchParams.has("cursor")
          ? {
              items: [
                {
                  id: "older",
                  body: "Older preserved note",
                  createdAt: "2020-01-01T00:00:00Z",
                  authorName: null,
                  imported: true,
                },
              ],
              nextCursor: null,
            }
          : { items: saved ? [saved] : [], nextCursor: "older-page" };
      }
      return route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/sales");
    await page
      .getByRole("button", { name: "Inquiry notes", exact: true })
      .click();
    const area = page.getByRole("region", { name: "Inquiry note history" });
    await area.getByText("No notes yet.", { exact: true }).waitFor();
    await area.getByRole("button", { name: "Load older notes" }).click();
    await area.getByText("Historical author unavailable").waitFor();
    await area
      .getByLabel("New inquiry note")
      .fill("Literal <img src=x onerror=alert(1)>\nKeep this note");
    await page.getByRole("button", { name: "Save note", exact: true }).click();
    await area
      .getByRole("button", { name: "Retry note save", exact: true })
      .waitFor();
    assert.equal(await area.getByLabel("New inquiry note").isDisabled(), true);
    await area
      .getByRole("button", { name: "Retry note save", exact: true })
      .click();
    await area.getByText("Note saved.", { exact: true }).waitFor();
    assert.equal(posts.length, 2);
    assert.equal(await area.locator("img").count(), 0);
    assert.equal(await area.getByLabel("New inquiry note").inputValue(), "");
    await area
      .getByLabel("New inquiry note")
      .fill("Retain across failed refresh");
    failRead = true;
    await area
      .getByRole("button", { name: "Refresh notes", exact: true })
      .click();
    await area.getByText("Could not load inquiry notes. Try again.").waitFor();
    assert.equal(
      await area.getByLabel("New inquiry note").inputValue(),
      "Retain across failed refresh",
    );
    // The same cancellable navigation event is dispatched by dashboard links and inquiry selection.
    assert.equal(
      await page.evaluate(() =>
        window.dispatchEvent(
          new Event("p1:before-navigation", { cancelable: true }),
        ),
      ),
      false,
    );
    assert.equal(
      await area.getByLabel("New inquiry note").inputValue(),
      "Retain across failed refresh",
    );
    await area
      .getByRole("button", { name: "Refresh notes", exact: true })
      .click();
    await area.getByRole("button", { name: "Load older notes" }).waitFor();
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
      path: "/tmp/p1-lead-notes-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Lead notes browser passed: paging, lost-response retry, literal text, draft recovery and mobile containment.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
