const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || process.cwd() + "/platform/p1-core/node_modules/@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
  const errors = [];
  try {
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}, colorScheme: "light"});
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    const clients = [{id: "synthetic-client", name: "Synthetic Orchard", phone: "8645550100", billing_address: "100 Example Road", primary_contact_name: "Example Contact"}];
    await context.route("**/api/**", route => {
      const path = new URL(route.request().url()).pathname;
      const bodies = {
        "/api/v1/setup": {initialized: true, configured: true},
        "/api/v1/me": {id: "synthetic-member", name: "Synthetic Member", role: "member", capabilities: ["customers.clients", "settings.preferences"], mfaRequired: false},
        "/api/v1/clients": clients,
        "/api/v1/workspace/references": {clients: clients.map(({id,name}) => ({id,name})), properties: [], staff: []},
      };
      return route.fulfill({json: bodies[path] || []});
    });
    const base = process.env.DASHBOARD_BROWSER_ORIGIN || "http://127.0.0.1:4347";
    await page.goto(base + "/clients");
    await page.getByRole("heading", {name: "Clients", exact: true}).waitFor();
    const appearance = page.getByRole("combobox", {name: "Appearance"});
    async function checkTheme(mode) {
      await page.waitForFunction(mode => document.documentElement.dataset.theme === mode, mode);
      const colors = await page.evaluate(() => ({canvas: getComputedStyle(document.querySelector(".content")).backgroundColor, sidebar: getComputedStyle(document.querySelector(".sidebar")).backgroundColor, image: getComputedStyle(document.querySelector(".content")).backgroundImage}));
      assert.equal(colors.image, "none");
      assert.notEqual(colors.canvas, colors.sidebar);
      await page.locator(".panel .primary").waitFor();
      const contrasts = await page.evaluate(() => {
        const luminance = color => {
          const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
          return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
        };
        return [".page-heading .muted", ".sidebar button.active", ".panel .primary", ".theme-control select"].map(selector => {
          const element = document.querySelector(selector);
          const foreground = luminance(getComputedStyle(element).color);
          let parent = element, background;
          while (parent) {
            const candidate = getComputedStyle(parent).backgroundColor;
            if (candidate !== "rgba(0, 0, 0, 0)" && candidate !== "transparent") { background = candidate; break; }
            parent = parent.parentElement;
          }
          const back = luminance(background);
          return {selector, ratio: (Math.max(foreground, back) + .05) / (Math.min(foreground, back) + .05)};
        });
      });
      for (const item of contrasts) assert(item.ratio >= 4.5, `${mode} ${item.selector} contrast ${item.ratio}`);
      return colors;
    }
    const light = await checkTheme("light");
    await appearance.selectOption("dark");
    const dark = await checkTheme("dark");
    assert.notEqual(light.canvas, dark.canvas);
    await page.reload();
    await checkTheme("dark");
    assert.equal(await appearance.inputValue(), "dark");
    await appearance.selectOption("system");
    await page.emulateMedia({colorScheme: "light"}); await checkTheme("light");
    await page.emulateMedia({colorScheme: "dark"}); await checkTheme("dark");
    await appearance.selectOption("light");
    fs.mkdirSync("/tmp/p1-dashboard-theme", {recursive: true});
    await page.screenshot({path: "/tmp/p1-dashboard-theme/clients-light.png"});
    await appearance.selectOption("dark");
    await page.getByRole("button", {name: "Edit client", exact: true}).click();
    await page.getByRole("dialog").waitFor();
    await page.screenshot({path: "/tmp/p1-dashboard-theme/client-dialog-dark.png"});
    await page.setViewportSize({width: 390, height: 844});
    await page.waitForFunction(() => {
      const sidebar = document.querySelector(".sidebar");
      return sidebar.getBoundingClientRect().right <= 1;
    });
    assert(await page.getByRole("dialog").evaluate(el => {
      const title = el.querySelector("h2").getBoundingClientRect();
      return el.contains(document.elementFromPoint(title.x + 5, title.y + 5));
    }), "dialog title must not be hidden behind the header");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, "mobile shell must fit viewport");
    await page.screenshot({path: "/tmp/p1-dashboard-theme/client-mobile-dark.png"});
    assert.deepEqual(errors, []);
    console.log("PASS light/dark/system, persistence, OS updates, neutral shell, client dialog and mobile containment");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
