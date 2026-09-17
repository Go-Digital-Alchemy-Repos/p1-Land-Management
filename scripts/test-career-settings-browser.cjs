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
    page.on("dialog", (dialog) => dialog.accept());
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let owner = true,
      reads = 0,
      writes = [];
    let settings = {
      version: "a".repeat(64),
      sharing: {
        enabled: true,
        copyLink: true,
        nativeShare: true,
        email: true,
        linkedin: true,
        facebook: false,
        x: true,
      },
      integrations: {
        googleIndexingEnabled: false,
        indeedFeedEnabled: true,
        indeedApplyEnabled: false,
        indeedDispositionSyncEnabled: true,
        zipRecruiterEnabled: false,
        linkedinApiEnabled: false,
        genericWebhookEnabled: false,
        linkedinPartnerId: "synthetic-partner",
        genericWebhookUrl: "https://example.test/careers",
        googleServiceAccountJson: "",
        indeedApplySecret: "",
        zipRecruiterApiKey: "",
        genericWebhookSecret: "",
      },
    };
    await page.route("**/api/**", async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      let json = [];
      if (path === "/api/v1/setup")
        json = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        json = {
          id: "synthetic",
          name: "Owner",
          role: owner ? "owner" : "member",
          capabilities: owner ? [] : ["marketing.content.careers"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = { clients: [], properties: [], staff: [] };
      if (path === "/api/v1/marketing/cms/careers/settings") {
        if (request.method() === "PUT") {
          const body = request.postDataJSON();
          assert.equal(body.version, settings.version);
          writes.push(body);
          const { clearCredentials, ...persisted } = body;
          if (writes.length === 3) {
            settings = {
              ...settings,
              version: "d".repeat(64),
              integrations: {
                ...settings.integrations,
                linkedinPartnerId: "other-session",
              },
            };
            return route.fulfill({
              status: 409,
              json: { message: "These settings changed" },
            });
          }
          if (writes.length === 1) {
            settings = {
              ...persisted,
              version: "b".repeat(64),
              integrations: { ...body.integrations, indeedApplySecret: "" },
            };
            return route.abort("failed");
          }
          settings = {
            ...persisted,
            version: String.fromCharCode(97 + writes.length).repeat(64),
            integrations: {
              ...body.integrations,
              googleServiceAccountJson: "",
              indeedApplySecret: "",
              zipRecruiterApiKey: "",
              genericWebhookSecret: "",
            },
          };
          if (writes.length === 4) return route.abort("failed");
          json = settings;
        } else {
          reads++;
          json = settings;
        }
      }
      await route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/careers");
    await page
      .getByRole("button", { name: "Careers settings", exact: true })
      .click();
    await page.getByLabel("LinkedIn partner ID", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByLabel("LinkedIn partner ID", { exact: true })
        .inputValue(),
      "synthetic-partner",
    );
    assert.equal(
      await page.getByLabel("Facebook", { exact: true }).isChecked(),
      false,
    );
    assert.equal(
      await page
        .getByLabel("Indeed disposition sync", { exact: true })
        .isChecked(),
      true,
    );
    await page
      .getByLabel("Indeed Apply shared secret", { exact: true })
      .fill("synthetic-replacement");
    await page.getByLabel("Email", { exact: true }).uncheck();
    await page
      .getByRole("button", { name: "Save Careers settings", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    assert.equal(
      await page
        .getByLabel("Indeed Apply shared secret", { exact: true })
        .inputValue(),
      "synthetic-replacement",
    );
    assert.equal(
      await page.getByLabel("Email", { exact: true }).isChecked(),
      false,
    );
    assert.equal(writes.length, 1);
    assert.equal(writes[0].integrations.indeedDispositionSyncEnabled, true);
    assert.equal(writes[0].integrations.googleServiceAccountJson, "");
    await page
      .getByRole("button", { name: "Reload saved settings", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector('input[autocomplete="new-password"]')?.value ===
        "",
    );
    await page
      .getByRole("button", { name: "Save Careers settings", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByLabel("Indeed Apply shared secret", { exact: true })
        .inputValue(),
      "",
    );
    assert.equal(
      await page.getByLabel("Email", { exact: true }).isChecked(),
      false,
    );
    assert.equal(writes.length, 1);
    await page
      .getByLabel("Webhook signing secret", { exact: true })
      .fill("synthetic-webhook");
    await page
      .getByRole("button", { name: "Save Careers settings", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Careers settings saved" })
      .waitFor();
    assert.equal(
      await page
        .getByLabel("Webhook signing secret", { exact: true })
        .inputValue(),
      "",
    );
    assert.equal(writes.length, 2);
    await page
      .getByLabel("LinkedIn partner ID", { exact: true })
      .fill("local-session");
    await page
      .getByRole("button", { name: "Save Careers settings", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "These settings changed" })
      .waitFor();
    assert.equal(
      await page
        .getByLabel("LinkedIn partner ID", { exact: true })
        .inputValue(),
      "local-session",
    );
    await page
      .getByRole("button", { name: "Reload saved settings", exact: true })
      .click();
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll("input")).some(
        (input) => input.value === "other-session",
      ),
    );
    await page.getByLabel("Indeed Apply", { exact: true }).check();
    await page
      .getByRole("checkbox", {
        name: "Remove saved Indeed Apply shared secret",
        exact: true,
      })
      .check();
    assert.equal(
      await page.getByLabel("Indeed Apply", { exact: true }).isChecked(),
      false,
    );
    assert.equal(
      await page.getByLabel("Indeed Apply", { exact: true }).isDisabled(),
      true,
    );
    assert.equal(
      await page
        .getByLabel("Indeed Apply shared secret", { exact: true })
        .isDisabled(),
      true,
    );
    await page
      .getByRole("button", { name: "Save Careers settings", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    assert.deepEqual(writes[3].clearCredentials, ["indeedApplySecret"]);
    assert.equal(writes[3].integrations.indeedApplyEnabled, false);
    assert.equal(writes[3].integrations.indeedApplySecret, "");
    assert.equal(
      await page
        .getByRole("checkbox", {
          name: "Remove saved Indeed Apply shared secret",
          exact: true,
        })
        .isChecked(),
      true,
    );
    await page
      .getByRole("button", { name: "Reload saved settings", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("label"))
          .find(
            (label) =>
              label.textContent.trim() ===
              "Remove saved Indeed Apply shared secret",
          )
          ?.querySelector("input")?.checked === false,
    );
    assert.equal(writes.length, 4);
    assert.equal(
      await page.getByLabel("Indeed Apply", { exact: true }).isChecked(),
      false,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar")?.getBoundingClientRect().right <= 0,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: "/tmp/p1-career-settings-mobile.png",
      fullPage: true,
    });
    const previousReads = reads;
    owner = false;
    await page.reload();
    await page
      .getByRole("button", { name: "Applications", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Careers settings", exact: true })
        .count(),
      0,
    );
    assert.equal(reads, previousReads);
    assert.deepEqual(errors, []);
    console.log(
      "Career settings browser passed: Owner visibility, loaded settings parity, secret replacement, failed-save retention, stale-version conflict/reload, explicit credential removal with integration disabled and lost-response recovery, member exclusion and mobile layout.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
