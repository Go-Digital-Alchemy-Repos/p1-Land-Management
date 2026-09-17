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
    const page = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
    });
    page.setDefaultTimeout(15000);
    let rows = [],
      saved,
      owned = true,
      capabilities = ["marketing.content.sidebars"],
      accept = true;
    const calls = [],
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => (accept ? d.accept() : d.dismiss()));
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      calls.push(path);
      let body = [];
      if (path.endsWith("/setup"))
        body = { initialized: true, configured: true };
      if (path.endsWith("/me"))
        body = {
          id: "synthetic",
          name: "Sidebar editor",
          role: "member",
          capabilities,
          mfaRequired: false,
        };
      if (path.includes("/editor-locks/"))
        body = {
          ownedByCurrentUser: owned,
          lock: { lockedByName: owned ? "Sidebar editor" : "Other editor" },
        };
      if (path.endsWith("/sidebar-references"))
        body = {
          forms: [
            {
              id: "news",
              name: "Newsletter",
              slug: "newsletter-signup",
              kind: "newsletter",
            },
            {
              id: "contact",
              name: "Contact",
              slug: "contact-form",
              kind: "contact",
            },
            {
              id: "application",
              name: "Application",
              slug: "apply",
              kind: "application",
            },
          ],
        };
      if (path.endsWith("/sidebars")) {
        if (req.method() === "POST") {
          saved = { ...req.postDataJSON(), id: "sidebar" };
          rows = [saved];
          body = saved;
        } else body = rows;
      }
      if (path.endsWith("/sidebars/sidebar")) {
        if (req.method() === "PUT") {
          saved = { ...saved, ...req.postDataJSON() };
          rows = [saved];
        }
        if (req.method() === "DELETE") {
          rows = [];
          body = { success: true };
        } else body = saved;
      }
      await route.fulfill({ json: body });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/sidebars");
    await page
      .getByRole("button", { name: "New sidebar", exact: true })
      .click();
    await page.getByLabel("Sidebar name", { exact: true }).fill("News sidebar");
    await page.getByLabel("Default sidebar", { exact: true }).check();
    await page.getByRole("button", { name: "Add widget", exact: true }).click();
    await page.getByLabel("Number of posts", { exact: true }).fill("7");
    await page
      .getByLabel("Add widget type", { exact: true })
      .selectOption("form");
    await page.getByRole("button", { name: "Add widget", exact: true }).click();
    await page
      .getByLabel("Widget 2 assigned form", { exact: true })
      .selectOption("contact-form");
    assert.equal(
      await page
        .getByLabel("Widget 2 assigned form")
        .getByRole("option", { name: "Application", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Move widget 2 up", exact: true })
      .click();
    await page
      .getByLabel("Add widget type", { exact: true })
      .selectOption("custom-html");
    await page.getByRole("button", { name: "Add widget", exact: true }).click();
    await page
      .getByLabel("HTML", { exact: true })
      .fill("<p>Custom content</p>");
    accept = false;
    await page
      .getByRole("button", { name: "Back to sidebars", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Sidebar name", { exact: true }).inputValue(),
      "News sidebar",
    );
    accept = true;
    await page
      .getByRole("button", { name: "Save sidebar", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Delete sidebar", exact: true })
      .waitFor();
    assert.equal(saved.widgets[0].type, "form");
    assert.equal(saved.widgets[1].settings.limit, 7);
    assert.equal(saved.widgets[2].settings.html, "<p>Custom content</p>");
    assert.equal(saved.isDefault, true);
    owned = false;
    await page
      .getByLabel("Sidebar name", { exact: true })
      .fill("Retained draft");
    await page
      .getByRole("button", { name: "Save sidebar", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    assert.equal(saved.name, "News sidebar");
    assert.equal(
      await page.getByLabel("Sidebar name", { exact: true }).inputValue(),
      "Retained draft",
    );
    owned = true;
    await page
      .getByRole("button", { name: "Check reservation", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save sidebar", exact: true })
      .click();
    await page.getByText("Sidebar saved.", { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: "/tmp/p1-sidebar-mobile.png",
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page
      .getByRole("button", { name: "Delete sidebar", exact: true })
      .click();
    await page.getByText("No sidebars yet.", { exact: true }).waitFor();
    assert.equal(rows.length, 0);
    assert.ok(!calls.some((p) => p.endsWith("/forms")));
    capabilities = [];
    await page.reload();
    assert.equal(
      await page
        .getByRole("button", { name: "New sidebar", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Sidebar browser checks passed: widget fields/order, default, restricted form selection, dirty guard, lock conflict draft preservation, mobile, delete and revocation.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
