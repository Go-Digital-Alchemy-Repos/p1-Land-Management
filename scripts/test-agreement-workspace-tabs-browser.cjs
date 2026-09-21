const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");

const origin = process.env.DASHBOARD_TEST_ORIGIN || "http://127.0.0.1:4347";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    page.setDefaultTimeout(10_000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.stack || error.message));
    await page.route("**/api/**", async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/api/v1/setup")
        return route.fulfill({ json: { initialized: true, configured: true } });
      if (pathname === "/api/v1/me")
        return route.fulfill({
          json: {
            id: "owner",
            name: "Workspace owner",
            role: "owner",
            capabilities: [],
            mfaRequired: false,
            twoFactorEnabled: true,
          },
        });
      if (pathname === "/api/v1/workspace/references")
        return route.fulfill({ json: { clients: [], properties: [], staff: [] } });
      if (pathname === "/api/v1/service-agreements")
        return route.fulfill({ json: { items: [], nextCursor: null } });
      if (
        pathname === "/api/v1/agreement-charge-queue" ||
        pathname === "/api/v1/agreement-preparation-jobs"
      )
        return route.fulfill({ json: { items: [], nextCursor: null } });
      return route.fulfill({ json: [] });
    });

    await page.goto(`${origin}/agreements`);
    await page.getByRole("navigation", { name: "Dashboard navigation" }).waitFor();
    const revenue = page.locator(".nav-group[aria-label='Revenue']");
    await revenue.getByRole("button", { name: "Agreements", exact: true }).waitFor();
    assert.equal(
      await revenue.locator(".nav-group-items").innerText(),
      "Sales\nAgreements\nBilling\nExpenses",
    );

    const tabs = page.getByRole("navigation", { name: "Agreement workspace" });
    await tabs.getByRole("link", { name: "Templates", exact: true }).waitFor();
    assert.deepEqual(
      await tabs.getByRole("link").evaluateAll((links) =>
        links.map((link) => ({
          text: link.textContent?.trim(),
          href: new URL(link.href).pathname,
          active: link.getAttribute("aria-current"),
        })),
      ),
      [
        { text: "Agreements", href: "/agreements", active: "page" },
        { text: "Drafts", href: "/agreements/drafts", active: null },
        { text: "Templates", href: "/agreements/templates", active: null },
      ],
    );

    await tabs.getByRole("link", { name: "Drafts", exact: true }).click();
    await page.waitForURL(`${origin}/agreements/drafts`);
    assert.equal(
      await page
      .getByRole("navigation", { name: "Agreement workspace" })
      .getByRole("link", { name: "Drafts", exact: true })
      .getAttribute("aria-current"),
      "page",
    );

    await page
      .getByRole("navigation", { name: "Agreement workspace" })
      .getByRole("link", { name: "Templates", exact: true })
      .click();
    await page.waitForURL(`${origin}/agreements/templates`);
    assert.equal(
      await page
      .getByRole("navigation", { name: "Agreement workspace" })
      .getByRole("link", { name: "Templates", exact: true })
      .getAttribute("aria-current"),
      "page",
    );

    await page.screenshot({ path: "/tmp/p1-agreement-workspace-tabs.png", fullPage: true });
    assert.deepEqual(errors, []);
    console.log("Agreement workspace browser: deep-link tabs and Revenue sidebar passed");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
