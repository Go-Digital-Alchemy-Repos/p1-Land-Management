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
      viewport: { width: 1400, height: 1100 },
    });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let menus = [],
      saved,
      deny = false,
      lockOwned = true;
    const calls = [];
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      calls.push(path);
      let body = [];
      if (path === "/api/v1/setup")
        body = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        body = {
          id: "synthetic",
          name: "Menu Editor",
          role: "member",
          capabilities: deny ? [] : ["marketing.content.menus"],
          mfaRequired: false,
        };
      if (path.endsWith("/menu-references"))
        body = {
          pages: [
            {
              id: "page",
              title: "About P1",
              slug: "about",
              status: "published",
            },
          ],
          forms: [{ id: "form", name: "Estimate request", slug: "estimate" }],
        };
      if (path.includes("/editor-locks/"))
        body = {
          status: lockOwned ? "acquired" : "locked_by_other",
          ownedByCurrentUser: lockOwned,
          lock: { lockedByName: lockOwned ? "Menu Editor" : "Another Editor" },
        };
      if (path === "/api/v1/marketing/cms/menus") {
        if (req.method() === "POST") {
          saved = { ...req.postDataJSON(), id: "menu" };
          menus = [saved];
          body = saved;
        } else body = menus;
      }
      if (path === "/api/v1/marketing/cms/menus/menu") {
        if (req.method() === "PUT") {
          saved = { ...saved, ...req.postDataJSON() };
          menus = [saved];
          body = saved;
        } else body = saved;
      }
      await route.fulfill({ json: body });
    });
    await page.goto(
      process.env.DASHBOARD_BROWSER_ORIGIN ||
        "http://127.0.0.1:4347/marketing/content/menus",
    );
    await page.getByText("No website menus yet.").waitFor();
    await page
      .getByRole("button", { name: "Create menu", exact: true })
      .click();
    await page.getByLabel("Menu name", { exact: true }).fill("Primary");
    await page
      .getByLabel("Website location", { exact: true })
      .selectOption("main_navigation");
    await page.getByRole("button", { name: "Add link", exact: true }).click();
    await page
      .getByLabel("Link type", { exact: true })
      .selectOption("internal-link");
    await page.getByLabel("Website page", { exact: true }).selectOption("page");
    await page
      .getByRole("button", { name: "Add nested link", exact: true })
      .click();
    const child = page.getByRole("region", {
      name: "Menu item New link",
      exact: true,
    });
    await child
      .getByLabel("Link type", { exact: true })
      .selectOption("form-modal");
    await child.getByLabel("Label", { exact: true }).fill("Request estimate");
    await page.getByLabel("Form", { exact: true }).selectOption("estimate");
    await page
      .getByRole("button", { name: "Save website menu", exact: true })
      .click();
    await page.getByText("Website menu saved.", { exact: true }).waitFor();
    assert.equal(saved.items[0].pageId, "page");
    assert.equal(saved.items[0].labelSource, "page");
    assert.equal(saved.items[0].children[0].formSlug, "estimate");
    await page.getByRole("button", {name:"Move to top level",exact:true}).click();
    await page.getByRole("button", {name:"Move Request estimate up",exact:true}).click();
    await page.getByRole("button", {name:"Save website menu",exact:true}).click();
    await page.waitForFunction(() => !document.querySelector(".cms-menu-editor h3")?.textContent.includes("Unsaved"));
    assert.equal(saved.items[0].formSlug,"estimate");
    assert.equal(saved.items[1].pageId,"page");
    assert.equal(saved.items[1].children.length,0);
    await page.getByRole("combobox", {name:"Appearance"}).selectOption("dark");
    await page.evaluate(() => scrollTo(0,0));
    await page.screenshot({path:"/tmp/p1-cms-menus-dark.png"});
    assert(!calls.includes("/api/v1/marketing/cms/pages"));
    assert(!calls.some((p) => p.includes("/admin/")));
    await page.getByLabel("Menu name", { exact: true }).fill("Unsaved Primary");
    page.once("dialog", (dialog) => dialog.dismiss());
    await page
      .getByRole("button", { name: "Open your account profile" })
      .click();
    assert(page.url().endsWith("/marketing/content/menus"));
    assert.equal(
      await page.getByLabel("Menu name", { exact: true }).inputValue(),
      "Unsaved Primary",
    );
    lockOwned = false;
    await page
      .getByRole("button", { name: "Save website menu", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Another editor holds this menu" })
      .waitFor();
    assert.equal(saved.name, "Primary");
    assert.equal(
      await page.getByLabel("Menu name", { exact: true }).inputValue(),
      "Unsaved Primary",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector(".sidebar").getBoundingClientRect().right <= 0);
    await page.evaluate(() => scrollTo(0, 0));
    // Wait for the responsive sidebar to settle before measuring content.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: "/tmp/p1-cms-menus-mobile.png",
      fullPage: true,
    });
    deny = true;
    calls.length = 0;
    page.once("dialog", (dialog) => dialog.accept());
    await page.reload();
    await page.waitForURL("**/profile");
    assert(!calls.some((p) => p.includes("/marketing/cms/")));
    assert.deepEqual(errors, []);
    console.log(
      "PASS native menu composition, minimized sources, unsaved navigation, lock conflict, mobile and revoked access",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
