const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
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
    page.on("dialog", (d) => d.accept());
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const resumeBytes = Buffer.from([0, 255, 13, 10, 37, 80, 68, 70]);
    let resumeRequests = 0;
    let row = {
        id: "app",
        jobId: "job",
        job: { title: "Synthetic field technician" },
        source: "website",
        firstName: "Synthetic",
        lastName: "Applicant",
        email: "applicant@example.test",
        status: "new",
        updatedAt: "2030-01-01T00:00:00.000Z",
        createdAt: "2030-01-01T00:00:00.000Z",
        notes: [],
        resumeFileName: "synthetic.pdf",
        coverLetter: "<script>Literal cover letter</script>",
        linkedinUrl: "javascript:alert(1)",
      },
      writes = [];
    await page.route("**/api/**", async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      if (path === "/api/v1/marketing/cms/careers/applications/app/resume") {
        resumeRequests++;
        if (resumeRequests === 1)
          return route.fulfill({ status: 404, json: { message: "Missing" } });
        if (resumeRequests === 2) return route.abort("failed");
        if (resumeRequests === 3)
          return route.fulfill({ status: 403, json: { message: "Denied" } });
        return route.fulfill({
          contentType: "application/octet-stream",
          body: resumeBytes,
        });
      }
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
      if (path === "/api/v1/marketing/cms/careers/applications") json = [row];
      if (path === "/api/v1/marketing/cms/careers/applications/app") {
        if (request.method() === "PUT") {
          const body = request.postDataJSON();
          writes.push(body);
          if (writes.length === 1) {
            row = {
              ...row,
              status: "reviewing",
              updatedAt: "2030-01-02T00:00:00.000Z",
              notes: [
                {
                  id: "first",
                  note: "Other recruiter reviewed",
                  statusFrom: "new",
                  statusTo: "reviewing",
                  createdAt: "2030-01-02",
                },
              ],
            };
            return route.fulfill({
              status: 409,
              json: { message: "This application changed" },
            });
          }
          assert.equal(body.expectedUpdatedAt, row.updatedAt);
          row = {
            ...row,
            status: body.status,
            updatedAt: "2030-01-03T00:00:00.000Z",
            notes: [
              ...row.notes,
              {
                id: "second",
                note: body.note,
                statusFrom: row.status,
                statusTo: body.status,
                createdAt: "2030-01-03",
              },
            ],
          };
          return route.abort("failed");
        }
        json = row;
      }
      await route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/careers");
    await page
      .getByRole("button", { name: "Applications", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Review Synthetic Applicant", exact: true })
      .click();
    await page
      .getByText("<script>Literal cover letter</script>", { exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole("link", { name: "LinkedIn profile" }).count(),
      0,
    );
    await page
      .getByLabel("Review note", { exact: true })
      .fill("Preserved during download");
    for (const message of [
      "This resume is unavailable",
      "could not be downloaded",
      "Your access has changed",
    ]) {
      await page
        .getByRole("button", { name: "Download resume", exact: true })
        .click();
      await page.getByRole("alert").filter({ hasText: message }).waitFor();
      assert.equal(
        await page.getByLabel("Review note", { exact: true }).inputValue(),
        "Preserved during download",
      );
      assert.equal(writes.length, 0);
    }
    const downloadEvent = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download resume", exact: true })
      .click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(), "synthetic.pdf");
    assert.deepEqual(await readFile(await download.path()), resumeBytes);
    assert.equal(await page.getByRole("alert").count(), 0);
    assert.equal(resumeRequests, 4);
    await page
      .getByLabel("Application status", { exact: true })
      .selectOption("shortlisted");
    await page.getByLabel("Review note", { exact: true }).fill("Local note");
    await page
      .getByRole("button", { name: "Save review", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "This application changed" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Review note", { exact: true }).inputValue(),
      "Local note",
    );
    assert.equal(
      await page.getByLabel("Application status", { exact: true }).inputValue(),
      "shortlisted",
    );
    await page
      .getByRole("button", { name: "Reload saved application" })
      .click();
    await page.getByText("Other recruiter reviewed", { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel("Review note", { exact: true }).inputValue(),
      "",
    );
    await page
      .getByLabel("Review note", { exact: true })
      .fill("Committed note");
    await page
      .getByLabel("Application status", { exact: true })
      .selectOption("interviewing");
    await page
      .getByRole("button", { name: "Save review", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    assert.equal(
      await page.getByLabel("Review note", { exact: true }).inputValue(),
      "Committed note",
    );
    await page
      .getByRole("button", { name: "Reload saved application" })
      .click();
    await page
      .locator("ol")
      .getByText("Committed note", { exact: true })
      .waitFor();
    assert.equal(writes.length, 2);
    assert.equal(
      await page.getByLabel("Review note", { exact: true }).inputValue(),
      "",
    );
    assert.equal(
      await page.getByLabel("Application status", { exact: true }).inputValue(),
      "interviewing",
    );
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
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: "/tmp/p1-career-application-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Career application browser passed: literal applicant text, safe links, resume download bytes/filename and missing/network/access recovery, stale-review retention, lost-response recovery and mobile layout.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
