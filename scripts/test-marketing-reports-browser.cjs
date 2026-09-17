const { chromium } = require(
  process.env.PLAYWRIGHT_PACKAGE_PATH ||
    process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict"),
  fs = require("node:fs/promises");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
      acceptDownloads: true,
    });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let grants = ["marketing.search-console.view"],
      failSearch = false,
      failRealtime = false;
    const requested = [];
    const report = (dimension, metric, rows = 12) => ({
      dimensions: dimension ? [dimension] : [],
      metrics: [metric],
      rows: Array.from({ length: rows }, (_, i) => ({
        dimensions: dimension
          ? {
              [dimension]:
                dimension === "date"
                  ? `2026-09-${String(i + 1).padStart(2, "0")}`
                  : i === 0
                    ? "=FORMULA()"
                    : `Example ${i}`,
            }
          : {},
        metrics: { [metric]: i + 1 },
      })),
      rowCount: rows,
      truncated: false,
      metadata: { timeZone: "America/New_York" },
    });
    function payload(search) {
      const metric = search ? "clicks" : "sessions";
      const reports = {
        totals: report(null, metric, 1),
        previousTotals: report(null, metric, 1),
        daily: report("date", metric, 3),
      };
      for (const key of search
        ? ["queries", "pages", "countries", "devices"]
        : [
            "channels",
            "sourceMedium",
            "campaigns",
            "pages",
            "landingPages",
            "countries",
            "regions",
            "cities",
            "devices",
            "browsers",
            "events",
          ])
        reports[key] = report(key, metric);
      return {
        status: "ok",
        fetchedAt: "2026-09-17T00:00:00Z",
        dateRange: { startDate: "2026-09-01", endDate: "2026-09-03" },
        previousDateRange: { startDate: "2026-08-29", endDate: "2026-08-31" },
        reports,
        ...(search
          ? { siteUrl: "https://www.example.test" }
          : { propertyId: "synthetic-property" }),
      };
    }
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      requested.push(path);
      let body = [];
      if (path === "/api/v1/setup")
        body = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        body = {
          id: "synthetic",
          name: "Report Viewer",
          role: "member",
          capabilities: grants,
          mfaRequired: false,
        };
      if (path === "/api/v1/marketing/reporting/search-console") {
        if (failSearch)
          return route.fulfill({
            status: 503,
            json: {
              status: "unavailable",
              code: "provider_unavailable",
              message: "Search Console temporarily unavailable",
            },
          });
        body = payload(true);
      }
      if (path === "/api/v1/marketing/reporting/analytics")
        body = payload(false);
      if (path === "/api/v1/marketing/reporting/realtime") {
        if (failRealtime)
          return route.fulfill({
            status: 503,
            json: {
              status: "unavailable",
              code: "provider_unavailable",
              message: "Realtime temporarily unavailable",
            },
          });
        body = {
          status: "empty",
          propertyId: "synthetic-property",
          fetchedAt: "2026-09-17T00:00:00Z",
          windowMinutes: 30,
          reports: {
            totals: report(null, "activeUsers", 0),
            countries: report("country", "activeUsers", 0),
            devices: report("deviceCategory", "activeUsers", 0),
          },
        };
      }
      await route.fulfill({ json: body });
    });
    const base =
      process.env.DASHBOARD_BROWSER_ORIGIN || "http://127.0.0.1:4347";
    await page.goto(base + "/marketing/reporting/search-console");
    const queries = page.getByRole("region", {
      name: "Search queries",
      exact: true,
    });
    await queries.waitFor();
    assert(
      !requested.some((path) => /reporting\/(analytics|realtime)$/.test(path)),
      "Search-only must not call Analytics",
    );
    await queries.getByRole("button", { name: "Next", exact: true }).click();
    await queries.getByText("Page 2 of 2").waitFor();
    await queries
      .getByRole("textbox", { name: "Search Search queries" })
      .fill("=FORMULA");
    const downloadPromise = page.waitForEvent("download");
    await queries.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadPromise;
    const csv = await fs.readFile(await download.path(), "utf8");
    assert(csv.includes('"\'=FORMULA()"'));
    assert(!csv.includes("Example 2"));
    await page
      .getByRole("combobox", { name: "Daily performance metric" })
      .selectOption("clicks");
    await page
      .getByRole("combobox", { name: "Appearance" })
      .selectOption("dark");
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .waitForFunction(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.querySelector(".sidebar").getBoundingClientRect().right <= 1,
        null,
        { timeout: 10000 },
      )
      .catch(async (error) => {
        console.log(
          await page.evaluate(() => ({
            width: innerWidth,
            scroll: document.documentElement.scrollWidth,
            sidebar: document
              .querySelector(".sidebar")
              .getBoundingClientRect()
              .toJSON(),
            transform: getComputedStyle(document.querySelector(".sidebar"))
              .transform,
            className: document.querySelector(".sidebar").className,
            overflow: [...document.querySelectorAll("body *")]
              .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
              .slice(0, 20)
              .map((el) => [
                el.tagName,
                el.className,
                el.getBoundingClientRect().width,
              ]),
          })),
        );
        throw error;
      });
    await page.evaluate(() => scrollTo(0, 0));
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await fs.mkdir("/tmp/p1-marketing-reports", { recursive: true });
    await page.screenshot({
      path: "/tmp/p1-marketing-reports/search-mobile.png",
    });
    failSearch = true;
    await page.getByRole("button", { name: "Refresh reports" }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Search Console temporarily unavailable" })
      .waitFor();
    assert.equal(await queries.count(), 0, "failed refresh removes stale data");
    grants = ["marketing.analytics.view"];
    failRealtime = true;
    requested.length = 0;
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(base + "/marketing/reporting/analytics");
    await page
      .getByRole("navigation", { name: "Analytics report sections" })
      .waitFor();
    assert(
      !requested.some((path) => path.endsWith("/search-console")),
      "Analytics-only must not call Search Console",
    );
    await page
      .getByRole("navigation", { name: "Analytics report sections" })
      .getByRole("button", { name: "Acquisition" })
      .click();
    await page
      .getByRole("region", { name: "Campaigns", exact: true })
      .waitFor();
    await page.getByText("Realtime unavailable:", { exact: false }).waitFor();
    await page.screenshot({
      path: "/tmp/p1-marketing-reports/analytics-dark.png",
    });
    grants = [];
    requested.length = 0;
    await page.reload();
    await page.waitForURL("**/profile");
    await page.getByRole("heading", { name: "Profile", exact: true }).waitFor();
    assert(
      !requested.some((path) => path.includes("/marketing/reporting/")),
      "revoked account cannot mount reporting",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS reporting source isolation, tables, safe exports, provider failure, revocation, dark/mobile layout",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
