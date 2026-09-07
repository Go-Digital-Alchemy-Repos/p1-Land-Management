import { expect, test } from "@playwright/test";

const origin = "https://site.localhost:5443";
const routes = [
  "/",
  "/about",
  "/how-it-works",
  "/get-involved",
  "/for-farmers",
  "/contact",
  "/fund-a-farm",
];

test.beforeEach(async ({ context }) => {
  // Keep this acceptance run local even if future content introduces external URLs.
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["site.localhost", "dashboard.site.localhost"].includes(url.hostname))
      await route.continue();
    else await route.abort("blockedbyclient");
  });
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test.describe(`${viewport.width}px public routes`, () => {
    test.use({ viewport });
    for (const path of routes) {
      test(`${path} renders, decodes local images and exposes valid internal routes`, async ({
        page,
      }) => {
        const response = await page.goto(origin + path);
        expect(response?.status()).toBe(200);
        const heading = page.getByRole("heading", { level: 1 });
        await expect(heading).toHaveCount(1);
        await expect(heading).toBeVisible();
        await expect(heading).not.toHaveText("");
        const imageFailures = await page.locator("img").evaluateAll(async (images) => {
          const failures: string[] = [];
          for (const image of images) {
            if (new URL(image.src).origin !== location.origin) continue;
            try {
              await image.decode();
              if (!image.naturalWidth) failures.push(image.getAttribute("src") ?? "missing src");
            } catch {
              failures.push(image.getAttribute("src") ?? "missing src");
            }
          }
          return failures;
        });
        expect(imageFailures).toEqual([]);
        const links = await page
          .locator("a[href]")
          .evaluateAll((anchors) =>
            anchors.map((a) => a.getAttribute("href")!).filter((href) => href.startsWith("/")),
          );
        expect(links.length).toBeGreaterThan(0);
        for (const href of links) expect(routes, href).toContain(new URL(href, origin).pathname);
        // Navigate through actual header controls, then confirm client routing and reload.
        if (viewport.width < 1024) {
          await page.getByTestId("button-mobile-menu").click();
          await page.getByTestId("link-mobile-nav-contact").click();
        } else await page.getByTestId("link-nav-contact").click();
        await expect(page).toHaveURL(origin + "/contact");
        await page.reload();
        await expect(page.getByTestId("input-full-name")).toBeVisible();
      });
    }
    test("team dialog opens by keyboard and closes with Escape", async ({ page }) => {
      await page.goto(origin + "/about");
      const members = page.locator('[data-testid^="card-board-member-"]');
      await expect(members.first()).toBeVisible();
      const count = await members.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await members.nth(i).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByTestId("text-team-modal-name")).not.toHaveText("");
        expect(
          await page
            .getByTestId("img-team-modal-headshot")
            .evaluate(async (img: HTMLImageElement) => {
              await img.decode();
              return img.naturalWidth > 0;
            }),
        ).toBe(true);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
    });
    test("donation choices lead to contact without checkout", async ({ page }) => {
      await page.goto(origin + "/fund-a-farm");
      await page.getByTestId("button-donation-25").click();
      await expect(page.getByTestId("button-donation-25")).toHaveAttribute("aria-pressed", "true");
      await page.getByTestId("input-custom-donation").fill("75");
      await expect(page.getByTestId("button-donation-25")).toHaveAttribute("aria-pressed", "false");
      await expect(page.getByTestId("button-donate-now")).toHaveAttribute("href", "/contact");
      await page.getByTestId("button-donate-now").click();
      await expect(page).toHaveURL(origin + "/contact");
      await expect(page.getByTestId("input-full-name")).toBeVisible();
    });
  });
}

test("mobile drawer keyboard focus remains inside while open and Escape restores trigger", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + "/");
  const trigger = page.getByTestId("button-mobile-menu");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("link-mobile-home-logo")).toBeFocused();
  await page.getByTestId("link-mobile-fund-a-farm").focus();
  await page.keyboard.press("Tab");
  expect
    .soft(
      await page.evaluate(
        () => !!document.activeElement?.closest('#mobile-nav, [data-testid="button-mobile-menu"]'),
      ),
      "Open drawer must not send Tab focus into the obscured page",
    )
    .toBe(true);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByTestId("link-mobile-fund-a-farm")).toBeFocused();
  expect(await page.locator("h1").evaluate((element) => !!element.closest("[inert]"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await expect(page.locator("#mobile-nav")).toHaveAttribute("inert", "");
  expect(await page.locator("h1").evaluate((element) => !!element.closest("[inert]"))).toBe(false);
  await trigger.click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("link-nav-contact")).toBeVisible();
  await page.getByTestId("link-nav-contact").click();
  await expect(page).toHaveURL(origin + "/contact");
});
