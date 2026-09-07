import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/auth/login");
  await page.getByTestId("input-email").fill(email);
  await page.getByTestId("input-password").fill("CoreBrowserTest!2026");
  await page.getByTestId("button-login").click();
  await expect(page).not.toHaveURL(/\/auth\/login/);
}

test("all ecommerce settings routes render the real protected application", async ({ page }) => {
  await login(page, "browser-admin@example.test");
  for (const [section, save] of [
    ["store", "Save store shipping settings"],
    ["customer-accounts", "Save customer accounts"],
    ["security", "Save Security Center"],
    ["stripe", "Save Stripe settings"],
    ["tax", "Save tax settings"],
  ]) {
    await page.goto(`/admin/ecommerce/settings/${section}`);
    await expect(page.getByRole("button", { name: save, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: save, exact: true })).toBeVisible();
  }
});

test("CRM settings persist through UI save and reload without changing stage keys", async ({
  page,
}) => {
  await login(page, "browser-admin@example.test");
  await page.goto("/admin/crm/settings");
  await expect(page.getByRole("heading", { name: "CRM pipeline settings" })).toBeVisible();
  await page.getByRole("button", { name: "Restore defaults", exact: true }).click();
  const row = page.getByTestId("pipeline-setting-new");
  await row.getByLabel("Stage label", { exact: true }).fill("Inquiry");
  await row.getByLabel("Color", { exact: true }).selectOption("cyan");
  await row.getByRole("button", { name: "Move Inquiry down", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Save pipeline settings", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Pipeline settings saved." }),
  ).toBeVisible();
  await page.reload();
  await expect(row.getByLabel("Stage label", { exact: true })).toHaveValue("Inquiry");
  await expect(row.getByLabel("Color", { exact: true })).toHaveValue("cyan");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const response = await page.request.get("/api/admin/crm/settings/pipeline");
  expect(response.status()).toBe(200);
  const { config } = await response.json();
  expect(config.stages[1]).toEqual({ key: "new", label: "Inquiry", color: "cyan" });
  await page.getByRole("link", { name: "Back to Pipeline", exact: true }).click();
  await expect(page.getByTestId("text-crm-title")).toBeVisible();
  await expect(page.getByText("Inquiry", { exact: true }).first()).toBeVisible();
  await page.goto("/admin/crm/settings");
  await page.getByRole("button", { name: "Restore defaults", exact: true }).click();
  await page.getByRole("button", { name: "Save pipeline settings", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Pipeline settings saved." }),
  ).toBeVisible();
});

test("CRM editors can read settings but cannot modify them or enter admin settings", async ({
  page,
}) => {
  await login(page, "browser-editor@example.test");
  const path = "/api/admin/crm/settings/pipeline";
  const response = await page.request.get(path);
  expect(response.status()).toBe(200);
  const { config } = await response.json();
  expect((await page.request.put(path, { data: config })).status()).toBe(403);
  await page.goto("/admin/crm");
  await expect(page.getByTestId("text-crm-title")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pipeline settings", exact: true })).toHaveCount(0);
  await page.goto("/admin/crm/settings");
  await expect(page.getByRole("heading", { name: "CRM pipeline settings" })).toHaveCount(0);
  expect((await page.request.get("/api/admin/dashboard-stats")).status()).toBe(403);
});
