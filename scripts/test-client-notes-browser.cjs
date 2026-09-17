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
    const client = "20000000-0000-4000-8000-000000000001",
      property = "30000000-0000-4000-8000-000000000001";
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
          name: "Office colleague",
          role: "member",
          capabilities: ["customers.clients", "customers.properties"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = {
          clients: [{ id: client, name: "Synthetic customer" }],
          properties: [],
          staff: [],
        };
      if (path === `/api/v1/clients/${client}/workspace`)
        json = {
          client: { id: client, name: "Synthetic customer" },
          properties: [
            {
              id: property,
              client_id: client,
              name: "North site",
              address: "Synthetic only",
            },
          ],
          contacts: [],
          agreements: [],
          schedule: [],
          requests: [],
          projects: [],
          notes: [],
          activity: [],
        };
      if (path === `/api/v1/clients/${client}/notes`) {
        if (req.method() === "POST") {
          const body = req.postDataJSON();
          posts.push(body);
          saved = {
            id: body.id,
            body: body.body,
            author_name: "Office colleague",
            property_id: body.propertyId,
            property_name: "North site",
            created_at: "2030-01-01T00:00:00Z",
            imported: false,
          };
          if (posts.length === 1) return route.abort("failed");
          assert.deepEqual(body, posts[0]);
          return route.fulfill({ json: { id: body.id } });
        }
        if (failRead) {
          failRead = false;
          return route.abort("failed");
        }
        json = url.searchParams.has("cursor")
          ? {
              items: [
                {
                  id: "historical",
                  body: "Original imported customer context",
                  author_name: null,
                  property_id: null,
                  property_name: null,
                  created_at: "2020-01-01T00:00:00Z",
                  imported: true,
                },
              ],
              nextCursor: null,
            }
          : { items: saved ? [saved] : [], nextCursor: "older" };
      }
      return route.fulfill({ json });
    });
    await page.goto(`http://127.0.0.1:4347/clients/${client}/notes`);
    const area = page.getByRole("region", { name: "Customer note history" });
    await area.getByText("No notes yet.", { exact: true }).waitFor();
    await area.getByRole("button", { name: "Load older notes" }).click();
    await area
      .getByText("Historical author unavailable", { exact: true })
      .waitFor();
    await area
      .getByText("Original imported customer context", { exact: true })
      .waitFor();
    await area
      .getByRole("textbox", { name: "New internal note", exact: true })
      .fill("Literal <img src=x onerror=alert(1)>\nCustomer context");
    await area
      .getByLabel("Property scope", { exact: true })
      .selectOption(property);
    await area.getByRole("button", { name: "Add note", exact: true }).click();
    await area
      .getByRole("button", { name: "Retry note save", exact: true })
      .waitFor();
    assert.equal(
      await area
        .getByRole("textbox", { name: "New internal note", exact: true })
        .evaluate((el) => el.isContentEditable),
      false,
    );
    assert.equal(
      await area
        .getByRole("textbox", { name: "New internal note", exact: true })
        .getAttribute("aria-readonly"),
      "true",
    );
    assert.equal(
      await area.getByLabel("Property scope", { exact: true }).isDisabled(),
      true,
    );
    await area
      .getByRole("button", { name: "Retry note save", exact: true })
      .click();
    await area.getByText("Note saved.", { exact: true }).waitFor();
    assert.equal(posts.length, 2);
    assert.equal(posts[0].propertyId, property);
    assert.equal(await area.locator("img").count(), 0);
    assert.equal(
      await area
        .getByRole("textbox", { name: "New internal note", exact: true })
        .innerText(),
      "",
    );
    await area
      .getByRole("textbox", { name: "New internal note", exact: true })
      .fill("Keep my customer draft");
    failRead = true;
    await area
      .getByRole("button", { name: "Refresh notes", exact: true })
      .click();
    await area
      .getByText("Could not load customer notes. Your draft is still here.")
      .waitFor();
    assert.equal(
      await area
        .getByRole("textbox", { name: "New internal note", exact: true })
        .innerText(),
      "Keep my customer draft",
    );
    assert.equal(
      await page.evaluate(() =>
        window.dispatchEvent(
          new Event("p1:before-navigation", { cancelable: true }),
        ),
      ),
      false,
    );
    await area
      .getByRole("button", { name: "Refresh notes", exact: true })
      .click();
    await area.getByRole("button", { name: "Load older notes" }).waitFor();
    await area.getByRole("button", { name: "Load older notes" }).click();
    await area
      .getByText("Historical author unavailable", { exact: true })
      .waitFor();
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
      path: "/tmp/p1-client-notes-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Customer notes browser passed: historical author fallback, paging, property-scoped safe retry, literal text, draft retention and mobile containment.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
