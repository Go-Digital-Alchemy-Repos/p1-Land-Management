const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    page.setDefaultTimeout(15_000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("dialog", (dialog) => dialog.accept());
    let owned = true;
    let previewRequests = 0;
    const pageId = "11111111-1111-4111-8111-111111111111";
    let record = {
      id: pageId,
      title: "Synthetic CMS page",
      slug: "synthetic",
      pageType: "custom",
      template: "with-sidebar",
      sidebarId: "missing-sidebar",
      status: "draft",
      version: 1,
      updatedAt: "2030-01-01T00:00:00.000Z",
      content: {
        retained: { version: 7 },
        blocks: [{ id: "hero", type: "hero", props: { title: "Original heading", unknown: { keep: true } } }],
      },
    };
    const lease = () => ({
      status: owned ? "acquired" : "held",
      ownedByCurrentEditor: owned,
      ownedByCurrentUser: owned,
      lock: {
        id: owned ? "lease-current-editor" : "lease-other-editor",
        lockedByName: owned ? "Page editor" : "Another editor",
      },
    });
    const advance = (next) => {
      record = { ...record, ...next, version: record.version + 1, updatedAt: "2030-01-01T00:00:01.000Z" };
      return record;
    };
    await page.route("https://preview.example.test/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<main>Draft preview</main>" }),
    );
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      const method = request.method();
      let json = [];
      if (path.endsWith("/setup")) json = { initialized: true, configured: true };
      else if (path.endsWith("/me")) {
        json = { id: "editor", name: "Page editor", role: "member", capabilities: ["marketing.content.pages"], mfaRequired: false };
      } else if (path.includes("/editor-locks/")) json = lease();
      else if (path.endsWith("/page-builder")) {
        json = {
          aliases: {}, pages: [], forms: [], galleries: [], team: [], sidebars: [], previewUrl: null,
          blocks: [{ type: "hero", label: "Hero", description: "Hero", category: "hero", defaultProps: { title: "New hero" }, propDefs: [{ key: "title", label: "Heading", type: "text" }] }],
        };
      } else if (path.endsWith("/pages")) json = [record];
      else if (path.endsWith(`/pages/${pageId}/preview-link`)) {
        previewRequests += 1;
        json = { previewUrl: "https://preview.example.test/draft" };
      } else if (path.endsWith(`/pages/${pageId}/relationships`)) {
        json = { pageId, counts: { menuItems: 0 }, menuReferences: [] };
      } else if (path.endsWith(`/pages/${pageId}/revisions`)) {
        json = [{ id: "revision-1", pageId, title: "Prior title", status: "draft", changeNote: "Prior content", content: { blocks: [] }, createdAt: "2029-12-31T00:00:00.000Z" }];
      } else if (path.endsWith(`/pages/${pageId}/revisions/revision-1/restore`)) {
        assert.equal(request.postDataJSON().expectedVersion, record.version);
        json = advance({ title: "Prior title", content: { retained: { version: 7 }, blocks: [] } });
      } else if (path.endsWith(`/pages/${pageId}/publish`)) {
        assert.equal(request.postDataJSON().expectedVersion, record.version);
        json = advance({ status: "published" });
      } else if (path.endsWith(`/pages/${pageId}`)) {
        if (method === "PUT") {
          const body = request.postDataJSON();
          assert.equal(body.expectedVersion, record.version);
          json = advance(body);
        } else json = record;
      }
      await route.fulfill({ json });
    });

    await page.goto("http://127.0.0.1:4347/marketing/content/pages");
    await page.getByRole("button", { name: "Edit Synthetic CMS page", exact: true }).click();
    await page.getByRole("tab", { name: "Page Settings", exact: true }).click();
    assert.equal(await page.getByLabel("Page sidebar", { exact: true }).inputValue(), "missing-sidebar");
    await page.getByLabel("Page title", { exact: true }).fill("Edited CMS page");

    owned = false;
    await page.getByRole("button", { name: "Save Page", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "reservation" }).waitFor();
    assert.equal(await page.getByLabel("Page title", { exact: true }).inputValue(), "Edited CMS page");
    owned = true;
    await page.getByRole("button", { name: "Check reservation", exact: true }).click();
    await page.getByRole("button", { name: "Save Page", exact: true }).click();
    await page.getByText("Page saved.", { exact: true }).waitFor();
    assert.equal(record.title, "Edited CMS page");
    assert.deepEqual(record.content.retained, { version: 7 });

    await page.getByRole("button", { name: "Open Draft Preview", exact: true }).click();
    await page.waitForFunction(() => true); // allow the popup request to be dispatched
    assert.equal(previewRequests, 1);
    await page.getByRole("tab", { name: "Page Settings", exact: true }).click();
    await page.getByRole("button", { name: "Publish page", exact: true }).click();
    await page.getByText("Page published.", { exact: true }).waitFor();
    assert.equal(record.status, "published");
    await page.getByRole("button", { name: "View revisions", exact: true }).click();
    await page.getByRole("button", { name: "Restore revision", exact: true }).click();
    await page.getByText("Revision restored.", { exact: true }).waitFor();
    assert.equal(record.status, "published");
    assert.equal(record.title, "Prior title");
    assert.equal(record.sidebarId, "missing-sidebar");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const sidebar = document.querySelector(".sidebar");
      return !sidebar || sidebar.getBoundingClientRect().right <= 0;
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: "/tmp/p1-cms-page-lifecycle-mobile.png", fullPage: true });
    assert.deepEqual(errors, []);
    console.log("CMS page browser: preview, lease conflict, save, publish, restore and mobile containment passed");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
