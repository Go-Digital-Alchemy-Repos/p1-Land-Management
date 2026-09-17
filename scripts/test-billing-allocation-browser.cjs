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
    const property = {
      id: randomUUID(),
      name: "Synthetic property",
      address: "Synthetic address",
      client_id: randomUUID(),
    };
    const estimates = [
      {
        id: randomUUID(),
        title: "Mixed authorization",
        status: "approved",
        property_id: property.id,
      },
      {
        id: randomUUID(),
        title: "Legacy authorization",
        status: "approved",
        property_id: property.id,
      },
    ];
    const projects = [0, 1].map((i) => ({
      id: randomUUID(),
      name: `Project ${i + 1}`,
      property_id: property.id,
      property_name: property.name,
    }));
    const phases = projects.map((project, i) => ({
      id: randomUUID(),
      project_id: project.id,
      title: `Phase ${i + 1}`,
      scope: "Synthetic scope",
      status: "accepted",
      position: 0,
      version: 1,
      prerequisites: [],
    }));
    const allocations = [
      {
        id: randomUUID(),
        title: "Site setup",
        basis: "one_time",
        approvedCents: 3000,
        billedCents: 1000,
        remainingCents: 2000,
      },
      {
        id: randomUUID(),
        title: "Monthly care",
        basis: "fixed_monthly",
        approvedCents: 4000,
        billedCents: 4000,
        remainingCents: 0,
      },
      {
        id: randomUUID(),
        title: "Site visits",
        basis: "per_visit",
        approvedCents: 5000,
        billedCents: 0,
        remainingCents: 5000,
      },
    ];
    let failOptions = true,
      failBilling = true,
      deferOptions = false,
      releaseOptions,
      heldOptions = false,
      phaseFailure = true;
    const phaseReceipt = randomUUID();
    const writes = [],
      phaseWrites = [],
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body = [];
      if (path === "/api/v1/setup")
        body = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        body = {
          id: "synthetic",
          name: "Billing staff",
          role: "member",
          capabilities: ["revenue.billing", "operations.projects"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        body = { clients: [], properties: [property], staff: [] };
      if (path === "/api/v1/properties") body = [property];
      if (path === "/api/v1/estimates") body = estimates;
      if (path === "/api/v1/projects") body = projects;
      for (let i = 0; i < projects.length; i++)
        if (path === `/api/v1/projects/${projects[i].id}/phases`)
          body = [phases[i]];
      if (path === `/api/v1/estimates/${estimates[0].id}/billing-allocations`) {
        if (failOptions) {
          failOptions = false;
          return route.fulfill({
            status: 503,
            json: { message: "Synthetic authorization unavailable" },
          });
        }
        if (deferOptions) {
          heldOptions = true;
          await new Promise((resolve) => {
            releaseOptions = resolve;
          });
        }
        body = {
          estimateId: estimates[0].id,
          approvedCents: 12000,
          billedCents: 5000,
          remainingCents: 7000,
          allocations,
        };
      }
      if (path === `/api/v1/estimates/${estimates[1].id}/billing-allocations`)
        body = {
          estimateId: estimates[1].id,
          approvedCents: 2500,
          billedCents: 0,
          remainingCents: 2500,
          allocations: [],
        };
      if (path === "/api/v1/billing" && route.request().method() === "POST") {
        writes.push(route.request().postDataJSON());
        if (failBilling) {
          failBilling = false;
          return route.fulfill({
            status: 409,
            json: { error: "Authorization changed" },
          });
        }
        body = { id: randomUUID() };
      }
      if (
        path.endsWith("/billing-intents") &&
        route.request().method() === "POST"
      ) {
        phaseWrites.push(route.request().postDataJSON());
        if (phaseFailure) {
          phaseFailure = false;
          return route.abort("failed"); // Simulate a lost response after the server prepared the draft.
        }
        body = { id: phaseReceipt, created: false };
      }
      await route.fulfill({ json: body }).catch(() => {});
    });
    await page.goto("http://127.0.0.1:4347/billing");
    await page
      .getByRole("button", { name: "Prepare billing", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: /^Property/ })
      .selectOption(property.id);
    await page
      .getByRole("combobox", { name: /^Approved estimate/ })
      .selectOption(estimates[0].id);
    await page.getByRole("button", { name: "Retry authorization" }).waitFor();
    await page
      .getByLabel("Billing description")
      .fill("Synthetic invoice draft");
    await page.getByLabel("Amount (USD)", { exact: true }).fill("19.99");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    assert.equal(writes.length, 0);
    await page.getByRole("button", { name: "Retry authorization" }).click();
    const choice = page.getByRole("combobox", { name: /^Agreement component/ });
    await choice.waitFor();
    assert.equal(
      await choice
        .locator(`option[value="${allocations[1].id}"]`)
        .evaluate((option) => option.disabled),
      true,
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    assert.equal(writes.length, 0);
    await choice.selectOption(allocations[0].id);
    await page
      .getByText("Component remaining: $20.00", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page
      .getByText("Authorization changed", { exact: true })
      .first()
      .waitFor();
    assert.equal(await choice.inputValue(), allocations[0].id);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page
      .getByRole("button", { name: "Prepare billing", exact: true })
      .waitFor();
    assert.equal(writes.length, 2);
    assert.equal(writes[0].estimateAllocationId, allocations[0].id);
    assert.equal(writes[0].amountCents, 1999);
    assert.equal(writes[0].operationId, writes[1].operationId);
    await page
      .getByRole("button", { name: "Prepare billing", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: /^Property/ })
      .selectOption(property.id);
    deferOptions = true;
    await page
      .getByRole("combobox", { name: /^Approved estimate/ })
      .selectOption(estimates[0].id);
    for (let i = 0; i < 50 && !heldOptions; i++)
      await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(heldOptions, true);
    await page
      .getByRole("combobox", { name: /^Approved estimate/ })
      .selectOption(estimates[1].id);
    await page
      .getByText("Estimate remaining: $25.00", { exact: true })
      .waitFor();
    deferOptions = false;
    releaseOptions();
    await page.getByLabel("Billing description").fill("Legacy draft");
    await page.getByLabel("Amount (USD)", { exact: true }).fill("1.00");
    assert.equal(
      await page
        .getByRole("combobox", { name: /^Agreement component/ })
        .count(),
      0,
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page
      .getByRole("button", { name: "Prepare billing", exact: true })
      .waitFor();
    assert.equal(writes[2].estimateId, estimates[1].id);
    assert.equal(writes[2].estimateAllocationId, undefined);
    await page.goto("http://127.0.0.1:4347/projects");
    await page.getByRole("button", { name: "Prepare progress draft" }).click();
    await page
      .getByRole("combobox", { name: /^Approved estimate/ })
      .selectOption(estimates[0].id);
    await page
      .getByRole("combobox", { name: /^Agreement component/ })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Prepare draft", exact: true })
        .isDisabled(),
      true,
    );
    await page
      .getByRole("combobox", { name: /^Agreement component/ })
      .selectOption(allocations[2].id);
    await page.getByLabel("Amount (USD)", { exact: true }).fill("12.34");
    await page
      .getByRole("button", { name: "Prepare draft", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Retry same draft", exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Amount (USD)", { exact: true }).isDisabled(),
      true,
    );
    assert.equal(
      await page.getByRole("combobox", { name: /^Project/ }).isDisabled(),
      true,
    );
    assert.equal(phaseWrites[0].estimateAllocationId, allocations[2].id);
    assert.equal(phaseWrites[0].amountCents, 1234);
    assert.equal(
      await page
        .getByRole("combobox", { name: /^Agreement component/ })
        .inputValue(),
      allocations[2].id,
    );
    await page
      .getByRole("button", { name: "Retry same draft", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Retry same draft", exact: true })
      .waitFor({ state: "hidden" });
    assert.deepEqual(phaseWrites[1], phaseWrites[0]);
    assert.equal(await page.getByRole("alert").count(), 0);
    await page
      .getByRole("combobox", { name: /^Project/ })
      .selectOption(projects[1].id);
    await page.getByRole("heading", { name: "Phase 2", exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("combobox", { name: /^Agreement component/ })
        .count(),
      0,
    );
    await page.getByRole("button", { name: "Prepare progress draft" }).click();
    assert.equal(
      await page
        .getByRole("combobox", { name: /^Approved estimate/ })
        .inputValue(),
      "",
    );
    await page
      .getByRole("combobox", { name: /^Approved estimate/ })
      .selectOption(estimates[0].id);
    await page
      .getByRole("combobox", { name: /^Agreement component/ })
      .waitFor();
    await page
      .locator(".project-phases")
      .screenshot({ path: "/tmp/p1-billing-allocation-desktop.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
    );
    await page
      .getByRole("combobox", { name: /^Agreement component/ })
      .waitFor();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page
      .locator(".project-phases")
      .screenshot({ path: "/tmp/p1-billing-allocation-mobile.png" });
    assert.deepEqual(errors, []);
    console.log(
      "Billing allocation UI passed: unavailable/loading gates, explicit selection, exhausted choices, conflict retention, exact cents, stale response exclusion, legacy estimates, project switching, lost-response phase retry, and mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
