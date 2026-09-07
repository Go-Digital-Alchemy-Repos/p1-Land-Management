import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_CRM_PIPELINE_CONFIG } from "../../shared/crm-pipeline-settings";

const settingsPath = "/api/admin/crm/settings/pipeline";
async function login(page: Page, email = "browser-admin@example.test") {
  await page.goto("/auth/login");
  await page.getByTestId("input-email").fill(email);
  await page.getByTestId("input-password").fill("CoreBrowserTest!2026");
  await page.getByTestId("button-login").click();
  await expect(page).not.toHaveURL(/\/auth\/login/);
}
async function reset(page: Page) {
  expect(
    (await page.request.put(settingsPath, { data: DEFAULT_CRM_PIPELINE_CONFIG })).status(),
  ).toBe(200);
}
async function createLead(page: Page, suffix: string) {
  const name = `CRM browser ${suffix} ${crypto.randomUUID()}`;
  const response = await page.request.post("/api/admin/crm", {
    data: { name, email: `${crypto.randomUUID()}@example.test` },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).lead as { id: string; name: string };
}
async function selectOption(page: Page, label: string) {
  await page.getByRole("option", { name: label, exact: true }).click();
}

// Requests seed synthetic records and inspect persisted results; every rendered
// screen and selector is served by the real application and real PostgreSQL.
test("configured board, list and stage selectors preserve won conversion under retry", async ({
  page,
}) => {
  await login(page);
  await reset(page);
  try {
    await page.goto("/admin/crm/settings");
    await page
      .getByTestId("pipeline-setting-new")
      .getByLabel("Stage label", { exact: true })
      .fill("Customer");
    await page
      .getByTestId("pipeline-setting-won")
      .getByLabel("Stage label", { exact: true })
      .fill("Successful");
    await page.getByRole("button", { name: "Move Customer down", exact: true }).click();
    await page.getByRole("button", { name: "Save pipeline settings", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Pipeline settings saved." }),
    ).toBeVisible();
    const lead = await createLead(page, "conversion");
    await page.goto("/admin/crm");
    await page.getByPlaceholder("Search leads...").fill(lead.name);
    const labels = ["Contacted", "Customer", "Qualified", "Proposal", "Successful", "Lost"];
    await expect(page.locator(".shadcn-card.snap-start span.rounded-full")).toHaveText(labels);
    await expect(page.locator("button.grid").filter({ hasText: lead.name })).toContainText(
      "Customer",
    );
    const editorContext = await page
      .context()
      .browser()!
      .newContext({ viewport: page.viewportSize()! });
    try {
      const editorPage = await editorContext.newPage();
      await login(editorPage, "browser-editor@example.test");
      await editorPage.goto("/admin/crm");
      await editorPage.getByPlaceholder("Search leads...").fill(lead.name);
      await expect(editorPage.locator(".shadcn-card.snap-start span.rounded-full")).toHaveText(
        labels,
      );
      await expect(editorPage.locator("button.grid").filter({ hasText: lead.name })).toContainText(
        "Customer",
      );
      await expect(
        editorPage.getByRole("link", { name: "Pipeline settings", exact: true }),
      ).toHaveCount(0);
      expect(
        (
          await editorPage.request.put(settingsPath, { data: DEFAULT_CRM_PIPELINE_CONFIG })
        ).status(),
      ).toBe(403);
    } finally {
      await editorContext.close();
    }
    // The label Customer on key new does not create a client.
    expect(
      (await (await page.request.get(`/api/admin/crm/${lead.id}`)).json()).client,
    ).toBeUndefined();

    await page.getByRole("combobox").first().click();
    await expect(page.getByRole("option")).toHaveText(["All Stages", ...labels]);
    await selectOption(page, "Customer");
    await expect(page.getByTestId(`card-crm-lead-${lead.id}`)).toBeVisible();
    await page.getByRole("combobox").first().click();
    await selectOption(page, "All Stages");

    await page.getByTestId(`select-move-crm-lead-${lead.id}`).click();
    await expect(page.getByRole("option")).toHaveText(labels);
    await selectOption(page, "Contacted");
    await expect
      .poll(async () => (await (await page.request.get(`/api/admin/crm/${lead.id}`)).json()).stage)
      .toBe("contacted");
    expect(
      (await (await page.request.get(`/api/admin/crm/${lead.id}`)).json()).client,
    ).toBeUndefined();

    await page.getByRole("button", { name: `Open ${lead.name}`, exact: true }).click();
    await page.getByTestId("select-crm-lead-stage").click();
    await expect(page.getByRole("option")).toHaveText(labels);
    await selectOption(page, "Successful");
    await expect
      .poll(async () => (await (await page.request.get(`/api/admin/crm/${lead.id}`)).json()).stage)
      .toBe("won");
    const retries = await Promise.all(
      [1, 2].map(() => page.request.patch(`/api/admin/crm/${lead.id}`, { data: { stage: "won" } })),
    );
    expect(retries.map((response) => response.status())).toEqual([200, 200]);
    const clients = await (await page.request.get("/api/admin/crm/clients")).json();
    expect(
      clients.filter((client: { sourceLeadId: string }) => client.sourceLeadId === lead.id),
    ).toHaveLength(1);
    await page.keyboard.press("Escape");
    await page.reload();
    await page.getByPlaceholder("Search leads...").fill(lead.name);
    await expect(page.locator("button.grid").filter({ hasText: lead.name })).toContainText(
      "Successful",
    );
    await reset(page);
    await page.reload();
    await page.getByPlaceholder("Search leads...").fill(lead.name);
    await expect(page.locator("button.grid").filter({ hasText: lead.name })).toContainText("Won");
    expect((await (await page.request.get(`/api/admin/crm/${lead.id}`)).json()).stage).toBe("won");
  } finally {
    await reset(page);
  }
});

test("invalid writes and generic bypass cannot replace persisted pipeline settings", async ({
  page,
}) => {
  await login(page);
  const config = structuredClone(DEFAULT_CRM_PIPELINE_CONFIG);
  config.stages[0].label = "Protected inquiry";
  expect((await page.request.put(settingsPath, { data: config })).status()).toBe(200);
  try {
    for (const data of [
      { version: 1, stages: [] },
      { ...config, version: 2 },
      { ...config, isSecret: true },
    ]) {
      expect((await page.request.put(settingsPath, { data })).status()).toBe(400);
    }
    expect(
      (
        await page.request.put("/api/admin/settings", {
          data: { key: "crm_pipeline_config", value: "{}", category: "branding", isSecret: true },
        })
      ).status(),
    ).toBe(400);
    expect((await page.request.delete("/api/admin/settings/crm_pipeline_config")).status()).toBe(
      400,
    );
    expect((await (await page.request.get(settingsPath)).json()).config).toEqual(config);
    await page.goto("/admin/crm/settings");
    await page.reload();
    await expect(
      page.getByTestId("pipeline-setting-new").getByLabel("Stage label", { exact: true }),
    ).toHaveValue("Protected inquiry");
  } finally {
    await reset(page);
  }
});

test("CRM disabled state blocks API and screens and recovers without deleting config", async ({
  page,
}) => {
  await login(page);
  await reset(page);
  const setEnabled = (value: boolean) =>
    page.request.put("/api/admin/settings", {
      data: {
        key: "enable_crm",
        value: String(value),
        category: "system_configuration",
        isSecret: false,
      },
    });
  try {
    expect((await setEnabled(false)).status()).toBe(200);
    expect((await page.request.get(settingsPath)).status()).toBe(404);
    expect(
      (await page.request.put(settingsPath, { data: DEFAULT_CRM_PIPELINE_CONFIG })).status(),
    ).toBe(404);
    expect((await page.request.get("/api/admin/crm")).status()).toBe(404);
    for (const path of ["/admin/crm", "/admin/crm/settings"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "404 Page Not Found" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Pipeline settings", exact: true })).toHaveCount(
        0,
      );
    }
  } finally {
    expect((await setEnabled(true)).status()).toBe(200);
  }
  expect((await (await page.request.get(settingsPath)).json()).config).toEqual(
    DEFAULT_CRM_PIPELINE_CONFIG,
  );
});

test("pipeline settings retain readable badges and fit the viewport in both themes", async ({
  page,
}, testInfo) => {
  await login(page);
  await reset(page);
  await page.goto("/admin/crm/settings");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((mode) => localStorage.setItem("core-platform-theme-mode", mode), theme);
    await page.reload();
    await expect(page.getByRole("heading", { name: "CRM pipeline settings" })).toBeVisible();
    expect(
      await page.locator("html").evaluate((element) => element.classList.contains("dark")),
    ).toBe(theme === "dark");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    // Overflow-hidden ancestors can conceal clipped controls even when the
    // document itself reports no horizontal overflow.
    await expect
      .poll(async () =>
        page.locator("form input, form select, form button").evaluateAll((elements) =>
          elements.every((element) => {
            const bounds = element.getBoundingClientRect();
            return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth;
          }),
        ),
      )
      .toBe(true);
    for (const stage of DEFAULT_CRM_PIPELINE_CONFIG.stages) {
      const badge = page.getByTestId(`pipeline-setting-${stage.key}`).locator("span.rounded-full");
      await expect(badge).toBeVisible();
      const contrast = await badge.evaluate((element) => {
        const luminance = (color: string) => {
          const values = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map((value) => Number(value) / 255)
            .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
          return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
        };
        const style = getComputedStyle(element);
        const text = luminance(style.color),
          background = luminance(style.backgroundColor);
        return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
    await page.screenshot({
      path: testInfo.outputPath(`crm-settings-${theme}.png`),
      fullPage: true,
    });
  }
});

test("injected malformed and future-version rows show recovery/read-only behavior in the real page", async ({
  page,
}) => {
  await login(page);
  await reset(page);
  // Fault injection is restricted to the launcher's disposable database; it is
  // not a general application setting write or a production recovery command.
  const connectionString = process.env.BROWSER_TEST_DATABASE_URL;
  if (!connectionString) throw new Error("Disposable browser database URL is required");
  const url = new URL(connectionString);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/core_browser_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Recovery fixture must use local disposable core_browser_test");
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString, max: 1 });
  const probeKey = "crm_browser_test_cache_probe";
  async function replacePersisted(value: string) {
    await pool.query("UPDATE system_settings SET value = $1 WHERE key = 'crm_pipeline_config'", [
      value,
    ]);
    // The real generic setting API invalidates category caches. This separate
    // synthetic key leaves the reserved configuration write protection intact.
    expect(
      (
        await page.request.put("/api/admin/settings", {
          data: { key: probeKey, value: "fixture", category: "crm", isSecret: false },
        })
      ).status(),
    ).toBe(200);
  }
  async function storedValue() {
    return (await pool.query("SELECT value FROM system_settings WHERE key = 'crm_pipeline_config'"))
      .rows[0].value;
  }
  try {
    // Prime the real settings category cache before injecting a stale value.
    expect((await page.request.get(settingsPath)).status()).toBe(200);
    await replacePersisted("{malformed-test-fixture");
    await page.goto("/admin/crm/settings");
    await expect(page.getByRole("alert")).toContainText("Stored settings are invalid");
    await expect(
      page.getByTestId("pipeline-setting-new").getByLabel("Stage label", { exact: true }),
    ).toHaveValue("New");
    expect(await storedValue()).toBe("{malformed-test-fixture");
    await page.getByRole("button", { name: "Save pipeline settings", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Pipeline settings saved." }),
    ).toBeVisible();
    expect(JSON.parse(await storedValue())).toEqual(DEFAULT_CRM_PIPELINE_CONFIG);

    const future = JSON.stringify({ version: 2, stages: [], futureMarker: "keep" });
    await replacePersisted(future);
    await page.reload();
    await expect(page.getByRole("alert")).toContainText("unsupported version");
    await expect(
      page.getByRole("button", { name: "Save pipeline settings", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Restore defaults", exact: true }),
    ).toBeDisabled();
    expect(
      (await page.request.put(settingsPath, { data: DEFAULT_CRM_PIPELINE_CONFIG })).status(),
    ).toBe(409);
    expect(await storedValue()).toBe(future);
  } finally {
    try {
      await replacePersisted(JSON.stringify(DEFAULT_CRM_PIPELINE_CONFIG));
      expect((await page.request.delete(`/api/admin/settings/${probeKey}`)).status()).toBe(200);
    } finally {
      await pool.end();
    }
  }
});

test("injected settings network failure disables saving until real request retry succeeds", async ({
  page,
}) => {
  await login(page);
  await reset(page);
  const pattern = "**/api/admin/crm/settings/pipeline";
  // Explicit transport fault injection only; HTML, routing, and settings UI
  // remain the actual application. Unblocking retries reaches the real API.
  await page.route(pattern, (route) =>
    route.request().method() === "GET" ? route.abort("connectionfailed") : route.continue(),
  );
  try {
    await page.goto("/admin/crm/settings");
    await expect(page.getByRole("alert")).toContainText("Unable to load settings", {
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: "Save pipeline settings", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Restore defaults", exact: true }),
    ).toBeDisabled();
  } finally {
    await page.unroute(pattern);
  }
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save pipeline settings", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByTestId("pipeline-setting-new").getByLabel("Stage label", { exact: true }),
  ).toHaveValue("New");
  expect((await (await page.request.get(settingsPath)).json()).config).toEqual(
    DEFAULT_CRM_PIPELINE_CONFIG,
  );
});
