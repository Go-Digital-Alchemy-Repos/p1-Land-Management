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
      if (path.endsWith("/sections")) body = [record];
      if (path.endsWith("/sections/section")) {
        if (req.method() === "PUT") {
          saved = { ...record, ...req.postDataJSON() };
          record = saved;
        }
        body = record;
      }
      if (path.endsWith("/section-builder"))
        body = {
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
    await page.goto("http://127.0.0.1:4347/marketing/content/sections");
    await page
      .getByRole("button", { name: "Edit Reusable section", exact: true })
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
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
    );
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
