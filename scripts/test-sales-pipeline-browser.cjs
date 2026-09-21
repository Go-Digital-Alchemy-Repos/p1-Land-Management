const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10_000);
    const errors = [], queries = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const lead = {
      id: "10000000-0000-4000-8000-000000000001",
      name: "Pipeline browser inquiry",
      status: "new",
      version: 1,
      location: "Synthetic site",
      description: "Synthetic inquiry",
      owner_id: null,
      owner_name: null,
      next_action: "Call prospect",
      next_action_due_at: null,
      last_activity_at: null,
      converted_client_id: null,
      converted_property_id: null,
    };
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      let json = [];
      if (path === "/api/v1/setup") json = { initialized: true, configured: true };
      if (path === "/api/v1/me") {
        json = {
          id: "sales",
          name: "Sales colleague",
          role: "member",
          capabilities: ["revenue.sales"],
          mfaRequired: false,
        };
      }
      if (path === "/api/v1/workspace/references") json = { clients: [], properties: [], staff: [] };
      if (path === "/api/v1/sales/pipeline-settings") {
        json = { revision: 0, config: { stages: [
          { key: "new", label: "New", color: "blue" },
          { key: "contacted", label: "Contacted", color: "cyan" },
          { key: "qualified", label: "Qualified", color: "emerald" },
          { key: "proposal", label: "Proposal", color: "amber" },
          { key: "won", label: "Won", color: "green" },
          { key: "lost", label: "Lost", color: "slate" },
        ] } };
      }
      if (path === "/api/v1/sales/inquiries") {
        const status = url.searchParams.get("status");
        queries.push(status);
        json = { items: status === lead.status ? [lead] : [], nextCursor: null };
      }
      if (path === `/api/v1/leads/${lead.id}/follow-up`) {
        if (request.method() === "PATCH") {
          const body = request.postDataJSON();
          assert.equal(body.expectedVersion, lead.version);
          lead.status = body.status;
          lead.owner_id = body.ownerId;
          lead.next_action = body.nextAction;
          lead.next_action_due_at = body.nextActionDueAt;
          lead.version += 1;
          lead.last_activity_at = "2030-01-01T00:00:00Z";
          return route.fulfill({ json: lead });
        }
        json = { lead, owners: [{ id: "sales", name: "Sales colleague" }] };
      }
      return route.fulfill({ json });
    });

    await page.goto("http://127.0.0.1:4347/sales/pipeline");
    const board = page.getByRole("region", { name: "Sales pipeline" });
    await board.getByText(lead.name, { exact: true }).waitFor();
    assert.deepEqual(queries, ["new", "contacted", "qualified", "proposal", "won", "lost"]);
    await board.getByRole("button", { name: "Open inquiry workspace", exact: true }).click();
    await board.getByRole("button", { name: "Manage inquiry", exact: true }).click();
    const followUp = page.getByRole("region", { name: "Inquiry follow-up" });
    await followUp.getByLabel("Inquiry stage", { exact: true }).selectOption("contacted");
    await followUp.getByLabel("Next action", { exact: true }).fill("Confirm site visit");
    await followUp.getByRole("button", { name: "Save follow-up", exact: true }).click();
    await page.getByRole("region", { name: "Contacted inquiries" }).getByText(lead.name, { exact: true }).waitFor();
    assert.equal(
      await page.getByRole("region", { name: "New inquiries" }).getByText(lead.name, { exact: true }).count(),
      0,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const sidebar = document.querySelector(".sidebar");
      return !sidebar || sidebar.getBoundingClientRect().right <= 0;
    });
    assert.equal(await board.evaluate((element) => element.scrollWidth <= element.clientWidth), true);
    await page.screenshot({ path: "/tmp/p1-sales-pipeline-mobile.png", fullPage: true });
    assert.deepEqual(errors, []);
    console.log("Sales pipeline browser: six statuses, versioned stage move and mobile containment passed");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
