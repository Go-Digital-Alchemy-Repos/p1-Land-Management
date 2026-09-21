const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");

const origin = process.env.DASHBOARD_TEST_ORIGIN || "http://127.0.0.1:4347";
const today = Object.fromEntries(
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .filter((part) => ["year", "month", "day"].includes(part.type))
    .map((part) => [part.type, part.value]),
);
const todayDate = `${today.year}-${today.month}-${today.day}`;

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
      const { pathname, searchParams } = new URL(route.request().url());
      if (pathname === "/api/v1/setup")
        return route.fulfill({ json: { initialized: true, configured: true } });
      if (pathname === "/api/v1/me")
        return route.fulfill({
          json: {
            id: "schedule-manager",
            name: "Schedule manager",
            role: "manager",
            capabilities: ["operations.schedule", "operations.recurring"],
            mfaRequired: false,
            twoFactorEnabled: true,
          },
        });
      if (pathname === "/api/v1/workspace/references")
        return route.fulfill({ json: { clients: [], properties: [], staff: [{ id: "crew-1", name: "North crew", canAssignWork: true }] } });
      if (pathname === "/api/v1/recurring-jobs")
        return route.fulfill({
          json: [
            {
              id: "recurring-1",
              property_id: "property-1",
              title: "Weekly grounds care",
              cadence: "weekly",
              interval_count: 1,
              next_date: todayDate,
              local_time: "09:30:00",
              paused: false,
              property_name: "Synthetic property",
              client_name: "Synthetic client",
              generation_status: "Authorized for next visit",
            },
          ],
        });
      if (pathname === "/api/v1/schedule")
        return route.fulfill({
          json: {
            items: searchParams.get("unscheduled") === "true" ? [] : [
              {
                id: "work-1",
                title: "Scheduled grounds care",
                property_name: "Synthetic property",
                scheduled_at: `${todayDate}T14:00:00.000Z`,
                assigned_to: "crew-1",
                status: "scheduled",
              },
            ],
            nextCursor: null,
          },
        });
      if (pathname === "/api/v1/field/conflicts")
        return route.fulfill({ json: { items: [], hasMore: false } });
      if (pathname === "/api/v1/assessment-availability")
        return route.fulfill({
          json: {
            config: { version: 1, duration_minutes: 60, buffer_before: 0, buffer_after: 0, windows: [] },
            blackouts: [],
          },
        });
      return route.fulfill({ json: [] });
    });

    await page.goto(`${origin}/schedule`);
    const tabs = page.getByRole("navigation", { name: "Schedule workspace" });
    await tabs.getByRole("link", { name: "Recurring", exact: true }).waitFor();
    const operations = page.locator(".nav-group[aria-label='Operations']");
    assert.equal(await operations.getByText("Schedule", { exact: true }).count(), 1);
    assert.equal(await operations.getByText("Recurring", { exact: true }).count(), 0);

    assert.deepEqual(
      await tabs.getByRole("link").evaluateAll((links) => links.map((link) => ({
        text: link.textContent?.trim(),
        href: new URL(link.href).pathname,
      }))),
      [
        { text: "Schedule", href: "/schedule" },
        { text: "Recurring", href: "/recurring" },
      ],
    );

    await page.getByRole("group", { name: "Calendar view" }).getByRole("button", { name: "Month", exact: true }).click();
    assert.equal(await page.locator(".calendar-days.month .calendar-day").count(), 42);

    await tabs.getByRole("link", { name: "Recurring", exact: true }).click();
    await page.waitForURL(`${origin}/recurring`);
    const recurringCalendar = page.getByRole("region", { name: "Recurring calendar" });
    await recurringCalendar.getByText("Weekly grounds care", { exact: false }).waitFor();
    assert.equal(
      await recurringCalendar.getByText("Authorized for next visit", { exact: true }).count(),
      1,
    );
    await page.screenshot({ path: "/tmp/p1-schedule-workspace.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    );
    assert.deepEqual(errors, []);
    console.log("Schedule workspace browser: deep-link tabs, month view, and recurring calendar passed");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
