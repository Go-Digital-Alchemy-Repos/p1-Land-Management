const { chromium } = require(
  process.env.PLAYWRIGHT_PACKAGE_PATH ||
    process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");

const origin = process.env.DASHBOARD_BROWSER_ORIGIN || "http://127.0.0.1:4181";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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
            email: "owner@example.test",
            role: "owner",
            capabilities: [],
            mfaRequired: false,
            twoFactorEnabled: true,
          },
        });
      return route.fulfill({ json: [] });
    });

    await page.goto(`${origin}/marketing/content/pages`);
    const dashboard = page.getByRole("navigation", { name: "Dashboard navigation" });
    await dashboard.waitFor();
    const marketing = dashboard.locator(".nav-group[aria-label='Marketing']");
    await marketing.getByRole("button", { name: "Content", exact: true }).waitFor();
    assert.deepEqual(
      await marketing.locator(".nav-group-items").getByRole("button").evaluateAll((buttons) =>
        buttons.map((button) => button.textContent?.trim()),
      ),
      ["Content", "Brand", "Site", "System", "Reporting"],
    );

    const tabs = page.getByRole("navigation", { name: "Content tools" });
    await tabs.getByRole("link", { name: "CMS Pages", exact: true }).waitFor();
    assert.deepEqual(
      await tabs.getByRole("link").evaluateAll((links) =>
        links.map((link) => ({
          label: link.textContent?.trim(),
          path: new URL(link.href).pathname,
          active: link.getAttribute("aria-current"),
        })),
      ),
      [
        { label: "Website", path: "/marketing/content/website", active: null },
        { label: "CMS Pages", path: "/marketing/content/pages", active: "page" },
        { label: "Blog", path: "/marketing/content/blog", active: null },
        { label: "Forms", path: "/marketing/content/forms", active: null },
        { label: "Events", path: "/marketing/content/events", active: null },
        { label: "Careers", path: "/marketing/content/careers", active: null },
        { label: "Team", path: "/marketing/content/team", active: null },
        { label: "Media", path: "/marketing/content/media", active: null },
        { label: "Galleries", path: "/marketing/content/galleries", active: null },
        { label: "Sections", path: "/marketing/content/sections", active: null },
      ],
    );
    await tabs.getByRole("link", { name: "Blog", exact: true }).click();
    await page.waitForURL(`${origin}/marketing/content/blog`);
    assert.equal(
      await page
        .getByRole("navigation", { name: "Content tools" })
        .getByRole("link", { name: "Blog", exact: true })
        .getAttribute("aria-current"),
      "page",
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.getByRole("button", { name: "Toggle navigation" }).waitFor();
    const sidebar = page.locator(".sidebar");
    assert.equal(await sidebar.evaluate((element) => getComputedStyle(element).visibility), "hidden");
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
      "Toggle navigation",
    );
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    assert.equal(await sidebar.evaluate((element) => getComputedStyle(element).visibility), "visible");
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    assert.equal(await sidebar.evaluate((element) => getComputedStyle(element).visibility), "hidden");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await page.getByRole("button", { name: "Toggle navigation" }).waitFor();
    assert.equal(await sidebar.evaluate((element) => getComputedStyle(element).visibility), "hidden");
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    assert.equal(await sidebar.evaluate((element) => getComputedStyle(element).visibility), "visible");

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload();
    await dashboard.waitFor();
    assert.equal(await sidebar.evaluate((element) => getComputedStyle(element).visibility), "visible");
    assert.equal(await page.getByRole("button", { name: "Toggle navigation" }).isVisible(), false);
    assert.deepEqual(errors, []);
    console.log("Marketing navigation browser: deep-link tabs and responsive sidebar focus passed");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
