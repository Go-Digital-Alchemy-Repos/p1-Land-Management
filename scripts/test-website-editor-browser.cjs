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
    page.setDefaultTimeout(10000);
    let mediaAllowed = true;
    let deny = false,
      conflict = false,
      saves = [],
      publishes = 0,
      restores = 0;
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let data = {
      stackId: "p1-land-management",
      route: { id: "home", path: "/" },
      component: {
        key: "home-page",
        fields: [
          {
            path: "image",
            label: "Hero image",
            type: "image",
            allowedImageOrigins: ["https://www.p1landmanagement.com"],
          },
          {
            path: "title",
            label: "Page title",
            type: "text",
            required: true,
            maxLength: 100,
          },
        ],
      },
      previewUrl:
        "https://www.p1landmanagement.com/?cmsPreview=1&cmsComponent=home-page",
      draftContent: { title: "Original" },
      draftRevision: 1,
      publishedRevision: 1,
      publishedAt: null,
    };
    await page.route("https://www.p1landmanagement.com/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<html><body>Draft preview</body></html>",
      }),
    );
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      let body = [];
      if (path === "/api/v1/setup")
        body = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        body = {
          id: "synthetic",
          name: "Website Editor",
          role: "member",
          capabilities: deny
            ? []
            : [
                "marketing.content.website",
                ...(mediaAllowed ? ["marketing.content.media"] : []),
              ],
          mfaRequired: false,
        };
      if (path === "/api/v1/marketing/cms/media")
        body = [
          {
            id: "safe",
            filename: "photo.png",
            originalName: "photo.png",
            title: "Allowed image",
            mimeType: "image/png",
            url: "/uploads/cms/photo.png",
            fileSize: 100,
          },
          {
            id: "foreign",
            filename: "foreign.png",
            originalName: "foreign.png",
            title: "Foreign image",
            mimeType: "image/png",
            url: "https://foreign.example/image.png",
            fileSize: 100,
          },
        ];
      if (path === "/api/v1/marketing/cms/website")
        body = [
          {
            routeId: "home",
            path: "/",
            componentKey: "home-page",
            label: "Home page",
          },
        ];
      if (path === "/api/v1/marketing/cms/website/home/home-page") body = data;
      if (path.endsWith("/revisions"))
        body = [
          {
            id: "revision1",
            revision: 1,
            kind: "save",
            content: { title: "Original" },
          },
        ];
      if (path.endsWith("/draft")) {
        saves.push(req.postDataJSON());
        if (conflict)
          return route.fulfill({
            status: 409,
            json: { error: "Draft revision changed" },
          });
        assert.equal(req.postDataJSON().expectedRevision, data.draftRevision);
        data = {
          ...data,
          draftContent: req.postDataJSON().content,
          draftRevision: data.draftRevision + 1,
        };
        body = data;
      }
      if (path.endsWith("/publish")) {
        publishes++;
        assert.equal(req.postDataJSON().expectedRevision, data.draftRevision);
        data = {
          ...data,
          draftRevision: data.draftRevision + 1,
          publishedRevision: data.draftRevision + 1,
        };
        body = data;
      }
      if (path.endsWith("/restore")) {
        restores++;
        data = {
          ...data,
          draftContent: { title: "Original" },
          draftRevision: data.draftRevision + 1,
        };
        body = data;
      }
      await route.fulfill({ json: body });
    });
    await page.goto(
      "http://127.0.0.1:4347/marketing/content/website?routeId=home&componentKey=home-page",
    );
    await page.getByLabel("Page title", { exact: true }).fill("New title");
    assert(
      await page
        .getByRole("button", { name: "Publish", exact: true })
        .isDisabled(),
    );
    page.once("dialog", (dialog) => dialog.dismiss());
    await page
      .getByRole("button", { name: "All website content", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Page title", { exact: true }).inputValue(),
      "New title",
    );
    await page
      .getByRole("button", { name: "Choose image for Hero image", exact: true })
      .click();
    const picker = page.getByRole("dialog", { name: "Choose website image" });
    await picker.getByRole("button", { name: "photo.png", exact: true }).waitFor();
    assert(
      await picker.getByRole("button", { name: "foreign.png", exact: true }).isDisabled(),
    );
    await picker.getByRole("button", { name: "photo.png", exact: true }).click();
    assert.equal(
      await page.getByLabel("Hero image", { exact: true }).inputValue(),
      "/uploads/cms/photo.png",
    );
    conflict = true;
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Draft revision changed" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Page title", { exact: true }).inputValue(),
      "New title",
    );
    conflict = false;
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByText("Draft saved. Publish when it is ready for the website.")
      .waitFor();
    assert.equal(saves.length, 2);
    assert.equal(saves[1].expectedRevision, 1);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await page
      .getByText("Website content published.", { exact: true })
      .waitFor();
    assert.equal(publishes, 1);
    await page.getByRole("button", { name: "Restore r1", exact: true }).click();
    await page
      .getByText(
        "Revision restored as a new draft. The published website is unchanged.",
      )
      .waitFor();
    assert.equal(restores, 1);
    assert.equal(publishes, 1);
    assert.equal(data.publishedRevision, 3);
    assert.equal(data.draftRevision, 4);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: "/tmp/p1-website-editor-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
    );
    await page.evaluate(() => scrollTo(0, 0));
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "/tmp/p1-website-editor-mobile.png",
      fullPage: true,
    });
    mediaAllowed = false;
    await page.reload();
    await page.getByLabel("Page title", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", {
          name: "Choose image for Hero image",
          exact: true,
        })
        .count(),
      0,
    );
    deny = true;
    await page.reload();
    await page.waitForURL("**/profile");
    assert.equal(await page.locator(".website-content-editor").count(), 0);
    assert.deepEqual(errors, []);
    console.log("Website editor browser checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
