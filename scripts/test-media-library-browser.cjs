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
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let deny = false,
      saved,
      uploads = 0,
      replaced = 0;
    const sharp = require(
      process.cwd() + "/platform/p1-core/node_modules/sharp",
    );
    const png = await sharp({
      create: {
        width: 640,
        height: 360,
        channels: 3,
        background: { r: 60, g: 120, b: 80 },
      },
    })
      .png()
      .toBuffer();
    let assets = [
      {
        id: "image",
        filename: "photo.png",
        originalName: "photo.png",
        title: "Field photo",
        url: "/uploads/cms/photo.png",
        mimeType: "image/png",
        fileSize: 100,
        alt: "A field",
        usageCount: 1,
        liveUsageCount: 1,
        isInUse: true,
        usageRefs: [
          {
            entityType: "website_content",
            entityId: "home",
            entityName: "Home page",
            field: "content",
            statusLabel: "Published website",
            isLive: true,
          },
        ],
      },
      {
        id: "document",
        filename: "scope.pdf",
        originalName: "scope.pdf",
        title: "Scope",
        url: "/uploads/cms/scope.pdf",
        mimeType: "application/pdf",
        fileSize: 200,
        usageCount: 0,
        liveUsageCount: 0,
        usageRefs: [],
      },
    ];
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      let body = [];
      if (path === "/api/v1/setup")
        body = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        body = {
          id: "synthetic",
          name: "Media editor",
          role: "member",
          capabilities: deny ? [] : ["marketing.content.media"],
          mfaRequired: false,
        };
      if (path.endsWith("/media")) body = assets;
      if (path.endsWith("/source"))
        return route.fulfill({ body: png, contentType: "image/png" });
      if (path.endsWith("/media/image") && req.method() === "PATCH") {
        saved = req.postDataJSON();
        assets[0] = { ...assets[0], ...saved };
        body = assets[0];
      }
      if (path.endsWith("/upload")) {
        uploads++;
        assert(
          req
            .headers()
            ["content-type"].startsWith("multipart/form-data; boundary="),
        );
        body = { id: "uploaded" };
      }
      if (path.endsWith("/replace")) {
        replaced++;
        assert(req.postDataBuffer().includes(Buffer.from("crop.webp")));
        body = assets[0];
      }
      if (path.endsWith("/media/image") && req.method() === "DELETE") {
        assets = assets.filter((a) => a.id !== "image");
        body = { success: true };
      }
      await route.fulfill({ json: body });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/media");
    await page.getByText("2 of 2 assets").waitFor();
    await page.getByLabel("Type", { exact: true }).selectOption("documents");
    assert.equal(await page.locator(".media-grid button").count(), 1);
    await page.getByLabel("Type", { exact: true }).selectOption("all");
    await page.getByLabel("Search media", { exact: true }).fill("field");
    assert.equal(await page.locator(".media-grid button").count(), 1);
    await page.locator(".media-grid button").first().click();
    await page
      .getByLabel("Alternative text", { exact: true })
      .fill("Updated field description");
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Back to media", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Alternative text", { exact: true }).inputValue(),
      "Updated field description",
    );
    await page
      .getByRole("button", { name: "Save metadata", exact: true })
      .click();
    await page.getByText("Metadata saved.", { exact: true }).waitFor();
    assert.equal(saved.alt, "Updated field description");
    await page.getByText("Home page · content · Published website").waitFor();
    await page.getByRole("button", { name: "Crop image", exact: true }).click();
    await page.getByAltText("Image to crop").waitFor();
    await page.waitForFunction(
      () => document.querySelector(".media-crop-stage img").naturalWidth > 0,
    );
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Save crop", exact: true }).click();
    await page
      .getByText("Image replaced. Existing pages may need a refresh.")
      .waitFor();
    assert.equal(replaced, 1);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: "/tmp/p1-media-details.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Back to media", exact: true })
      .click();
    await page.getByLabel("Search media", { exact: true }).fill("");
    await page
      .getByLabel("Upload files", { exact: true })
      .setInputFiles({ name: "file.png", mimeType: "image/png", buffer: png });
    await page.waitForFunction(
      () => !document.body.textContent.includes("Uploading…"),
    );
    assert.equal(uploads, 1);
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
    await page.screenshot({ path: "/tmp/p1-media-mobile.png", fullPage: true });
    await page
      .locator(".media-grid button")
      .filter({ hasText: "Field photo" })
      .click();
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Delete media", exact: true })
      .click();
    assert.equal(assets.length, 2);
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Delete media", exact: true })
      .click();
    await page.getByText("1 of 1 assets").waitFor();
    assert.equal(assets.length, 1);
    deny = true;
    await page.reload();
    await page.waitForURL("**/profile");
    assert.equal(await page.locator(".media-library").count(), 0);
    assert.deepEqual(errors, []);
    console.log("Media library browser checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
