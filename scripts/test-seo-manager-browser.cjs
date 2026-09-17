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
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let accept = true;
    page.on("dialog", (d) => (accept ? d.accept() : d.dismiss()));
    let defaults = {
        siteName: "P1 test",
        titleSuffix: " | P1",
        defaultMetaDescription: "Original",
        defaultRobotsNoindex: false,
      },
      robots = {
        generatedContent: "User-agent: *\nDisallow: /admin\n",
        effectiveContent: "User-agent: *\nDisallow: /admin\n",
        customContent: null,
      },
      redirects = [],
      capabilities = ["marketing.content.seo"];
    let calls = [];
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      calls.push(path);
      let body = [];
      if (path.endsWith("/setup"))
        body = { initialized: true, configured: true };
      if (path.endsWith("/me"))
        body = {
          id: "synthetic",
          name: "SEO editor",
          role: "member",
          capabilities,
          mfaRequired: false,
        };
      if (path.endsWith("/cms/seo")) {
        if (req.method() === "PUT")
          defaults = { ...defaults, ...req.postDataJSON() };
        body = defaults;
      }
      if (path.endsWith("/robots-txt")) {
        if (req.method() === "PUT") {
          robots.customContent = req.postDataJSON().customContent;
          robots.effectiveContent =
            robots.customContent || robots.generatedContent;
        }
        body = robots;
      }
      if (path.endsWith("/redirects")) {
        if (req.method() === "POST") {
          body = { ...req.postDataJSON(), id: "redirect" };
          redirects = [body];
        } else body = redirects;
      }
      if (path.endsWith("/redirects/redirect")) {
        if (req.method() === "DELETE") {
          redirects = [];
          body = { success: true };
        } else {
          redirects = [{ ...req.postDataJSON(), id: "redirect" }];
          body = redirects[0];
        }
      }
      if (path.endsWith("/seo-audit"))
        body = {
          pages: [
            {
              id: "page",
              title: "Synthetic CMS page",
              slug: "sample",
              issues: ["missing_seo_title"],
            },
          ],
          posts: [],
          events: [],
        };
      await route.fulfill({ json: body });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/seo");
    await page.getByLabel("Site name", { exact: true }).fill("P1 updated");
    accept = false;
    await page.getByRole("button", { name: "Redirects", exact: true }).click();
    assert.equal(
      await page.getByLabel("Site name", { exact: true }).inputValue(),
      "P1 updated",
    );
    accept = true;
    await page
      .getByRole("button", { name: "Save SEO defaults", exact: true })
      .click();
    await page.getByText("SEO defaults saved.", { exact: true }).waitFor();
    assert.equal(defaults.siteName, "P1 updated");
    assert.equal(
      await page
        .getByRole("button", { name: "Choose social image", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Sitemap and robots", exact: true })
      .click();
    await page
      .getByLabel("Custom robots.txt", { exact: true })
      .fill("User-agent: *\nDisallow: /private");
    await page
      .getByRole("button", { name: "Save robots content", exact: true })
      .click();
    await page.getByText("Robots settings saved.", { exact: true }).waitFor();
    assert.ok(robots.customContent.includes("/private"));
    await page
      .getByRole("button", { name: "Restore generated default", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelector("textarea")?.value === "",
    );
    assert.equal(robots.customContent, null);
    await page.getByRole("button", { name: "Redirects", exact: true }).click();
    await page.getByLabel("From path", { exact: true }).fill("/old");
    await page.getByLabel("Destination", { exact: true }).fill("/new");
    await page
      .getByRole("button", { name: "Save redirect", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit /old", exact: true })
      .waitFor();
    assert.equal(redirects[0].statusCode, 301);
    await page.getByLabel("Active", { exact: true }).uncheck();
    await page
      .getByRole("button", { name: "Save redirect", exact: true })
      .click();
    await page.getByText("301 · Inactive", { exact: true }).waitFor();
    assert.equal(redirects[0].isActive, false);
    await page
      .getByRole("button", { name: "Delete redirect", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit /old", exact: true })
      .waitFor({ state: "detached" });
    assert.equal(redirects.length, 0);
    await page.getByRole("button", { name: "Audit", exact: true }).click();
    await page.getByText("missing seo title", { exact: true }).waitFor();
    assert.ok(
      !calls.some((p) => p.endsWith("/cms/pages") || p.endsWith("/cms/blog")),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: "/tmp/p1-seo-mobile.png", fullPage: true });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    capabilities = [];
    await page.reload();
    await page
      .getByRole("heading", { name: "CMS SEO audit", exact: true })
      .waitFor({ state: "detached" });
    assert.deepEqual(errors, []);
    console.log(
      "SEO browser checks passed: defaults, dirty guard, independent media grant, robots override/reset, redirect lifecycle, minimized audit, mobile and revocation.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
