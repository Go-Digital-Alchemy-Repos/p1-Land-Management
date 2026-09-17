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
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let retryFailure = true,
      queued = false,
      retryCalls = 0;
    const deliveryQueries = [];
    let deny = false,
      fail = true,
      saved,
      mutations = 0;
    const form = {
      id: "system",
      name: "Estimate request",
      slug: "p1-estimate",
      kind: "contact",
      isSystem: true,
      isActive: true,
      description: "Saved description",
      fields: [
        {
          id: "field",
          key: "email",
          label: "Email",
          type: "email",
          required: true,
          config: { retained: { nested: ["one", "two"] } },
        },
      ],
      settings: {
        submitButtonText: "Send",
        successMessage: "Received",
        unknownSetting: { keep: true },
      },
    };
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      let body = [];
      if (path === "/api/v1/setup")
        body = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        body = {
          id: "synthetic",
          name: "Forms editor",
          role: "member",
          capabilities: deny ? [] : ["marketing.content.forms"],
          mfaRequired: false,
        };
      if (path === "/api/v1/marketing/cms/forms") body = [form];
      if (path.endsWith("/forms/system") && req.method() === "PUT") {
        mutations++;
        saved = req.postDataJSON();
        if (fail)
          return route.fulfill({
            status: 503,
            json: { message: "Synthetic save failure" },
          });
        Object.assign(form, saved);
        body = form;
      }
      if (path.endsWith("/forms/system/submissions"))
        body = [
          {
            id: "submission",
            formId: "system",
            createdAt: "2026-09-17T00:00:00Z",
            data: {
              email: "synthetic@example.test",
              unsafe: "<script>window.bad=true</script>",
              nested: { scope: ["one", "two"] },
            },
          },
        ];
      if (path === "/api/v1/marketing/cms/form-delivery-jobs") {
        const params = new URL(req.url()).searchParams;
        deliveryQueries.push(params.toString());
        const completed = params.get("status") === "completed";
        const more = params.has("cursor");
        body = {
          items: [
            {
              id: more ? "second" : "first",
              submissionId: "receipt",
              kind: "commercial_dashboard_intake",
              status: completed
                ? "completed"
                : more
                  ? "processing"
                  : queued
                    ? "queued"
                    : "failed",
              attemptCount: 3,
              createdAt: "2026-09-17T00:00:00Z",
            },
          ],
          nextCursor: more || completed ? null : "next_page",
        };
      }
      if (path === "/api/v1/marketing/cms/form-delivery-jobs/first/retry") {
        retryCalls++;
        if (retryFailure)
          return route.fulfill({
            status: 503,
            json: { message: "Synthetic retry failure" },
          });
        queued = true;
        body = { id: "first" };
      }
      await route.fulfill({ json: body });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/forms");
    await page
      .getByRole("button", { name: "Delivery monitoring", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Retry delivery", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Load more deliveries", exact: true })
      .click();
    await page
      .getByText("2 deliveries shown, newest first.", { exact: true })
      .waitFor();
    assert(deliveryQueries.some((query) => query.includes("cursor=next_page")));
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Retry delivery", exact: true })
      .click();
    assert.equal(retryCalls, 0);
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Retry delivery", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Synthetic retry failure" })
      .waitFor();
    retryFailure = false;
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Retry delivery", exact: true })
      .click();
    await page
      .getByText(
        "Delivery queued for retry. Queued does not mean delivered; refresh to check its status.",
        { exact: true },
      )
      .waitFor();
    assert.equal(retryCalls, 2);
    await page
      .getByLabel("Delivery status", { exact: true })
      .selectOption("completed");
    await page.getByText("completed", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Retry delivery", exact: true })
        .count(),
      0,
    );
    assert(deliveryQueries.at(-1).includes("status=completed"));
    assert(!deliveryQueries.at(-1).includes("cursor"));
    await page
      .getByRole("button", { name: "Back to forms", exact: true })
      .click();

    await page
      .getByRole("button", { name: "Edit Estimate request", exact: true })
      .click();
    assert(await page.getByLabel("Slug", { exact: true }).isDisabled());
    assert(await page.getByLabel("Kind", { exact: true }).isDisabled());
    await page
      .getByLabel("Description", { exact: true })
      .fill("Changed description");
    await page.locator(".form-field-card summary").first().click();
    await page
      .getByRole("button", { name: "Duplicate field", exact: true })
      .click();
    await page.locator(".form-field-card summary").nth(1).click();
    await page
      .locator(".form-field-card")
      .nth(1)
      .getByLabel("Field label", { exact: true })
      .fill("Second email");
    await page
      .locator(".form-field-card")
      .nth(1)
      .getByRole("button", { name: "Move up", exact: true })
      .click();
    const copyKey = await page
      .locator(".form-field-card")
      .first()
      .getByLabel("Field key", { exact: true })
      .inputValue();
    await page
      .locator(".form-field-card")
      .first()
      .getByLabel("Field key", { exact: true })
      .fill("email");
    await page.getByRole("button", { name: "Save form", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Field keys and IDs must be unique" })
      .waitFor();
    assert.equal(mutations, 0);
    await page
      .locator(".form-field-card")
      .first()
      .getByLabel("Field key", { exact: true })
      .fill(copyKey);

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Save form", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Synthetic save failure" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Description", { exact: true }).inputValue(),
      "Changed description",
    );
    assert.deepEqual(saved.fields[1], form.fields[0]);
    assert.equal(saved.fields[0].label, "Second email");
    assert.notEqual(saved.fields[0].id, saved.fields[1].id);
    assert.notEqual(saved.fields[0].key, saved.fields[1].key);
    assert.deepEqual(saved.fields[0].config, form.fields[0].config);
    assert.deepEqual(saved.settings.unknownSetting, { keep: true });
    fail = false;
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Save form", exact: true }).click();
    await page.getByText("Form saved.", { exact: true }).waitFor();
    assert.equal(mutations, 2);
    await page
      .getByRole("button", { name: "View Estimate request submissions" })
      .click();
    await page
      .getByText("<script>window.bad=true</script>", { exact: true })
      .waitFor();
    assert.equal(await page.evaluate(() => window.bad), undefined);
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.getByRole("button", { name: "Back to forms" }).click();
    await page
      .getByRole("button", { name: "Create form", exact: true })
      .click();
    await page.getByLabel("Name", { exact: true }).fill("Unsaved form");
    await page
      .getByLabel("New field type", { exact: true })
      .selectOption("image-choice");
    await page.getByRole("button", { name: "Add field", exact: true }).click();
    await page.locator(".form-field-card summary").first().click();
    await page
      .getByLabel("Selection mode", { exact: true })
      .selectOption("multiple");
    await page.getByRole("button", { name: "Add choice", exact: true }).click();
    assert.equal(
      await page.getByLabel("Choice label", { exact: true }).count(),
      2,
    );
    await page
      .getByLabel("New field type", { exact: true })
      .selectOption("list");
    await page.getByRole("button", { name: "Add field", exact: true }).click();
    await page.locator(".form-field-card summary").nth(1).click();
    await page.getByRole("button", { name: "Add column", exact: true }).click();
    assert.equal(
      await page.getByLabel("Column label", { exact: true }).count(),
      2,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );

    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(
      await page.getByLabel("Name", { exact: true }).inputValue(),
      "Unsaved form",
    );
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    deny = true;
    await page.reload();
    await page.waitForTimeout(700);
    assert.equal(
      await page
        .getByRole("button", { name: "Create form", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Forms browser checks passed: preservation, save retry, protected identity, submissions escaping, discard guard, permission denial and mobile layout.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
