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
      viewport: { width: 1440, height: 1000 },
    });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (dialog) => dialog.accept());
    let job = {
        id: "job",
        title: "Synthetic opening",
        slug: "synthetic-opening",
        status: "draft",
        visibility: "public",
        employmentType: "full_time",
        workMode: "on_site",
        description: "<p>Saved role description</p>",
        department: "Field team",
        location: "Synthetic site",
        directoryProfileId: "retained-directory",
        integrationMetadata: { retained: "provider-state" },
        updatedAt: "2030-01-01T00:00:00.000Z",
      },
      conflict = true,
      canAccess = true,
      disabled = false;
    const writes = [];
    await page.route("**/api/**", async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      let json = [];
      if (path === "/api/v1/setup")
        json = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        json = {
          id: "synthetic",
          name: "Recruiting staff",
          role: "member",
          capabilities: canAccess ? ["marketing.content.careers"] : [],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = { clients: [], properties: [], staff: [] };
      if (path === "/api/v1/marketing/cms/careers/jobs") {
        if (disabled)
          return route.fulfill({
            status: 404,
            json: { message: "Careers is disabled" },
          });
        if (request.method() === "POST") {
          writes.push(request.postDataJSON());
          return route.abort("failed");
        }
        json = [job];
      }
      if (path === "/api/v1/marketing/cms/careers/jobs/job") {
        if (request.method() === "PUT") {
          const input = request.postDataJSON();
          writes.push(input);
          if (conflict) {
            conflict = false;
            job = {
              ...job,
              summary: "Another editor change",
              updatedAt: "2030-01-02T00:00:00.000Z",
            };
            return route.fulfill({
              status: 409,
              json: { message: "This job changed" },
            });
          }
          assert.equal(input.expectedUpdatedAt, job.updatedAt);
          job = { ...job, ...input, updatedAt: "2030-01-03T00:00:00.000Z" };
        }
        json = job;
      }
      await route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/careers");
    await page
      .getByRole("button", { name: "Edit Synthetic opening", exact: true })
      .click();
    await page.getByLabel("Title", { exact: true }).fill("Local edited title");
    await page.getByRole("button", { name: "Save job", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "This job changed" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Title", { exact: true }).inputValue(),
      "Local edited title",
    );
    assert.equal(writes[0].directoryProfileId, "retained-directory");
    assert.deepEqual(writes[0].integrationMetadata, {
      retained: "provider-state",
    });
    await page.getByRole("button", { name: "Reload saved job" }).click();
    await page.waitForFunction(() => document.querySelector("input") !== null);
    await page.getByLabel("Summary", { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel("Summary", { exact: true }).inputValue(),
      "Another editor change",
    );
    await page.getByLabel("Title", { exact: true }).fill("Reviewed title");
    await page.getByRole("button", { name: "Save job", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("input") !== null);
    await page.getByRole("button", { name: "Back to jobs" }).click();
    await page.getByRole("button", { name: "Edit Reviewed title" }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.getByRole("button", { name: "New job", exact: true }).click();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "/tmp/p1-careers-editor-mobile.png",
      fullPage: true,
    });
    await page.getByLabel("Title", { exact: true }).fill("Uncertain creation");
    await page.getByRole("button", { name: "Create job", exact: true }).click();
    await page
      .getByText("The creation result is uncertain.", { exact: false })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Create job", exact: true })
        .isDisabled(),
      true,
    );
    await page.getByRole("button", { name: "Back to jobs" }).click();
    disabled = true;
    await page.getByRole("button", { name: "Refresh jobs" }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Careers is disabled" })
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Edit Reviewed title" }).count(),
      0,
    );
    canAccess = false;
    await page.reload();
    assert.equal(
      await page
        .getByRole("heading", { name: "Job postings", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Careers browser passed: grant gate, stale-save retention/reload, source metadata, mobile layout, uncertain creation and feature-disabled state.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
