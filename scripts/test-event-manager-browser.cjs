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
      timezoneId: "America/New_York",
    });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let deny = false,
      fail = true,
      saved,
      created,
      duplicates = 0;
    let event = {
      id: "event",
      title: "Field workshop",
      slug: "field-workshop",
      date: "2026-10-01T13:00:00.123Z",
      endDate: "2026-10-01T14:00:00Z",
      timezone: "America/New_York",
      status: "published",
      visibility: "members_only",
      description: "<p>Saved description</p>",
      registrationEnabled: true,
      registrationFee: 12500,
      registrationType: "paid",
      registrationFormId: "saved-form",
      isRecurring: true,
      recurrencePattern: "weekly",
      recordingUrl: "https://example.test/recording",
      tags: ["saved"],
      createdAt: "2026-09-17T00:00:00Z",
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
          name: "Events editor",
          role: "member",
          capabilities: deny ? [] : ["marketing.content.events"],
          mfaRequired: false,
        };
      if (path === "/api/v1/marketing/cms/events") {
        if (req.method() === "POST") {
          created = req.postDataJSON();
          body = { ...created, id: "new", slug: "new-event" };
        } else body = [event];
      }
      if (path === "/api/v1/marketing/cms/events/event") {
        if (req.method() === "PUT") {
          saved = req.postDataJSON();
          if (fail)
            return route.fulfill({
              status: 503,
              json: { message: "Synthetic save failure" },
            });
          event = { ...event, ...saved };
        }
        body = event;
      }
      if (path === "/api/v1/marketing/cms/events/event/duplicate") {
        duplicates++;
        body = {
          ...event,
          id: "copy",
          title: "Copy of Field workshop",
          status: "draft",
        };
      }
      if (path === "/api/v1/marketing/cms/events/copy")
        body = {
          ...event,
          id: "copy",
          title: "Copy of Field workshop",
          status: "draft",
        };
      await route.fulfill({ json: body });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/events");
    await page.getByText("10/1/2026, 9:00:00 AM · America/New_York",{exact:true}).waitFor();
    await page
      .getByRole("button", { name: "Edit Field workshop", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Start date", { exact: true }).inputValue(),
      "2026-10-01T09:00",
    );
    assert.equal(
      await page.getByLabel("Visibility", { exact: true }).inputValue(),
      "members_only",
    );
    await page.getByLabel("Title", { exact: true }).fill("Updated workshop");
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: "Save event", exact: true }).click();
    assert.equal(saved, undefined);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Save event", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Synthetic save failure" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Title", { exact: true }).inputValue(),
      "Updated workshop",
    );
    assert.equal(saved.date, "2026-10-01T13:00:00.123Z");
    assert.equal(saved.description, event.description);
    assert.deepEqual(saved.tags, ["saved"]);
    assert.equal(saved.registrationFee, 12500);
    assert.equal(saved.registrationFormId, "saved-form");
    assert.equal(saved.recurrencePattern, "weekly");
    assert.equal(saved.recordingUrl, event.recordingUrl);
    assert(!Object.hasOwn(saved, "id"));
    assert(!Object.hasOwn(saved, "createdAt"));
    fail = false;
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Save event", exact: true }).click();
    await page.getByText("Event saved.", { exact: true }).waitFor();
    await page
      .getByLabel("Filter status", { exact: true })
      .selectOption("draft");
    await page.getByText("No matching events.", { exact: true }).waitFor();
    await page.getByLabel("Filter status", { exact: true }).selectOption("all");
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Duplicate Updated workshop", exact: true })
      .click();
    await page
      .getByRole("heading", {
        name: "Edit Copy of Field workshop",
        exact: true,
      })
      .waitFor();
    assert.equal(duplicates, 1);
    assert.equal(
      await page.getByLabel("Status", { exact: true }).inputValue(),
      "draft",
    );
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("button", { name: "Create event", exact: true })
      .click();
    await page.getByLabel("Title", { exact: true }).fill("New event");
    await page
      .getByLabel("Start date", { exact: true })
      .fill("2026-10-02T10:30");
    await page.getByRole("button", { name: "Save event", exact: true }).click();
    await page.getByText("Event saved.", { exact: true }).waitFor();
    assert.equal(created.status, "draft");
    assert.equal(created.date, "2026-10-02T14:30:00.000Z");
    assert.equal(created.registrationEnabled, false);
    await page
      .getByRole("button", { name: "Create event", exact: true })
      .click();
    await page.getByLabel("Title", { exact: true }).fill("Unsaved");
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(
      await page.getByLabel("Title", { exact: true }).inputValue(),
      "Unsaved",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    deny = true;
    await page.reload();
    await page.waitForTimeout(500);
    assert.equal(
      await page
        .getByRole("button", { name: "Create event", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Events browser checks passed: dates, draft creation, publication confirmation, save retry, retained settings, duplication, filtering, discard and permission boundaries.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
