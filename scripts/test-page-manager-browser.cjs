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
    let allowed = true,
      accept = true,
      owned = true,
      writes = 0,
      lastForce = false;
    const rows = new Map([
      [
        "page",
        {
          id: "page",
          title: "Synthetic CMS page",
          slug: "synthetic",
          pageType: "custom",
          template: "with-sidebar",
          sidebarId: "missing-sidebar",
          status: "draft",
          content: {
            retained: { version: 7 },
            blocks: [
              {
                id: "hero",
                type: "hero",
                props: { title: "Original heading", unknown: { keep: true } },
              },
            ],
          },
        },
      ],
    ]);
    const errors = [],
      requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("dialog", (dialog) =>
      accept ? dialog.accept() : dialog.dismiss(),
    );
    await page.route("**/api/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        pathname = url.pathname,
        method = request.method();
      requests.push(`${method} ${pathname}`);
      let body = [];
      if (pathname.endsWith("/setup"))
        body = { initialized: true, configured: true };
      if (pathname.endsWith("/me"))
        body = {
          id: "editor",
          name: "Page editor",
          role: "member",
          capabilities: allowed ? ["marketing.content.pages"] : [],
          mfaRequired: false,
        };
      if (pathname.includes("/editor-locks/"))
        body = {
          ownedByCurrentUser: owned,
          lock: { lockedByName: owned ? "Page editor" : "Another editor" },
        };
      if (pathname.endsWith("/page-builder"))
        body = {
          aliases: {},
          pages: [],
          forms: [],
          galleries: [],
          team: [],
          sidebars: [],
          previewUrl: null,
          blocks: [
            {
              type: "hero",
              label: "Hero",
              description: "Hero",
              category: "hero",
              defaultProps: { title: "New hero" },
              propDefs: [{ key: "title", label: "Heading", type: "text" }],
            },
          ],
        };
      if (pathname.endsWith("/pages")) {
        if (method === "POST") {
          body = { ...request.postDataJSON(), id: "new-page" };
          rows.set(body.id, body);
        } else body = [...rows.values()];
      }
      const match = pathname.match(/\/pages\/([^/]+)(.*)$/);
      if (match) {
        const id = match[1],
          suffix = match[2],
          row = rows.get(id);
        if (!suffix) {
          if (method === "PUT") {
            writes++;
            rows.set(id, { ...row, ...request.postDataJSON() });
          }
          if (method === "DELETE") {
            rows.delete(id);
            body = { success: true };
          } else body = rows.get(id);
        }
        if (suffix === "/publish") {
          body = { ...row, status: "published" };
          rows.set(id, body);
        }
        if (suffix === "/schedule") {
          body = {
            ...row,
            status: "scheduled",
            scheduledAt: request.postDataJSON().scheduledAt,
          };
          rows.set(id, body);
        }
        if (suffix === "/unpublish") {
          lastForce = url.searchParams.get("force") === "true";
          body = { ...row, status: "draft", scheduledAt: null };
          rows.set(id, body);
        }
        if (suffix === "/relationships")
          body = {
            pageId: id,
            counts: { menuItems: id === "page" ? 1 : 0 },
            menuReferences:
              id === "page"
                ? [
                    {
                      menuId: "menu",
                      menuName: "Main",
                      menuLocation: "header",
                      itemId: "item",
                      itemLabel: "Synthetic link",
                      itemUrl: "/synthetic",
                      depth: 1,
                    },
                  ]
                : [],
          };
        if (suffix === "/revisions")
          body = [
            {
              id: "revision",
              pageId: id,
              title: "Historical title",
              status: "draft",
              changeNote: "Prior content",
              content: { blocks: [] },
            },
          ];
        if (suffix === "/revisions/revision/restore") {
          body = { ...row, title: "Historical title", content: { blocks: [] } };
          rows.set(id, body);
        }
        if (suffix === "/duplicate") {
          body = {
            ...structuredClone(row),
            id: "copy",
            title: "Page copy",
            slug: "synthetic-copy",
            status: "draft",
          };
          rows.set("copy", body);
        }
      }
      await route.fulfill({ json: body });
    });
    await page.goto("http://127.0.0.1:4347/marketing/content/pages");
    await page
      .getByRole("button", { name: "Edit Synthetic CMS page", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Page sidebar", { exact: true }).inputValue(),
      "missing-sidebar",
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Browse saved sections", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Preview page", exact: true })
      .click();
    await page
      .getByText(
        "Website preview is not configured yet. You can continue editing and saving.",
      )
      .waitFor();
    await page.getByText("Edit Hero", { exact: true }).click();
    await page.getByLabel("Heading", { exact: true }).fill("Edited heading");
    assert.equal(
      await page
        .getByRole("button", { name: "Publish page", exact: true })
        .isDisabled(),
      true,
    );
    accept = false;
    await page
      .getByRole("button", { name: "Back to CMS pages", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Heading", { exact: true }).inputValue(),
      "Edited heading",
    );
    accept = true;
    owned = false;
    await page.getByRole("button", { name: "Save page", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Another editor holds this page" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Heading", { exact: true }).inputValue(),
      "Edited heading",
    );
    owned = true;
    await page
      .getByRole("button", { name: "Check reservation", exact: true })
      .click();
    await page.getByRole("button", { name: "Save page", exact: true }).click();
    await page.getByText("Page saved.", { exact: true }).waitFor();
    assert.deepEqual(rows.get("page").content.retained, { version: 7 });
    assert.deepEqual(rows.get("page").content.blocks[0].props.unknown, {
      keep: true,
    });
    assert.equal(
      rows.get("page").content.blocks[0].props.title,
      "Edited heading",
    );
    await page
      .getByRole("button", { name: "Publish page", exact: true })
      .click();
    await page.getByText("Page published.", { exact: true }).waitFor();
    await page.getByLabel("Page title", { exact: true }).fill("Published edit");
    const priorWrites = writes;
    accept = false;
    await page
      .getByRole("button", { name: "Save published changes", exact: true })
      .click();
    assert.equal(writes, priorWrites);
    accept = true;
    await page
      .getByRole("button", { name: "Save published changes", exact: true })
      .click();
    await page.getByText("Page saved.", { exact: true }).waitFor();
    await page
      .getByLabel("Publish at (your local time)", { exact: true })
      .fill("2099-01-01T10:00");
    await page
      .getByRole("button", { name: "Schedule publication", exact: true })
      .click();
    await page.getByText("Page scheduled.", { exact: true }).waitFor();
    assert.equal(rows.get("page").status, "scheduled");
    await page
      .getByRole("button", { name: "Move to draft", exact: true })
      .click();
    await page.getByText("Page moved to draft.", { exact: true }).waitFor();
    assert.equal(lastForce, true);
    await page
      .getByRole("button", { name: "Review menu links", exact: true })
      .click();
    await page
      .getByText("Main → Synthetic link (/synthetic)", { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Remove menu links", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "View revisions", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Restore revision", exact: true })
      .click();
    await page.getByText("Revision restored.", { exact: true }).waitFor();
    assert.equal(rows.get("page").status, "draft");
    assert.equal(rows.get("page").sidebarId, "missing-sidebar");
    await page
      .getByRole("button", { name: "Duplicate page", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Page copy", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Delete page", exact: true })
      .click();
    await page
      .getByRole("button", { name: "New CMS page", exact: true })
      .click();
    await page.getByLabel("Page title", { exact: true }).fill("New draft");
    await page.getByLabel("Page slug", { exact: true }).fill("new-draft");
    await page.getByRole("button", { name: "Save page", exact: true }).click();
    await page
      .getByRole("heading", { name: "New draft", exact: true })
      .waitFor();
    assert.equal(rows.get("new-page").status, "draft");
    await page
      .getByRole("button", { name: "Archive draft", exact: true })
      .click();
    await page.getByText("Page archived.", { exact: true }).waitFor();
    assert.equal(rows.get("new-page").status, "archived");
    await page
      .getByRole("button", { name: "Move to draft", exact: true })
      .click();
    await page.getByText("Page moved to draft.", { exact: true }).waitFor();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: "/tmp/p1-cms-pages-mobile.png",
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert(
      !requests.some((value) => /\/(media|sections|sidebars)$/.test(value)),
    );
    allowed = false;
    await page.reload();
    assert.equal(
      await page
        .getByRole("button", { name: "New CMS page", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "CMS Pages browser checks passed: edit/create, preserved data, reservations, publication, scheduling, menu review, revisions, duplication/deletion, mobile and revocation",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
