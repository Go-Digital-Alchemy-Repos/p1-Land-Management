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
    let members = [],
      deny = false,
      mediaAllowed = true,
      saved,
      calls = [];
    const sharp = require(
      process.cwd() + "/platform/p1-core/node_modules/sharp",
    );
    const png = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 65, g: 90, b: 130 },
      },
    })
      .png()
      .toBuffer();
    await page.route("https://www.p1landmanagement.com/**", (route) =>
      route.fulfill({ body: png, contentType: "image/png" }),
    );
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
          name: "Team editor",
          role: "member",
          capabilities: deny
            ? []
            : [
                "marketing.content.team",
                ...(mediaAllowed ? ["marketing.content.media"] : []),
              ],
          mfaRequired: false,
        };
      if (path === "/api/v1/marketing/cms/team") {
        if (req.method() === "POST") {
          saved = { ...req.postDataJSON(), id: "member" };
          members = [saved];
          body = saved;
        } else body = members;
      }
      if (path.endsWith("/team/member")) {
        saved = { ...req.postDataJSON(), id: "member" };
        members = [saved];
        body = saved;
      }
      if (path.endsWith("/media"))
        body = [
          {
            id: "photo",
            filename: "photo.png",
            originalName: "photo.png",
            title: "Portrait",
            mimeType: "image/png",
            url: "/uploads/cms/photo.png",
            fileSize: 100,
            alt: "Team portrait",
          },
        ];
      await route.fulfill({ json: body });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/team");
    await page
      .getByRole("button", { name: "Add team member", exact: true })
      .click();
    await page.getByLabel("Name", { exact: true }).fill("Sample member");
    await page.getByLabel("Role / title", { exact: true }).fill("Operations");
    await page
      .getByRole("textbox", { name: "Full biography", exact: true })
      .fill("Experienced field lead.");
    await page.getByRole("button", { name: "Heading 2", exact: true }).click();
    await page.getByRole("button", { name: "HTML", exact: true }).click();
    assert.match(
      await page
        .getByLabel("Full biography HTML", { exact: true })
        .inputValue(),
      /<h2>/,
    );
    await page
      .getByLabel("Full biography HTML", { exact: true })
      .fill(
        "<h2>Field leadership</h2><p>A <strong>formatted</strong> biography.</p>",
      );
    await page.getByRole("button", { name: "Visual", exact: true }).click();
    await page
      .getByRole("heading", { name: "Field leadership", exact: true })
      .waitFor();
    await page.getByRole("button",{name:"Image",exact:true}).click();
    await page.getByLabel("Image URL",{exact:true}).fill("/uploads/cms/embedded.png");
    await page.getByLabel("Image description",{exact:true}).fill("Embedded portrait");
    await page.getByLabel("Image alignment",{exact:true}).selectOption("right");
    await page.getByRole("button",{name:"Apply image",exact:true}).click();
    await page.getByRole("button",{name:"HTML",exact:true}).click();
    const biography=await page.getByLabel("Full biography HTML",{exact:true}).inputValue();
    assert.match(biography,/data-align="right"/);assert.match(biography,/src="\/uploads\/cms\/embedded.png"/);
    await page.getByRole("button",{name:"Visual",exact:true}).click();
    await page
      .getByRole("button", { name: "Choose team photo", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Choose team photo" })
      .getByRole("button", { name: /Portrait/ })
      .click();
    assert.equal(
      await page.getByLabel("Photo URL", { exact: true }).inputValue(),
      "/uploads/cms/photo.png",
    );
    assert.equal(
      await page.getByLabel("Photo description", { exact: true }).inputValue(),
      "Team portrait",
    );
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Cancel editing", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Name", { exact: true }).inputValue(),
      "Sample member",
    );
    await page
      .getByLabel("Member status", { exact: true })
      .selectOption("published");
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Save member", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit Sample member", exact: true })
      .waitFor();
    assert.equal(saved.status, "published");
    assert.match(saved.biography, /<strong>formatted<\/strong>/);
    assert(!("password" in saved));
    await page
      .getByRole("button", { name: "Edit Sample member", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Field leadership", exact: true })
      .waitFor();
    await page
      .getByLabel("Member status", { exact: true })
      .selectOption("archived");
    await page
      .getByRole("button", { name: "Save member", exact: true })
      .click();
    await page.getByText("archived", { exact: true }).waitFor();
    assert.equal(saved.status, "archived");
    mediaAllowed = false;
    await page.reload();
    await page
      .getByRole("button", { name: "Edit Sample member", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Choose team photo", exact: true })
        .count(),
      0,
    );
    await page.getByRole("button", { name: "Image", exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "Choose embedded image", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Cancel image", exact: true })
      .click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: "/tmp/p1-team-editor.png", fullPage: true });
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
      path: "/tmp/p1-team-editor-mobile.png",
      fullPage: true,
    });
    deny = true;
    calls = [];
    await page.reload();
    await page.waitForURL("**/profile");
    assert(!calls.some((path) => path.includes("/marketing/cms/")));
    assert.deepEqual(errors, []);
    console.log("Team manager browser checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
