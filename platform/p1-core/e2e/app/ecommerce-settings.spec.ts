import { expect, test, type Page } from "@playwright/test";

const sections = [
  {
    section: "store",
    api: "/api/admin/ecommerce/settings/store",
    save: "Save store shipping settings",
  },
  {
    section: "customer-accounts",
    api: "/api/admin/ecommerce/settings/customer-accounts",
    save: "Save customer accounts",
  },
  { section: "tax", api: "/api/admin/ecommerce/settings/tax", save: "Save tax settings" },
  {
    section: "security",
    api: "/api/admin/ecommerce/security/settings",
    save: "Save Security Center",
  },
  { section: "stripe", api: "/api/admin/ecommerce/settings/stripe", save: "Save Stripe settings" },
] as const;

async function login(page: Page, role: "admin" | "editor") {
  await page.goto("/auth/login");
  await page.getByTestId("input-email").fill(`browser-${role}@example.test`);
  await page.getByTestId("input-password").fill("CoreBrowserTest!2026");
  await page.getByTestId("button-login").click();
  await expect(page).not.toHaveURL(/\/auth\/login/);
}
async function savedSettings(page: Page, api: string) {
  const response = await page.request.get(api);
  expect(response.status()).toBe(200);
  return response.json();
}
async function saveAndReload(page: Page, api: string, label: string) {
  const response = page.waitForResponse(
    (response) => response.url().endsWith(api) && response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: label, exact: true }).click();
  expect((await response).status()).toBe(200);
  await page.reload();
  await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
}

test("safe store, customer, tax and security settings persist through real UI save and reload", async ({
  page,
}, testInfo) => {
  await login(page, "admin");
  await page.goto("/admin/ecommerce/settings/store");
  const location = `Synthetic warehouse ${testInfo.project.name}`;
  await page.getByPlaceholder("Main warehouse", { exact: true }).fill(location);
  await saveAndReload(page, sections[0].api, sections[0].save);
  await expect(page.getByPlaceholder("Main warehouse", { exact: true })).toHaveValue(location);
  expect((await savedSettings(page, sections[0].api)).storeOrigin.name).toBe(location);

  await page.goto("/admin/ecommerce/settings/customer-accounts");
  const customerBefore = await savedSettings(page, sections[1].api);
  const mode = customerBefore.customerAccountMode === "required" ? "guest_only" : "required";
  const modeLabel = mode === "required" ? "Require account before checkout" : "Guest checkout only";
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: modeLabel, exact: true }).click();
  await saveAndReload(page, sections[1].api, sections[1].save);
  await expect(page.getByRole("combobox")).toHaveText(modeLabel);
  expect((await savedSettings(page, sections[1].api)).customerAccountMode).toBe(mode);

  await page.goto("/admin/ecommerce/settings/tax");
  const taxBefore = await savedSettings(page, sections[2].api);
  const rate = taxBefore.manualRateBps === 725 ? "6.50" : "7.25";
  await page.getByPlaceholder("6.00", { exact: true }).fill(rate);
  await saveAndReload(page, sections[2].api, sections[2].save);
  await expect(page.getByPlaceholder("6.00", { exact: true })).toHaveValue(rate);
  const taxAfter = await savedSettings(page, sections[2].api);
  expect(taxAfter.manualRateBps).toBe(Math.round(Number(rate) * 100));
  expect(taxAfter.stripeTaxEnabled).toBe(false);

  await page.goto("/admin/ecommerce/settings/security");
  const securityBefore = await savedSettings(page, sections[3].api);
  const threshold = securityBefore.riskReviewThreshold === 41 ? 42 : 41;
  const reviewThreshold = page
    .locator("div.space-y-2")
    .filter({ has: page.locator("label").filter({ hasText: /^Review threshold$/ }) })
    .getByRole("spinbutton");
  await reviewThreshold.fill(String(threshold));
  await saveAndReload(page, sections[3].api, sections[3].save);
  await expect(reviewThreshold).toHaveValue(String(threshold));
  const securityAfter = await savedSettings(page, sections[3].api);
  expect(securityAfter.riskReviewThreshold).toBe(threshold);
  expect(securityAfter.captchaEnabled).toBe(false);
  expect(securityAfter.maxMindEnabled).toBe(false);
});

for (const { section, api, save } of sections) {
  test(`${section}: initial GET transport failure hides default form and Retry loads real retained settings`, async ({
    page,
  }) => {
    await login(page, "admin");
    const before = await savedSettings(page, api);
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith(api) && request.method() !== "GET") writes.push(request.method());
    });
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**${api}`, async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      await pending;
      await route.abort("failed");
    });
    await page.goto(`/admin/ecommerce/settings/${section}`);
    await expect(page.getByRole("status").filter({ hasText: "Loading settings…" })).toBeVisible();
    await expect(page.getByRole("button", { name: save, exact: true })).toHaveCount(0);
    release();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Settings could not be loaded. Retry before editing or saving." }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: save, exact: true })).toHaveCount(0);
    expect(writes).toEqual([]);
    await page.unroute(`**${api}`);
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByRole("button", { name: save, exact: true })).toBeVisible();
    expect(await savedSettings(page, api)).toEqual(before);
    expect(writes).toEqual([]);
  });
}

test("CRM editor cannot modify ecommerce settings through the page or API", async ({ page }) => {
  await login(page, "editor");
  for (const { section, api, save } of sections.filter((item) => item.section !== "stripe")) {
    expect((await page.request.get(api)).status()).toBe(403);
    expect((await page.request.put(api, { data: {} })).status()).toBe(403);
    await page.goto(`/admin/ecommerce/settings/${section}`);
    await expect(page.getByRole("button", { name: save, exact: true })).toHaveCount(0);
  }
});

test("synthetic Stripe test configuration saves masked status and blank resave preserves secrets", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/admin/ecommerce/settings/stripe");
  const api = "/api/admin/ecommerce/settings/stripe";
  const publishable = "pk_test_CoreSyntheticBrowserOnly2026";
  const secret = "sk_test_CoreSyntheticBrowserOnly2026";
  const webhook = "whsec_CoreSyntheticBrowserOnly2026";
  const testKeys = page.getByRole("heading", { name: "Test keys", exact: true }).locator("..");
  await expect(page.getByRole("combobox")).toHaveText("Test");
  await testKeys.getByPlaceholder("Publishable key", { exact: true }).fill(publishable);
  await testKeys.getByPlaceholder(/^Secret key(?: saved)?$/).fill(secret);
  await testKeys.getByPlaceholder(/^Webhook secret(?: saved)?$/).fill(webhook);
  await saveAndReload(page, api, "Save Stripe settings");
  await expect(testKeys.getByPlaceholder("Publishable key", { exact: true })).toHaveValue(
    publishable,
  );
  await expect(testKeys.getByPlaceholder("Secret key saved", { exact: true })).toHaveValue("");
  await expect(testKeys.getByPlaceholder("Webhook secret saved", { exact: true })).toHaveValue("");
  const response = await page.request.get(api);
  expect(response.status()).toBe(200);
  const raw = await response.text();
  expect(raw).not.toContain(secret);
  expect(raw).not.toContain(webhook);
  const masked = JSON.parse(raw);
  expect(masked).toMatchObject({
    providerTransactionsEnabled: false,
    configured: true,
    awaitingActivation: true,
    activeMode: "test",
    testPublishableKey: publishable,
    hasTestSecretKey: true,
    hasTestWebhookSecret: true,
    hasLiveSecretKey: false,
    hasLiveWebhookSecret: false,
  });
  await expect(page.getByTestId("stripe-activation-status")).toContainText(
    "Awaiting payment activation",
  );
  expect(masked).not.toHaveProperty("testSecretKey");
  expect(masked).not.toHaveProperty("testWebhookSecret");

  const resave = page.waitForRequest(
    (request) => request.url().endsWith(api) && request.method() === "PUT",
  );
  await saveAndReload(page, api, "Save Stripe settings");
  expect((await resave).postDataJSON()).toMatchObject({ testSecretKey: "", testWebhookSecret: "" });
  expect(await savedSettings(page, api)).toEqual(masked);
  await expect(page.getByTestId("stripe-activation-status")).toContainText(
    "Awaiting payment activation",
  );
  expect((await resave).postDataJSON()).not.toHaveProperty("providerTransactionsEnabled");
  await expect(testKeys.getByPlaceholder("Secret key saved", { exact: true })).toHaveValue("");
  await expect(testKeys.getByPlaceholder("Webhook secret saved", { exact: true })).toHaveValue("");
});
