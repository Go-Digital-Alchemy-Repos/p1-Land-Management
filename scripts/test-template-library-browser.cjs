const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
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
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let networkFailure = false;
    let deny = false,
      conflict = false,
      catalogFail = false,
      created,
      lastUpdate,
      publishes = 0;
    const rows = ["msa", "scope", "cost"].map((kind) => ({
      id: randomUUID(),
      family_id: randomUUID(),
      name: `Published ${kind}`,
      kind,
      status: "published",
      active: true,
      version: 1,
      edit_version: 1,
      body: kind === "msa" ? "Synthetic terms" : "",
      description: "",
      payload:
        kind === "msa"
          ? {}
          : kind === "scope"
            ? { items: [], exclusions: "" }
            : { items: [] },
    }));
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        path = url.pathname,
        method = req.method();
      let body = [];
      if (path === "/api/v1/setup")
        body = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        body = {
          id: "synthetic",
          name: "Template editor",
          role: "member",
          capabilities: deny ? [] : ["revenue.agreement-templates.manage"],
          mfaRequired: false,
        };
      if (path === "/api/v1/agreement-templates") {
        if (method === "POST") {
          created = req.postDataJSON();
          body = {
            ...created,
            id: randomUUID(),
            family_id: randomUUID(),
            version: 1,
            edit_version: 1,
            status: "draft",
            active: false,
          };
          rows.push(body);
        } else {
          if (url.searchParams.get("state") === "published" && catalogFail)
            return route.fulfill({
              status: 503,
              json: { message: "Synthetic component failure" },
            });
          body = rows.filter((row) =>
            !url.searchParams.has("state")
              ? row.status === "published" && row.kind === "msa"
              : url.searchParams.get("state") === "all" ||
                row.status === url.searchParams.get("state"),
          );
        }
      }
      const match = path.match(
        /^\/api\/v1\/agreement-templates\/([^/]+)(?:\/(.+))?$/,
      );
      if (match) {
        const index = rows.findIndex((row) => row.id === match[1]);
        if (index < 0)
          return route.fulfill({
            status: 404,
            json: { message: "Missing template" },
          });
        const row = rows[index];
        if (method === "PUT") {
          lastUpdate = req.postDataJSON();
          if (networkFailure) {
            networkFailure = false;
            return route.fulfill({
              status: 503,
              json: { message: "Temporary save failure" },
            });
          }
          if (conflict) {
            rows[index] = {
              ...row,
              body: "Other writer terms",
              edit_version: row.edit_version + 1,
            };
            conflict = false;
            return route.fulfill({
              status: 409,
              json: {
                message:
                  "Template changed. Reload before applying your changes.",
              },
            });
          }
          assert.equal(lastUpdate.expectedEditVersion, row.edit_version);
          const { expectedEditVersion, ...content } = lastUpdate;
          rows[index] = {
            ...row,
            ...content,
            edit_version: row.edit_version + 1,
          };
          body = rows[index];
        } else if (method === "POST") {
          const data = req.postDataJSON();
          assert.equal(data.expectedEditVersion, row.edit_version);
          if (match[2] === "publish") {
            publishes++;
            rows[index] = {
              ...row,
              status: "published",
              active: true,
              edit_version: row.edit_version + 1,
            };
            body = rows[index];
          }
          if (match[2] === "archive") {
            rows[index] = {
              ...row,
              status: "archived",
              active: false,
              edit_version: row.edit_version + 1,
            };
            body = rows[index];
          }
          if (match[2] === "revise" || match[2] === "duplicate") {
            body = {
              ...row,
              id: randomUUID(),
              name: data.name || row.name,
              status: "draft",
              active: false,
              version: match[2] === "revise" ? row.version + 1 : 1,
              edit_version: 1,
            };
            rows.push(body);
          }
        } else body = row;
      }
      await route.fulfill({ json: body });
    });
    await page.goto("http://127.0.0.1:4347/agreements/templates");
    await page
      .getByRole("button", { name: "Create template", exact: true })
      .click();
    await page.getByLabel("Name", { exact: true }).fill("Terms draft");
    await page
      .getByLabel("Agreement terms", { exact: true })
      .fill("Original {{client.name}} terms");
    assert.equal(
      await page
        .getByRole("link", { name: "Open term libraries", exact: true })
        .count(),
      0,
    );
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByRole("button", { name: "Publish version", exact: true })
      .waitFor();
    assert.equal(created.kind, "msa");
    assert.deepEqual(created.payload, {});
    await page
      .getByLabel("Agreement terms", { exact: true })
      .fill("Unsaved terms");
    assert(
      await page
        .getByRole("button", { name: "Publish version", exact: true })
        .isDisabled(),
    );
    networkFailure = true;
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Temporary save failure" })
      .waitFor();
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Reload saved template", exact: true })
      .click();
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll("textarea")).some(
        (el) => el.value === "Original {{client.name}} terms",
      ),
    );
    await page
      .getByLabel("Agreement terms", { exact: true })
      .fill("Unsaved terms");
    conflict = true;
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Template changed" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Agreement terms", { exact: true }).inputValue(),
      "Unsaved terms",
    );
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Reload saved template", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Agreement terms", { exact: true }).inputValue(),
      "Unsaved terms",
    );
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Reload saved template", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelector("textarea") !== null,
    );
    await page.getByLabel("Agreement terms", { exact: true }).waitFor();
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll("textarea")).some(
        (el) => el.value === "Other writer terms",
      ),
    );
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Publish version", exact: true })
      .click();
    assert.equal(publishes, 0);
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Publish version", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Create revision", exact: true })
      .waitFor();
    assert(
      await page.getByLabel("Agreement terms", { exact: true }).isDisabled(),
    );
    await page
      .getByRole("button", { name: "Create revision", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Terms draft · v2", exact: true })
      .waitFor();
    assert(
      !(await page.getByLabel("Agreement terms", { exact: true }).isDisabled()),
    );
    page.once("dialog", (d) => d.accept("Independent copy"));
    await page
      .getByRole("button", { name: "Duplicate template", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Independent copy · v1", exact: true })
      .waitFor();
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Archive version", exact: true })
      .click();
    await page.waitForFunction(() =>
      document.body.textContent.includes("archived version"),
    );
    await page
      .getByRole("button", { name: "Back to templates", exact: true })
      .click();
    await page
      .getByLabel("Template type", { exact: true })
      .selectOption("cost");
    await page
      .getByRole("button", { name: "Create template", exact: true })
      .click();
    await page.getByLabel("Name", { exact: true }).fill("Cost defaults");
    await page
      .getByRole("button", { name: "Add cost row", exact: true })
      .click();
    await page.getByLabel("Service", { exact: true }).fill("Mowing");
    await page.getByLabel("Unit", { exact: true }).fill("acre");
    await page.getByLabel("Quantity", { exact: true }).fill("1.25");
    await page.getByLabel("Unit price (USD)", { exact: true }).fill("100.01");
    await page
      .getByLabel("Billing basis 1", { exact: true })
      .selectOption("per_visit");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByRole("button", { name: "Publish version", exact: true })
      .waitFor();
    assert.equal(created.payload.items[0].unitPriceCents, 10001);
    assert.equal(created.payload.items[0].quantity, 1.25);
    assert.equal(created.payload.items[0].basis, "per_visit");
    await page
      .getByRole("button", { name: "Back to templates", exact: true })
      .click();
    await page
      .getByLabel("Template type", { exact: true })
      .selectOption("scope");
    await page
      .getByRole("button", { name: "Create template", exact: true })
      .click();
    await page.getByLabel("Name", { exact: true }).fill("Scope defaults");
    await page
      .getByRole("button", { name: "Add scope item", exact: true })
      .click();
    await page.getByLabel("Title", { exact: true }).fill("First");
    await page
      .getByRole("button", { name: "Add scope item", exact: true })
      .click();
    await page.getByLabel("Title", { exact: true }).nth(1).fill("Second");
    await page
      .getByRole("button", { name: "Move scope 2 up", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Title", { exact: true }).nth(0).inputValue(),
      "Second",
    );
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Remove scope 2", exact: true })
      .click();
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByRole("button", { name: "Publish version", exact: true })
      .waitFor();
    assert.deepEqual(
      created.payload.items.map((item) => item.title),
      ["Second"],
    );
    await page
      .getByRole("button", { name: "Back to templates", exact: true })
      .click();
    await page
      .getByLabel("Template type", { exact: true })
      .selectOption("package");
    catalogFail = true;
    await page
      .getByRole("button", { name: "Create template", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Retry components", exact: true })
      .waitFor();
    catalogFail = false;
    await page
      .getByRole("button", { name: "Retry components", exact: true })
      .click();
    await page.getByLabel("Name", { exact: true }).fill("Standard package");
    for (const [label, index] of [
      ["MSA version", 0],
      ["Scope version", 1],
      ["Cost breakdown version", 2],
    ])
      await page
        .getByLabel(label, { exact: true })
        .selectOption(rows[index].id);
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByRole("button", { name: "Publish version", exact: true })
      .waitFor();
    assert.deepEqual(created.payload, {
      msaId: rows[0].id,
      scopeId: rows[1].id,
      costId: rows[2].id,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(350);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "/tmp/p1-template-library-mobile.png",
      fullPage: true,
    });
    deny = true;
    await page.reload();
    await page.waitForTimeout(400);
    assert.equal(
      await page
        .getByRole("button", { name: "Create template", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Template library browser checks passed: all four editors, lifecycle actions, stale draft recovery, exact cents, reorder/delete, package references, permissions and mobile layout.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
