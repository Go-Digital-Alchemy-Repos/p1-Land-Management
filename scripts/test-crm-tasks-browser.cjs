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
    const page = await browser.newPage({ timezoneId: "America/New_York" });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let confirm = false;
    page.on("dialog", (d) => (confirm ? d.accept() : d.dismiss()));
    const lead = "10000000-0000-4000-8000-000000000001",
      client = "20000000-0000-4000-8000-000000000001";
    let creates = [],
      patches = [],
      tasks = [],
      history = [],
      failRead = false,
      customerReads = 0;
    const parentPath = (path) =>
      path.startsWith("/api/v1/clients/")
        ? `/api/v1/clients/${client}/tasks`
        : `/api/v1/leads/${lead}/tasks`;
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        path = url.pathname;
      let json = [];
      if (path === "/api/v1/setup")
        json = { initialized: true, configured: true };
      if (path === "/api/v1/me")
        json = {
          id: "synthetic",
          name: "Colleague",
          role: "member",
          capabilities: ["revenue.sales", "customers.clients"],
          mfaRequired: false,
        };
      if (path === "/api/v1/workspace/references")
        json = {
          clients: [{ id: client, name: "Synthetic customer" }],
          properties: [],
          staff: [],
        };
      if (path === "/api/v1/leads")
        json = [
          {
            id: lead,
            name: "Synthetic inquiry",
            location: "Test",
            description: "Synthetic only",
            status: "new",
          },
        ];
      if (path === "/api/v1/commercial-inquiries")
        json = { items: [], nextCursor: null };
      if (path === `/api/v1/clients/${client}/workspace`)
        json = {
          client: { id: client, name: "Synthetic customer" },
          properties: [],
          contacts: [],
          agreements: [],
          schedule: [],
          requests: [],
          projects: [],
          notes: [],
          activity: [],
        };
      if (path === `/api/v1/clients/${client}/notes`)
        json = { items: [], nextCursor: null };
      const prefix = parentPath(path);
      if (path === prefix + "/assignees")
        json = [{ id: "staff", name: "Eligible colleague" }];
      if (path === prefix) {
        if (path.includes("/clients/")) customerReads++;
        if (req.method() === "POST") {
          const body = req.postDataJSON();
          creates.push(body);
          if (creates.length === 1) {
            const task = {
              ...body,
              version: 1,
              assigneeName: "Eligible colleague",
              creatorName: "Colleague",
              createdById: "synthetic",
              createdAt: "2030-01-01T00:00:00Z",
              updatedAt: "2030-01-01T00:00:00Z",
              imported: false,
            };
            tasks = [task];
            history = [
              {
                ...task,
                changedByName: "Colleague",
                recordedAt: task.createdAt,
              },
            ];
            return route.abort("failed");
          }
          assert.deepEqual(body, creates[0]);
          return route.fulfill({ json: { id: body.id, replayed: true } });
        }
        if (failRead) {
          failRead = false;
          return route.abort("failed");
        }
        json = {
          items: tasks.filter(
            (t) =>
              url.searchParams.get("state") === "all" ||
              t.completed === (url.searchParams.get("state") === "completed"),
          ),
          nextCursor: null,
        };
      }
      if (tasks[0] && path === prefix + "/" + tasks[0].id) {
        if (req.method() === "PATCH") {
          const body = req.postDataJSON();
          patches.push(body);
          if (patches.length === 1) {
            tasks[0] = {
              ...tasks[0],
              title: "Changed by colleague",
              version: 2,
            };
            return route.fulfill({
              status: 409,
              json: { error: "Task changed" },
            });
          }
          assert.equal(body.expectedVersion, 2);
          tasks[0] = {
            ...tasks[0],
            ...body,
            version: 3,
            updatedAt: "2030-01-02T00:00:00Z",
          };
          history.unshift({
            ...tasks[0],
            changedByName: "Colleague",
            recordedAt: tasks[0].updatedAt,
          });
          return route.fulfill({ json: { id: tasks[0].id, version: 3 } });
        }
        json = tasks[0];
      }
      if (tasks[0] && path === prefix + "/" + tasks[0].id + "/history")
        json = { items: history, nextBeforeVersion: null };
      return route.fulfill({ json });
    });
    await page.goto("http://127.0.0.1:4347/sales");
    await page
      .getByRole("button", { name: "Follow-up tasks", exact: true })
      .click();
    let area = page.getByRole("region", { name: "Follow-up task manager" });
    await area.getByText("No tasks in this view.").waitFor();
    await area.getByRole("button", { name: "New task", exact: true }).click();
    await area
      .getByLabel("Task title")
      .fill("Call <script>literal text</script>");
    await area
      .getByLabel("Due date and time", { exact: false })
      .fill("2030-03-10T02:30");
    await area.getByRole("button", { name: "Save task", exact: true }).click();
    await area
      .getByText(
        "Enter a valid local due date and time. Times skipped by daylight saving are unavailable.",
      )
      .waitFor();
    assert.equal(creates.length, 0);
    await area
      .getByLabel("Due date and time", { exact: false })
      .fill("2030-03-01T10:30");
    await area.getByLabel("Assigned to", { exact: true }).selectOption("staff");
    await area.getByRole("button", { name: "Save task", exact: true }).click();
    await area
      .getByRole("button", { name: "Retry task creation", exact: true })
      .waitFor();
    assert.equal(await area.getByLabel("Task title").isDisabled(), true);
    await area
      .getByRole("button", { name: "Retry task creation", exact: true })
      .click();
    await area.getByText("Task saved.", { exact: true }).waitFor();
    assert.equal(creates[0].dueAt, "2030-03-01T15:30:00.000Z");
    assert.equal(creates.length, 2);
    await area
      .getByRole("button", {
        name: "Open task: Call <script>literal text</script>",
        exact: true,
      })
      .click();
    await area.getByLabel("Task title").fill("Local edit");
    await area.getByRole("button", { name: "Save task", exact: true }).click();
    await area
      .getByRole("alert")
      .filter({ hasText: "task may have changed" })
      .waitFor();
    assert.equal(
      await area.getByLabel("Task title").inputValue(),
      "Local edit",
    );
    assert.equal(
      await area
        .getByRole("button", { name: "Save task", exact: true })
        .isDisabled(),
      true,
    );
    await area.getByRole("button", { name: "Reload saved task" }).click();
    assert.equal(
      await area.getByLabel("Task title").inputValue(),
      "Local edit",
    );
    confirm = true;
    await area.getByRole("button", { name: "Reload saved task" }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".crm-task-editor textarea")?.value ===
        "Changed by colleague",
    );
    confirm = false;
    await area.getByLabel("Completed", { exact: true }).check();
    await area.getByRole("button", { name: "Save task", exact: true }).click();
    await area.getByText("No tasks in this view.").waitFor();
    await area.getByLabel("Task status").selectOption("completed");
    await area
      .getByRole("button", {
        name: "Open task: Changed by colleague",
        exact: true,
      })
      .click();
    await area
      .getByRole("button", { name: "Show task history", exact: true })
      .click();
    await area.getByText("Version 3 · Completed", { exact: true }).waitFor();
    await area.getByText("Version 1 · Open", { exact: true }).waitFor();
    await area.getByLabel("Task title").fill("Keep this draft");
    failRead = true;
    await area
      .getByRole("button", { name: "Refresh tasks", exact: true })
      .click();
    await area
      .getByText("Could not load tasks. Retry to refresh the saved list.")
      .waitFor();
    assert.equal(
      await area.getByLabel("Task title").inputValue(),
      "Keep this draft",
    );
    assert.equal(
      await page.evaluate(() =>
        window.dispatchEvent(
          new Event("p1:before-navigation", { cancelable: true }),
        ),
      ),
      false,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar")?.getBoundingClientRect().right <= 0,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.equal(
      await area.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      true,
    );
    await page.screenshot({
      path: "/tmp/p1-crm-tasks-mobile.png",
      fullPage: true,
    });
    confirm = true;
    await page.goto(`http://127.0.0.1:4347/clients/${client}/notes`);
    confirm = false;
    await page
      .getByRole("button", { name: "Follow-up tasks", exact: true })
      .click();
    area = page.getByRole("region", { name: "Follow-up task manager" });
    await area
      .getByText("Internal customer follow-ups.", { exact: false })
      .waitFor();
    assert(customerReads > 0);
    assert.deepEqual(errors, []);
    console.log(
      "CRM tasks browser passed: native inquiry/customer entry, safe create retry, conflict recovery, completion/history, date conversion, draft retention and mobile containment.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
