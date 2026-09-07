import { expect, test } from "@playwright/test";

test("admin form controls fit the viewport", async ({ page }) => {
  await page.goto("/auth/login");
  await page.evaluate(() => {
    document.body.innerHTML = `
      <main class="admin-shell admin-main min-w-0 p-4">
        <form class="grid grid-cols-2 gap-4">
          <label class="min-w-0">Name<input style="width:100%" /></label>
          <label class="min-w-0">Status<select style="width:100%"><option>Active</option></select></label>
          <button type="button">Save changes</button>
        </form>
      </main>`;
  });
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("admin shell selects the correct presentation without horizontal overflow", async ({
  page,
}, testInfo) => {
  await page.goto("/auth/login");
  await page.evaluate(() => {
    document.body.innerHTML = `
      <div class="admin-shell flex min-h-dvh min-w-0">
        <aside class="admin-desktop-sidebar">
          <div class="admin-sidebar-panel" style="width:256px;height:100dvh"></div>
        </aside>
        <div class="min-w-0 flex-1">
          <header class="admin-mobile-header">Mobile admin</header>
          <main class="admin-main min-w-0"><div style="width:100%">Content</div></main>
        </div>
      </div>`;
  });

  const width = testInfo.project.use.viewport?.width ?? 0;
  const touchPhone = Boolean(testInfo.project.use.hasTouch) && width < 768;
  const desktopSidebar = page.locator(".admin-desktop-sidebar");
  const mobileHeader = page.locator(".admin-mobile-header");

  if (touchPhone) {
    await expect(desktopSidebar).toBeHidden();
    await expect(mobileHeader).toBeVisible();
  } else {
    await expect(desktopSidebar).toBeVisible();
    await expect(mobileHeader).toBeHidden();
    const sidebarWidth = await page
      .locator(".admin-sidebar-panel")
      .evaluate((element) => Math.round(element.getBoundingClientRect().width));
    expect(sidebarWidth).toBe(width >= 1024 ? 256 : 68);
  }

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});
