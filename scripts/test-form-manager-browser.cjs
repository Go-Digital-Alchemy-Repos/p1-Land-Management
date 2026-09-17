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
    let conflict = false;
    let mediaAllowed = true;
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
      updatedAt: "2026-09-17T00:00:00.123Z",
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
          capabilities: deny
            ? []
            : [
                "marketing.content.forms",
                ...(mediaAllowed ? ["marketing.content.media"] : []),
              ],
          mfaRequired: false,
        };
      if (path === "/api/v1/marketing/cms/forms") body = [form];
      if (path === "/api/v1/marketing/cms/form-builder")
        body = {
          previewUrl: "https://www.p1landmanagement.com/cms-preview/builder",
        };
      if (path.endsWith("/forms/system") && req.method() === "GET") body = form;
      if (path.endsWith("/forms/system") && req.method() === "PUT") {
        mutations++;
        saved = req.postDataJSON();
        if (conflict)
          return route.fulfill({
            status: 409,
            json: { message: "This form changed since you opened it." },
          });
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
      if (path === "/api/v1/marketing/cms/media")
        body = [
          {
            id: "image",
            title: "Choice photo",
            originalName: "choice.png",
            filename: "choice.png",
            mimeType: "image/png",
            url: "/uploads/cms/choice.png",
            fileSize: 50,
          },
          {
            id: "doc",
            title: "Choice document",
            originalName: "document.pdf",
            filename: "document.pdf",
            mimeType: "application/pdf",
            url: "/uploads/cms/document.pdf",
            fileSize: 50,
          },
        ];
      await route.fulfill({ json: body });
    });
    await page.route(
      "https://www.p1landmanagement.com/cms-preview/builder**",
      (route) =>
        route.fulfill({
          contentType: "text/html",
          body: `<!doctype html><p id="status">Waiting</p><script>
     window.received=[]; const channel=new URLSearchParams(location.hash.slice(1)).get('channel');
     addEventListener('message',e=>{if(e.origin==='http://127.0.0.1:4347'&&e.data.channel===channel){window.received.push(e.data);document.querySelector('#status').textContent='Draft received';}});
     parent.postMessage({type:'p1:builder-preview-ready',version:2,channel},'http://127.0.0.1:4347');
    </script>`,
        }),
    );
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
      .getByRole("button", { name: "Preview form", exact: true })
      .click();
    const previewFrame = page.frameLocator("iframe");
    await previewFrame.getByText("Draft received", { exact: true }).waitFor();
    const draftPreview = await previewFrame
      .locator("body")
      .evaluate(() => window.received.at(-1));
    assert.deepEqual(draftPreview.form.fields, form.fields);
    assert.deepEqual(draftPreview.blocks, []);
    assert.equal(mutations, 0);
    await page
      .getByRole("button", { name: "Hide form preview", exact: true })
      .click();

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
    assert.equal(saved.expectedUpdatedAt, "2026-09-17T00:00:00.123Z");
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
      .getByRole("button", { name: "Edit Estimate request", exact: true })
      .click();
    await page
      .getByLabel("Description", { exact: true })
      .fill("Unsaved conflict");
    conflict = true;
    form.updatedAt = "2026-09-17T00:01:00.123Z";
    form.description = "Teammate saved description";
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Save form", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "changed since you opened" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Description", { exact: true }).inputValue(),
      "Unsaved conflict",
    );
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Reload saved form", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Description", { exact: true }).inputValue(),
      "Unsaved conflict",
    );
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Reload saved form", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector('textarea[aria-label="Description"]').value ===
        "Teammate saved description",
    );
    conflict = false;
    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    await page
      .getByRole("button", { name: "View Estimate request submissions" })
      .click();
    await page
      .getByText("<script>window.bad=true</script>", { exact: true })
      .waitFor();
    assert.equal(await page.evaluate(() => window.bad), undefined);
    const downloadCsv = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV", exact: true }).click();
    const csvFile = await downloadCsv;
    assert.equal(csvFile.suggestedFilename(), "p1-estimate-submissions.csv");
    const fs = require("node:fs/promises");
    const csvText = await fs.readFile(await csvFile.path(), "utf8");
    assert(
      csvText.includes(
        '"Submission ID","Submitted At","Source","email","unsafe","nested"',
      ),
    );
    assert(csvText.includes("synthetic@example.test"));
    const downloadJson = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export JSON", exact: true })
      .click();
    const jsonFile = await downloadJson;
    const exported = JSON.parse(
      await fs.readFile(await jsonFile.path(), "utf8"),
    );
    assert.deepEqual(exported[0].data.nested, { scope: ["one", "two"] });
    assert.equal(exported[0].data.unsafe, "<script>window.bad=true</script>");

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
      .getByRole("button", { name: "Choose image 1", exact: true })
      .click();
    const imageDialog = page.getByRole("dialog", {
      name: "Choose form choice image",
    });
    await imageDialog.waitFor();
    assert(
      await imageDialog
        .getByRole("button", { name: /Choice document/ })
        .isDisabled(),
    );
    await imageDialog.getByRole("button", { name: /Choice photo/ }).click();
    assert.equal(
      await page.getByLabel("Choice image URL", { exact: true }).inputValue(),
      "/uploads/cms/choice.png",
    );
    assert.equal(mutations, 3);
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
    mediaAllowed = false;
    await page.reload();
    await page
      .getByRole("button", { name: "Create form", exact: true })
      .click();
    await page
      .getByLabel("New field type", { exact: true })
      .selectOption("image-choice");
    await page.getByRole("button", { name: "Add field", exact: true }).click();
    await page.locator(".form-field-card summary").first().click();
    assert.equal(
      await page
        .getByRole("button", { name: "Choose image 1", exact: true })
        .count(),
      0,
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
