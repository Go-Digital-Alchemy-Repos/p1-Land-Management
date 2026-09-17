const { chromium } = require(
  process.env.PLAYWRIGHT_PACKAGE_PATH ||
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
      viewport: { width: 1280, height: 900 },
    });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let account = {
      id: "member",
      name: "Synthetic Member",
      email: "member@example.test",
      role: "member",
      active: true,
      firstName: "Synthetic",
      lastName: "Member",
      capabilities: ["revenue.sales"],
      suggestedCapabilities: [],
      formNotificationIds: [],
      version: 1,
      reviewedAt: "2026-09-17T00:00:00Z",
      mfaRequired: false,
      twoFactorEnabled: false,
    };
    let conflict = true,
      catalogFails = true;
    const writes = [];
    let recoveryRequests = 0,
      acceptRecovery = false;
    page.on("dialog", (dialog) =>
      acceptRecovery ? dialog.accept() : dialog.dismiss(),
    );
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      let result = {},
        status = 200;
      if (path.endsWith("/notification-forms")) {
        status = catalogFails ? 503 : 200;
        result = catalogFails
          ? { error: "Synthetic catalog unavailable" }
          : {
              items: [
                {
                  id: "11111111-1111-4111-8111-111111111111",
                  name: "Estimate request",
                  slug: "estimate",
                  isActive: true,
                  isSystem: true,
                },
                {
                  id: "22222222-2222-4222-8222-222222222222",
                  name: "Old form",
                  slug: "old",
                  isActive: false,
                  isSystem: false,
                },
              ],
            };
      } else if (path.endsWith("/password-recovery")) {
        recoveryRequests++;
        result = { ok: true };
      } else if (path.endsWith("/users") && request.method() === "GET")
        result = { items: [account] };
      else if (path.endsWith("/invitations") && request.method() === "GET")
        result = { items: [] };
      else if (path.endsWith("/users/member") && request.method() === "PATCH") {
        const body = request.postDataJSON();
        writes.push(body);
        if (conflict) {
          conflict = false;
          account = {
            ...account,
            firstName: "Updated",
            name: "Updated Member",
            version: 2,
          };
          status = 409;
          result = {
            error: "This account changed. Reload and review before saving.",
          };
        } else {
          assert.equal(body.version, 2);
          account = { ...account, ...body, version: 3 };
          result = { version: 3 };
        }
      } else if (path.endsWith("/invitations") && request.method() === "POST") {
        writes.push(request.postDataJSON());
        status = 201;
        result = { id: "invite" };
      } else
        throw new Error(
          `Unexpected fixture request: ${request.method()} ${path}`,
        );
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    });
    await page.goto(
      (process.env.USER_MANAGER_BROWSER_ORIGIN || "http://127.0.0.1:4347") +
        "/tests/user-manager-browser.html",
    );
    await page.getByRole("button", { name: "Manage", exact: true }).click();
    await page
      .getByRole("button", { name: "Choose notification forms", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Existing selections are preserved" })
      .waitFor();
    catalogFails = false;
    await page
      .getByRole("button", { name: "Retry form catalog", exact: true })
      .click();
    const estimateChoice = page.getByRole("checkbox", {
      name: "Estimate request · estimate · System",
      exact: true,
    });
    await estimateChoice.waitFor();
    assert.equal(await estimateChoice.isDisabled(), true);
    await page
      .locator("summary")
      .filter({ hasText: "Marketing · Content" })
      .click();
    await page.getByRole("checkbox", { name: "Forms", exact: true }).check();
    await estimateChoice.check();
    assert.equal(
      await page
        .getByRole("checkbox", {
          name: "Old form · old · Inactive",
          exact: true,
        })
        .isDisabled(),
      true,
    );
    await page
      .getByLabel("First name", { exact: true })
      .fill("My unsaved name");
    await page
      .getByRole("button", { name: "Send password recovery", exact: true })
      .click();
    assert.equal(recoveryRequests, 0);
    acceptRecovery = true;
    await page
      .getByRole("button", { name: "Send password recovery", exact: true })
      .click();
    await page
      .locator("dialog")
      .getByRole("status")
      .filter({ hasText: "Password recovery email queued" })
      .waitFor();
    assert.equal(recoveryRequests, 1);
    assert.equal(writes.length, 0);
    assert.equal(
      await page.getByLabel("First name", { exact: true }).inputValue(),
      "My unsaved name",
    );
    await page.getByRole("button", { name: "Save user", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(
      await page.getByLabel("First name", { exact: true }).inputValue(),
      "My unsaved name",
    );
    await page
      .getByRole("button", { name: "Discard draft and reload saved values" })
      .click();
    await page
      .getByLabel("First name", { exact: true })
      .evaluate(async (input) => {
        await new Promise((resolve, reject) => {
          const started = Date.now();
          const check = () =>
            input.value === "Updated"
              ? resolve()
              : Date.now() - started > 3000
                ? reject(new Error("Fresh saved values not loaded"))
                : setTimeout(check, 20);
          check();
        });
      });
    await page.getByRole("button", { name: "Save user", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Account updated" })
      .waitFor();
    await page
      .getByRole("button", { name: "Invite user", exact: true })
      .click();
    await page.getByLabel("First name", { exact: true }).fill("New");
    await page.getByLabel("Last name", { exact: true }).fill("Member");
    await page.getByLabel("Email", { exact: true }).fill("new@example.test");
    await page
      .locator("summary")
      .filter({ hasText: "Marketing · Reporting" })
      .click();
    await page.getByLabel("Google Analytics", { exact: true }).check();
    await page
      .getByRole("button", { name: "Send invitation", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Invitation queued" })
      .waitFor();
    assert.deepEqual(writes.at(-1).capabilities, ["marketing.analytics.view"]);
    assert.equal(writes.at(-1).role, "member");
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Invite user", exact: true })
      .click();
    await page.getByLabel("Account type", { exact: true }).selectOption("crew");
    await page
      .getByText("Crew access is limited to assigned work.", { exact: false })
      .waitFor();
    assert.equal(
      await page
        .getByRole("heading", { name: "Tool access", exact: true })
        .count(),
      0,
    );
    await page
      .getByLabel("Account type", { exact: true })
      .selectOption("client");
    assert.equal(
      await page
        .getByRole("heading", { name: "Tool access", exact: true })
        .count(),
      0,
    );
    await page
      .getByLabel("Account type", { exact: true })
      .selectOption("member");
    await page
      .getByRole("heading", { name: "Tool access", exact: true })
      .waitFor();
    const bounds = await page.locator("dialog").boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    assert.equal(
      await page
        .locator("dialog")
        .evaluate((element) => element.scrollWidth > element.clientWidth),
      false,
    );
    await page
      .getByRole("button", { name: "Close user editor", exact: true })
      .click();
    account = {
      ...account,
      role: "crew",
      capabilities: ["revenue.sales"],
      formNotificationIds: ["old-form"],
    };
    await page.reload();
    await page.getByRole("button", { name: "Manage", exact: true }).click();
    await page
      .getByText(
        /This account has 1 unsupported office grants and 1 form notification subscriptions/,
      )
      .waitFor();
    assert.equal(
      await page
        .getByRole("heading", { name: "Tool access", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", {
        name: "Clear unsupported office access",
        exact: true,
      })
      .click();
    assert.equal(
      await page
        .getByRole("button", {
          name: "Clear unsupported office access",
          exact: true,
        })
        .count(),
      0,
    );
    assert.deepEqual(
      account.capabilities,
      ["revenue.sales"],
      "cleanup stays in draft until saved",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS User Manager: stale draft preservation, fresh reload/version, isolated report grant, invitation and mobile dialog.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
