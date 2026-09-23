import { expect, test } from "@playwright/test";

test("selecting an address fills every structured property address field", async ({ page }) => {
  await page.goto("/tests/address-autocomplete-browser.html");
  await page.getByRole("combobox", { name: "Address line 1" }).fill("120 Guion Lan");
  await page.getByRole("option", { name: /120 Guion Lane/ }).click();

  await expect(page.getByRole("combobox", { name: "Address line 1" })).toHaveValue("120 Guion Lane");
  await expect(page.getByRole("textbox", { name: "City" })).toHaveValue("Stallings");
  await expect(page.getByRole("textbox", { name: "State" })).toHaveValue("NC");
  await expect(page.getByRole("textbox", { name: "ZIP code" })).toHaveValue("28105");
  await expect(page.getByRole("option", { name: /120 Guion Lane/ })).toHaveCount(0);
});

test("keyboard selection fills the same fields", async ({ page }) => {
  await page.goto("/tests/address-autocomplete-browser.html");
  const input = page.getByRole("combobox", { name: "Address line 1" });
  await input.fill("120 Guion Lan");
  await expect(page.getByRole("option", { name: /120 Guion Lane/ })).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");

  await expect(input).toHaveValue("120 Guion Lane");
  await expect(page.getByRole("textbox", { name: "City" })).toHaveValue("Stallings");
});
