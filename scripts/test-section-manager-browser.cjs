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
      parent.postMessage({type:'p1:builder-preview-ready',version:2,channel},'http://127.0.0.1:4347');
      </script></body></html>`,
        }),
    );
    await page.goto("http://127.0.0.1:4347/marketing/content/sections");
    await page.getByTestId("button-edit-section-section").click();
    await page.getByTestId("input-section-name").waitFor();
    await page.locator('[aria-label="Select Hero block"]:visible').click();
    await page
      .locator('[data-testid="prop-input-title"]:visible')
      .fill("Updated title");
    await page.getByTestId("button-save-section").click();
    await page.getByText("Section saved.", { exact: true }).waitFor();
    assert.equal(saved.blocks[1].props.title, "Updated title");
    assert.equal(saved.blocks[1].extra, "keep");
    assert.equal(saved.blocks[1].props.unknownProperty, 42);
    assert.deepEqual(saved.blocks[0], {
      id: "legacy",
      type: "future-block",
      props: { preserve: "unchanged", nested: { safe: true } },
    });
    await page.locator('[aria-label="Select Hero block"]:visible').click();
    await page
      .locator('[data-testid="prop-input-title"]:visible')
      .fill("Unsaved draft");
    accept = false;
    await page.getByRole("button", { name: "Sections", exact: true }).click();
    assert.equal(
      await page
        .locator('[data-testid="prop-input-title"]:visible')
        .inputValue(),
      "Unsaved draft",
    );
    accept = true;
    await page
      .getByRole("button", { name: "Preview section", exact: true })
      .click();
    await page
      .frameLocator('iframe[title="Desktop section preview"]')
      .getByText("Draft received", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Close preview", exact: true })
      .click();
    await page.getByTestId("button-save-section").click();
    await page.waitForFunction(
      () =>
        !document.querySelector('[data-testid="button-save-section"]').disabled,
    );
    assert.equal(saved.blocks[1].props.title, "Unsaved draft");
    for (const width of [1279, 1280, 1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({
        path: `/tmp/p1-sections-${width}.png`,
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.ok(
        await page.locator('[aria-label="Select Hero block"]:visible').count(),
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "Section browser checks passed: original canvas, verified save, unknown-block preservation, dirty navigation guard, isolated preview, and responsive layout.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
