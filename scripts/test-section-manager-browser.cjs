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
    let record = {
        id: "section",
        name: "Reusable section",
        category: "general",
        description: "",
        blocks: [
          {
            id: "legacy",
            type: "future-block",
            props: { preserve: "unchanged", nested: { safe: true } },
          },
          {
            id: "hero",
            type: "hero",
            extra: "keep",
            props: {
              title: "Old title",
              form: "missing-form",
              unknownProperty: 42,
              primaryAction: "url",
              primaryLink: "/contact",
              primaryFormSlug: "contact",
              items: [{ label: "First", extra: "keep" }],
            },
          },
        ],
      },
      saved,
      accept = true;
    let createdCopy,
      failCopy = true;
    const savedSource = {
      id: "source",
      name: "Saved feature",
      category: "features",
      description: "Reusable source",
      blocks: [
        {
          id: "source-block",
          type: "hero",
          extra: "retained",
          props: {
            title: "Saved source title",
            items: [{ label: "Source item", extra: "retained" }],
          },
        },
      ],
    };
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => (accept ? d.accept() : d.dismiss()));
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      let body = [];
      if (path.endsWith("/setup"))
        body = { initialized: true, configured: true };
      if (path.endsWith("/me"))
        body = {
          id: "synthetic",
          name: "Section editor",
          role: "member",
          capabilities: ["marketing.content.sections"],
          mfaRequired: false,
        };
      if (path.includes("/editor-locks/"))
        body = {
          ownedByCurrentUser: true,
          lock: { lockedByName: "Section editor" },
        };
      if (path.endsWith("/sections"))
        body = [
          record,
          savedSource,
          {
            id: "starter",
            name: "Starter - Dynamic",
            category: "content",
            blocks: [{ id: "dynamic", type: "blog-post-feed", props: {} }],
          },
        ];
      if (path.endsWith("/sections") && req.method() === "POST") {
        if (failCopy) {
          await route.fulfill({
            status: 503,
            json: { error: "Synthetic section save failure" },
          });
          return;
        }
        createdCopy = req.postDataJSON();
        body = { ...createdCopy, id: "new-copy" };
      }
      if (path.endsWith("/sections/section")) {
        if (req.method() === "PUT") {
          saved = { ...record, ...req.postDataJSON() };
          record = saved;
        }
        body = record;
      }
      if (path.endsWith("/section-builder"))
        body = {
          previewUrl: "https://www.p1landmanagement.com/cms-preview/builder",
          aliases: {},
          pages: [
            {
              id: "page",
              title: "Contact page",
              slug: "contact",
              status: "published",
            },
          ],
          forms: [
            {
              id: "contact",
              name: "Contact",
              slug: "contact",
              kind: "contact",
            },
          ],
          galleries: [],
          team: [],
          blocks: [
            {
              type: "blog-post-feed",
              label: "Blog feed",
              description: "Feed",
              category: "dynamic",
              isDynamic: true,
              defaultProps: {},
              propDefs: [],
            },
            {
              type: "hero",
              label: "Hero",
              description: "Hero block",
              category: "hero",
              defaultProps: { title: "New" },
              propDefs: [
                {
                  key: "primaryAction",
                  label: "Primary action",
                  type: "select",
                  options: [
                    { label: "Internal page", value: "internal-link" },
                    { label: "Custom link", value: "custom-link" },
                    { label: "Form modal", value: "form-modal" },
                  ],
                },
                { key: "primaryLink", label: "Primary Link", type: "url" },
                {
                  key: "primaryFormSlug",
                  label: "Primary form",
                  type: "form-select",
                },
                { key: "title", label: "Heading", type: "text" },
                { key: "form", label: "Assigned form", type: "form-select" },
                {
                  key: "items",
                  label: "Features",
                  type: "array-items",
                  itemSchema: [
                    { key: "label", label: "Feature label", type: "text" },
                  ],
                },
              ],
            },
          ],
        };
      await route.fulfill({ json: body });
    });
    await page.route(
      "https://www.p1landmanagement.com/cms-preview/builder**",
      (route) =>
        route.fulfill({
          contentType: "text/html",
          body: `<!doctype html><html><body><p id="status">Waiting</p><script>
      window.received=[];
      const channel=new URLSearchParams(location.hash.slice(1)).get('channel');
      addEventListener('message', event=>{if(event.origin==='http://127.0.0.1:4347' && event.data.channel===channel){window.received.push(event.data);document.getElementById('status').textContent='Draft received';}});
      parent.postMessage({type:'p1:builder-preview-ready',version:1,channel},'http://127.0.0.1:4347');
      </script></body></html>`,
        }),
    );
    await page.goto("http://127.0.0.1:4347/marketing/content/sections");
    await page
      .getByRole("button", { name: "Edit Reusable section", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Save block 1 as reusable section",
        exact: true,
      })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Create reusable section", exact: true })
        .isDisabled(),
      true,
    );
    await page
      .getByLabel("Reusable section name", { exact: true })
      .fill("Saved compatibility block");
    await page
      .getByLabel("Reusable section description", { exact: true })
      .fill("Reusable test description");
    await page
      .getByLabel("Reusable section name", { exact: true })
      .press("Enter");
    assert.equal(saved, undefined);
    assert.equal(createdCopy, undefined);
    await page
      .getByRole("button", { name: "Create reusable section", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Synthetic section save failure" })
      .waitFor();
    assert.equal(
      await page
        .getByLabel("Reusable section name", { exact: true })
        .inputValue(),
      "Saved compatibility block",
    );
    failCopy = false;
    await page
      .getByRole("button", { name: "Create reusable section", exact: true })
      .click();
    await page
      .getByText(
        "Saved Saved compatibility block as a reusable section. Current editor changes remain unsaved.",
        { exact: true },
      )
      .waitFor();
    assert.equal(saved, undefined);
    assert.equal(createdCopy.name, "Saved compatibility block");
    assert.equal(createdCopy.blocks.length, 1);
    assert.notEqual(createdCopy.blocks[0].id, record.blocks[0].id);
    assert.deepEqual(createdCopy.blocks[0].props, record.blocks[0].props);
    assert.deepEqual(createdCopy.blocks[0].props.nested, { safe: true });
    await page
      .getByRole("button", { name: "Preview section", exact: true })
      .click();
    let preview = page.frameLocator('iframe[title="Desktop section preview"]');
    await preview.getByText("Draft received", { exact: true }).waitFor();
    assert.equal(
      await preview
        .locator("body")
        .evaluate(() => window.received.at(-1).blocks[1].props.title),
      "Old title",
    );
    await page.getByRole("button", { name: "Mobile", exact: true }).click();
    assert.equal(
      await page
        .locator('iframe[title="Mobile section preview"]')
        .evaluate((node) => node.getBoundingClientRect().width),
      430,
    );
    await page
      .getByRole("button", { name: "Close preview", exact: true })
      .click();
    await page.getByText("Edit Hero", { exact: true }).click();
    await page
      .getByText("Edit Future Block (Compatibility Mode)", { exact: true })
      .click();
    await page
      .getByLabel("Preserve", { exact: true })
      .fill("Edited legacy text");
    assert.equal(
      await page.getByLabel("Assigned form", { exact: true }).inputValue(),
      "missing-form",
    );
    assert.equal(
      await page.getByLabel("Primary action", { exact: true }).inputValue(),
      "internal-link",
    );
    assert.equal(
      await page
        .getByLabel("Primary Internal Page", { exact: true })
        .inputValue(),
      "/contact",
    );
    await page
      .getByLabel("Primary action", { exact: true })
      .selectOption("form-modal");
    assert.equal(
      await page.getByLabel("Primary Internal Page", { exact: true }).count(),
      0,
    );
    assert.equal(
      await page.getByLabel("Primary form", { exact: true }).inputValue(),
      "contact",
    );
    await page.getByLabel("Heading", { exact: true }).fill("Updated title");
    await page
      .getByRole("button", { name: "Preview section", exact: true })
      .click();
    const livePreview = page.frameLocator(
      'iframe[title="Desktop section preview"]',
    );
    await livePreview.getByText("Draft received", { exact: true }).waitFor();
    await page
      .getByLabel("Heading", { exact: true })
      .fill("Live preview title");
    await page
      .frames()
      .find((frame) =>
        frame
          .url()
          .startsWith("https://www.p1landmanagement.com/cms-preview/builder"),
      )
      .waitForFunction(() =>
        window.received
          .at(-1)
          .blocks.some((block) => block.props.title === "Live preview title"),
      );
    const previousPreviewUrl = await page
      .locator('iframe[title="Desktop section preview"]')
      .getAttribute("src");
    await page
      .getByRole("button", { name: "Retry preview", exact: true })
      .click();
    await livePreview.getByText("Draft received", { exact: true }).waitFor();
    assert.notEqual(
      await page
        .locator('iframe[title="Desktop section preview"]')
        .getAttribute("src"),
      previousPreviewUrl,
    );
    await page.getByLabel("Heading", { exact: true }).fill("Updated title");
    await page
      .getByRole("button", { name: "Close preview", exact: true })
      .click();

    await page
      .getByLabel("Feature label", { exact: true })
      .fill("Edited feature");
    accept = false;
    await page
      .getByRole("button", { name: "Back to sections", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Heading", { exact: true }).inputValue(),
      "Updated title",
    );
    accept = true;
    await page
      .getByRole("button", { name: "Move block 2 up", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save section", exact: true })
      .click();
    await page.getByText("Section saved.", { exact: true }).waitFor();
    assert.equal(saved.blocks[0].props.title, "Updated title");
    assert.equal(saved.blocks[0].props.unknownProperty, 42);
    assert.equal(saved.blocks[0].props.primaryLink, "/contact");
    assert.equal(saved.blocks[0].props.primaryAction, "form-modal");
    assert.equal(saved.blocks[0].extra, "keep");
    assert.equal(saved.blocks[0].props.items[0].extra, "keep");
    assert.equal(saved.blocks[0].props.form, "missing-form");
    assert.deepEqual(saved.blocks[1], {
      id: "legacy",
      type: "future-block",
      props: { preserve: "Edited legacy text", nested: { safe: true } },
    });
    await page
      .getByRole("button", { name: "Duplicate block", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Save section", exact: true })
      .click();
    await page.waitForFunction(
      () => !document.querySelector("fieldset[disabled]"),
    );
    assert.equal(saved.blocks.length, 3);
    assert.notEqual(saved.blocks[0].id, saved.blocks[1].id);
    assert.deepEqual(saved.blocks[0].props, saved.blocks[1].props);
    await page.getByLabel("Insert position", { exact: true }).selectOption("0");
    await page
      .getByRole("button", { name: "Browse saved sections", exact: true })
      .click();
    const library = page.getByRole("region", { name: "Saved section library" });
    await library
      .getByRole("button", { name: "Insert Saved feature", exact: true })
      .waitFor();
    assert.equal(
      await library
        .getByRole("button", { name: "Insert Starter - Dynamic", exact: true })
        .count(),
      0,
    );
    await page
      .getByLabel("Find saved sections", { exact: true })
      .fill("Saved feature");
    await page
      .getByLabel("Saved section category", { exact: true })
      .selectOption("features");
    await library.screenshot({ path: "/tmp/p1-saved-section-library.png" });
    await library
      .getByRole("button", { name: "Insert Saved feature", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save section", exact: true })
      .click();
    await page.waitForFunction(
      () => !document.querySelector("fieldset[disabled]"),
    );
    assert.equal(saved.blocks.length, 4);
    assert.equal(saved.blocks[0].props.title, "Saved source title");
    assert.notEqual(saved.blocks[0].id, "source-block");
    assert.equal(saved.blocks[0].extra, "retained");
    assert.equal(saved.blocks[0].props.items[0].extra, "retained");
    assert.equal(savedSource.blocks[0].id, "source-block");
    assert.equal(savedSource.blocks[0].props.title, "Saved source title");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
    );
    await page
      .getByRole("button", { name: "Preview section", exact: true })
      .click();
    await page
      .frameLocator('iframe[title="Desktop section preview"]')
      .getByText("Draft received", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Mobile", exact: true }).click();
    await page.locator(".builder-preview").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/p1-sections-preview-mobile.png" });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: "/tmp/p1-sections-mobile.png",
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
      "Section browser checks passed: property editing, nested data/unknown block preservation, missing references, ordering, duplication, dirty guard and mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
