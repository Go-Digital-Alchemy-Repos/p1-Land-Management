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
    let records = [],
      saved,
      accept = true,
      mediaAllowed = false,
      uploadCount = 0;
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => (accept ? d.accept() : d.dismiss()));
    const sharp = require(
      process.cwd() + "/platform/p1-core/node_modules/sharp",
    );
    const png = await sharp({
      create: { width: 100, height: 60, channels: 3, background: "#547890" },
    })
      .png()
      .toBuffer();
    await page.route("https://www.p1landmanagement.com/**", (r) =>
      r.fulfill({ body: png, contentType: "image/png" }),
    );
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      let body = [];
      if (path.endsWith("/setup"))
        body = { initialized: true, configured: true };
      if (path.endsWith("/me"))
        body = {
          id: "synthetic",
          name: "Gallery editor",
          role: "member",
          capabilities: [
            "marketing.content.galleries",
            ...(mediaAllowed ? ["marketing.content.media"] : []),
          ],
          mfaRequired: false,
        };
      if (path.endsWith("/galleries")) {
        if (req.method() === "POST") {
          saved = {
            ...req.postDataJSON(),
            id: "gallery",
            imageCount: req.postDataJSON().items.length,
          };
          records = [saved];
          body = saved;
        } else body = records;
      }
      if (path.endsWith("/galleries/gallery")) {
        if (req.method() === "PUT") {
          saved = { ...saved, ...req.postDataJSON() };
          records = [saved];
        }
        body = saved;
      }
      if (path.endsWith("/galleries/gallery/publish")) {
        saved = { ...saved, status: "published" };
        body = saved;
      }
      if (path.endsWith("/galleries/gallery/unpublish")) {
        saved = { ...saved, status: "draft" };
        body = saved;
      }
      if (path.endsWith("/galleries/gallery/duplicate")) {
        saved = {
          ...saved,
          id: "copy",
          title: "Gallery copy",
          slug: "gallery-copy",
          status: "draft",
        };
        records.push(saved);
        body = saved;
      }
      if (path.endsWith("/galleries/copy")) {
        if (req.method() === "DELETE") {
          records = records.filter((r) => r.id !== "copy");
          body = { success: true };
        } else body = saved;
      }
      if (path.endsWith("/cms/upload")) {
        uploadCount++;
        if (uploadCount === 2)
          return route.fulfill({
            status: 422,
            json: { error: "Synthetic upload failure" },
          });
        body = {
          id: "uploaded",
          url: "/uploads/uploaded.png",
          alt: "Uploaded image",
          mimeType: "image/png",
        };
      }
      await route.fulfill({ json: body });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/galleries");
    await page
      .getByRole("button", { name: "New gallery", exact: true })
      .click();
    await page
      .getByLabel("Gallery title", { exact: true })
      .fill("Synthetic gallery");
    await page.getByLabel("Slug", { exact: true }).fill("synthetic-gallery");
    await page
      .getByLabel("Gallery layout", { exact: true })
      .selectOption("masonry");
    await page.getByText("Display settings", { exact: true }).click();
    await page.getByLabel("Desktop columns", { exact: true }).fill("4");
    await page.getByLabel("Image ratio", { exact: true }).selectOption("16/9");
    await page
      .getByRole("button", { name: "Add image URL", exact: true })
      .click();
    await page
      .getByLabel("Image URL", { exact: true })
      .fill("/uploads/one.png");
    await page.getByLabel("Alt text", { exact: true }).fill("First image");
    await page
      .getByLabel("Tags (comma separated)", { exact: true })
      .fill("field, work");
    await page
      .getByRole("button", { name: "Add image URL", exact: true })
      .click();
    await page
      .getByLabel("Image URL", { exact: true })
      .nth(1)
      .fill("/uploads/two.png");
    await page
      .getByRole("button", { name: "Move image 2 up", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Choose from Media", exact: true })
        .count(),
      0,
    );
    await page
      .getByLabel("Gallery layout", { exact: true })
      .selectOption("slider");
    await page.getByText("Gallery preview", { exact: true }).click();
    const preview = page.getByRole("region", {
      name: "Gallery draft preview",
      exact: true,
    });
    await preview
      .getByRole("button", { name: "Next preview image", exact: true })
      .click();
    await preview
      .getByRole("button", { name: "Open image 2", exact: true })
      .click();
    const lightbox = page.getByRole("dialog", {
      name: "Gallery lightbox",
      exact: true,
    });
    await lightbox.waitFor();
    await page.keyboard.press("ArrowLeft");
    assert.equal(
      await lightbox.locator("img").getAttribute("src"),
      "https://www.p1landmanagement.com/uploads/two.png",
    );
    await page.keyboard.press("Escape");
    await lightbox.waitFor({ state: "hidden" });
    await page
      .getByLabel("Gallery layout", { exact: true })
      .selectOption("masonry");
    await preview.screenshot({path:"/tmp/p1-gallery-preview.png"});
    accept = false;
    await page
      .getByRole("button", { name: "Back to galleries", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Gallery title", { exact: true }).inputValue(),
      "Synthetic gallery",
    );
    accept = true;
    await page
      .getByRole("button", { name: "Save gallery", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Publish saved gallery", exact: true })
      .waitFor();
    assert.equal(saved.items[0].imageUrl, "/uploads/two.png");
    assert.equal(saved.items[1].sortOrder, 1);
    assert.deepEqual(saved.items[1].tags, ["field", "work"]);
    assert.equal(saved.settings.columnsDesktop, 4);
    assert.equal(saved.settings.imageRatio, "16/9");
    await page
      .getByRole("button", { name: "Publish saved gallery", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector('select[aria-label="Gallery status"]').value ===
        "published",
    );
    assert.equal(saved.status, "published");
    await page
      .getByRole("button", { name: "Unpublish gallery", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector('select[aria-label="Gallery status"]').value ===
        "draft",
    );
    await page
      .getByRole("button", { name: "Duplicate saved gallery", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Gallery copy", exact: true })
      .waitFor();
    assert.equal(saved.id, "copy");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: "/tmp/p1-gallery-mobile.png",
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page
      .getByRole("button", { name: "Delete gallery", exact: true })
      .click();
    await page
      .getByRole("button", { name: "New gallery", exact: true })
      .waitFor();
    assert.ok(!records.some((r) => r.id === "copy"));
    mediaAllowed = true;
    await page.reload();
    await page
      .getByRole("button", { name: "New gallery", exact: true })
      .click();
    await page
      .getByLabel("Upload gallery images", { exact: true })
      .setInputFiles([
        { name: "one.png", mimeType: "image/png", buffer: png },
        { name: "two.png", mimeType: "image/png", buffer: png },
      ]);
    await page
      .getByRole("alert")
      .filter({ hasText: "Earlier successful uploads" })
      .waitFor();
    assert.equal(uploadCount, 2);
    assert.equal(
      await page.getByLabel("Image URL", { exact: true }).inputValue(),
      "/uploads/uploaded.png",
    );
    assert.deepEqual(errors, []);
    console.log(
      "Gallery browser checks passed: settings, ordering, metadata, dirty guard, independent Media denial, publish/unpublish, duplicate, delete and mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
