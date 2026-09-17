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
    page.on("pageerror", (error) => errors.push(error.message));
    let confirmDelete = false,
      deleted = false,
      deletes = [];
    let job = {
      id: "unused",
      title: "Synthetic unused job",
      slug: "unused",
      status: "draft",
      visibility: "public",
      employmentType: "full_time",
      workMode: "on_site",
      updatedAt: "2030-01-01T00:00:00.000Z",
    };
    page.on("dialog", (dialog) =>
      confirmDelete ? dialog.accept() : dialog.dismiss(),
    );
    await page.route("**/api/**", async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      let json = [];
      if (path === "/api/v1/setup")
        json = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        json = {
          id: "synthetic",
          name: "Recruiter",
          role: "member",
          capabilities: ["marketing.content.careers"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = { clients: [], properties: [], staff: [] };
      if (path === "/api/v1/marketing/cms/careers/jobs")
        json = deleted ? [] : [job];
      if (path === `/api/v1/marketing/cms/careers/jobs/${job.id}`) {
        if (request.method() === "DELETE") {
          const body = request.postDataJSON();
          assert.equal(body.expectedUpdatedAt, job.updatedAt);
          deletes.push(body);
          if (deletes.length === 1) {
            job = { ...job, updatedAt: "2030-01-02T00:00:00.000Z" };
            return route.fulfill({
              status: 409,
              json: {
                message:
                  "This job changed. Reload the saved job before deleting it.",
              },
            });
          }
          deleted = true;
          if (deletes.length === 2) return route.abort("failed");
          return route.fulfill({ json: { success: true } });
        }
        if (deleted)
          return route.fulfill({
            status: 404,
            json: { message: "Job not found" },
          });
        json = job;
      }
      await route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/careers");
    await page
      .getByRole("button", { name: "Edit Synthetic unused job", exact: true })
      .click();
    await page.getByLabel("Title", { exact: true }).fill("Unsaved title");
    assert.equal(
      await page
        .getByRole("button", { name: "Delete job", exact: true })
        .isDisabled(),
      true,
    );
    await page.getByLabel("Title", { exact: true }).fill(job.title);
    await page.getByRole("button", { name: "Delete job", exact: true }).click();
    assert.equal(deletes.length, 0);
    confirmDelete = true;
    await page.getByRole("button", { name: "Delete job", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "This job changed" })
      .waitFor();
    await page
      .getByRole("button", { name: "Reload saved job", exact: true })
      .click();
    await page.getByRole("alert").waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Delete job", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "deletion result is uncertain" })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Delete job", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Save job", exact: true })
        .isDisabled(),
      true,
    );
    await page
      .getByRole("button", { name: "Back to jobs", exact: true })
      .click();
    await page.getByText("No jobs yet.", { exact: true }).waitFor();
    assert.equal(deletes.length, 2);
    job = {
      ...job,
      id: "unused-second",
      updatedAt: "2030-01-03T00:00:00.000Z",
    };
    deleted = false;
    await page
      .getByRole("button", { name: "Refresh jobs", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit Synthetic unused job", exact: true })
      .click();
    await page.getByRole("button", { name: "Delete job", exact: true }).click();
    await page.getByText("No jobs yet.", { exact: true }).waitFor();
    assert.equal(deletes.length, 3);
    assert.deepEqual(errors, []);
    console.log(
      "Career deletion browser passed: dirty-draft protection, confirmation cancellation, stale-version reload, uncertain-delete recovery and successful deletion.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
