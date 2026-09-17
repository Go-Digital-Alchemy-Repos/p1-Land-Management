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
    page.on("dialog", (d) => d.accept());
    let posts = [],
      saved,
      comments = [
        {
          id: "one",
          postId: "post",
          postTitle: "First post",
          authorName: "Reader one",
          body: "First comment",
          status: "pending",
        },
        {
          id: "two",
          postId: "post",
          postTitle: "Second post",
          authorName: "Reader two",
          body: "Second comment",
          status: "pending",
        },
      ];
    let taxonomies = [
      {
        id: "parent",
        name: "Parent",
        slug: "parent",
        type: "category",
        parentId: null,
      },
      {
        id: "child",
        name: "Child",
        slug: "child",
        type: "category",
        parentId: "parent",
      },
    ];
    let settings = {
      commentsEnabled: true,
      allowGuestComments: false,
      allowLinksInComments: false,
      requireApproval: true,
      enableSpamProtection: true,
      enableHoneypot: true,
      enableRateLimit: true,
      rateLimitSeconds: 60,
      maxLinksPerComment: 2,
    };
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname,
        method = req.method();
      let body = [];
      if (path === "/api/v1/setup")
        body = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        body = {
          id: "synthetic",
          name: "Blog editor",
          role: "member",
          capabilities: ["marketing.content.blog"],
          mfaRequired: false,
        };
      if (path.includes("/editor-locks/"))
        body = {
          ownedByCurrentUser: true,
          lock: { lockedByName: "Blog editor" },
        };
      if (path.endsWith("/blog/references"))
        body = {
          sidebars: [{ id: "sidebar", name: "News" }],
          galleries: [{ id: "gallery", title: "Field work" }],
        };
      if (path.endsWith("/blog")) {
        if (method === "POST") {
          saved = { ...req.postDataJSON(), id: "post" };
          posts = [saved];
          body = saved;
        } else body = posts;
      }
      if (path.endsWith("/blog/post")) {
        if (method === "PUT") {
          saved = { ...saved, ...req.postDataJSON() };
          posts = [saved];
        }
        body = saved;
      }
      if (path.endsWith("/settings/taxonomies")) body = taxonomies;
      if (path.endsWith("/settings/taxonomies/child")) {
        taxonomies = taxonomies.map((t) =>
          t.id === "child" ? { ...t, ...req.postDataJSON() } : t,
        );
        body = taxonomies[1];
      }
      if (path.endsWith("/settings/comments")) {
        if (method === "PUT") settings = req.postDataJSON();
        body =
          method === "PUT"
            ? settings
            : { settings, statusCounts: { pending: 2 } };
      }
      if (path.endsWith("/blog/comments")) body = comments;
      if (path.endsWith("/comments/one")) {
        comments = comments.map((c) =>
          c.id === "one" ? { ...c, ...req.postDataJSON() } : c,
        );
        body = comments[0];
      }
      if (path.endsWith("/comments/one/status")) {
        comments = comments.map((c) =>
          c.id === "one" ? { ...c, ...req.postDataJSON() } : c,
        );
        body = comments[0];
      }
      await route.fulfill({ json: body });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/blog");
    await page.getByRole("button", { name: "New post", exact: true }).click();
    await page
      .getByLabel("Title", { exact: true })
      .fill("Synthetic field update");
    await page.getByLabel("Author name", { exact: true }).fill("Test author");
    await page.getByRole("button", { name: "Save post", exact: true }).click();
    await page.waitForURL("**?post=post");
    await page.getByLabel("Title", { exact: true }).waitFor();
    assert.equal(saved.slug, "synthetic-field-update");
    await page.getByRole("button", { name: "HTML", exact: true }).click();
    await page
      .getByLabel("Post content HTML")
      .fill('<h1>Field notes</h1><p>[gallery id="gallery"]</p>');
    await page
      .getByLabel("Publication", { exact: true })
      .selectOption("scheduled");
    await page.getByRole("button", { name: "Save post", exact: true }).click();
    await page.getByText("Post saved.", { exact: true }).waitFor();
    assert.equal(saved.isPublished, false);
    assert.ok(Date.parse(saved.scheduledAt) > Date.now());
    assert.ok(saved.content.includes('[gallery id="gallery"]'));

    await page
      .getByRole("button", { name: "Categories and tags", exact: true })
      .click();
    await page.getByRole("button", { name: "Edit Child", exact: true }).click();
    await page.getByLabel("Parent category", { exact: true }).selectOption("");
    await page
      .getByRole("button", { name: "Save taxonomy", exact: true })
      .click();
    await page.waitForFunction(
      () => !document.querySelector("fieldset[disabled]"),
    );
    assert.equal(taxonomies[1].parentId, null);
    await page.getByRole("button", { name: "Comments", exact: true }).click();
    const first = page
        .getByRole("article")
        .filter({ has: page.getByRole("heading", { name: "First post" }) }),
      second = page
        .getByRole("article")
        .filter({ has: page.getByRole("heading", { name: "Second post" }) });
    await second.getByLabel("Comment body").fill("Unsaved second draft");
    await first.getByLabel("Comment body").fill("Edited first");
    await first
      .getByRole("button", { name: "Save comment", exact: true })
      .click();
    await page.waitForFunction(
      () => !document.querySelector("fieldset[disabled]"),
    );
    assert.equal(
      await second.getByLabel("Comment body").inputValue(),
      "Unsaved second draft",
    );
    await first.getByRole("button", { name: "approved", exact: true }).click();
    await first
      .getByText(/approved/)
      .first()
      .waitFor();
    await page
      .getByRole("button", { name: "Comment settings", exact: true })
      .click();
    await page.getByLabel("Allow guest comments", { exact: true }).check();
    await page
      .getByRole("button", { name: "Save comment settings", exact: true })
      .click();
    await page.getByText("Comment settings saved.", { exact: true }).waitFor();
    assert.equal(settings.allowGuestComments, true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector(".sidebar").getBoundingClientRect().right <= 0);
    await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({
      path: "/tmp/p1-blog-settings-mobile.png",
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Blog browser checks passed: creation, category detach, comment draft preservation, moderation, settings.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
