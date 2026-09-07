import { expect, test } from "@playwright/test";
const publicOrigin = "https://site.localhost:5443";
const endpoint = "/api/admin/client-site-content/fund-a-farm/fund-a-farm-page";
test("content editor previews, saves and publishes across actual isolated origins", async ({
  page,
  context,
}) => {
  await page.goto("/auth/login");
  await page.getByTestId("input-email").fill("pilot-editor@example.test");
  await page.getByTestId("input-password").fill("CorePilotTest!2026");
  await page.getByTestId("button-login").click();
  await expect(page).not.toHaveURL(/\/auth\/login/);
  const navigation = await page.goto("/admin/cms/client-sites/better-farms/fund-a-farm");
  expect(navigation!.headers()["content-security-policy"]).toContain(
    `frame-src 'self' https://js.stripe.com https://hooks.stripe.com ${publicOrigin}`,
  );
  await expect(page.getByRole("heading", { name: "Better Farms: Fund a Farm" })).toBeVisible();
  const iframe = page.frameLocator('iframe[title="Better Farms Fund a Farm preview"]');
  const current = await (await page.request.get(endpoint)).json();
  const originalHeading = current.draftContent.heading;
  await expect(iframe.getByRole("heading", { name: originalHeading, exact: true })).toBeVisible();
  const publicPage = await context.newPage();
  const siteResponse = await publicPage.goto(`${publicOrigin}/fund-a-farm`);
  expect(siteResponse!.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'self' https://dashboard.site.localhost:5443",
  );
  await expect(
    publicPage.getByRole("heading", { name: originalHeading, exact: true }),
  ).toBeVisible();
  const updatedHeading = "Synthetic pilot farm support";
  const coreImage = "https://dashboard.site.localhost:5443/avatars/avatar-14.webp";
  await page.getByLabel("Hero image", { exact: true }).fill(coreImage);
  const previewImage = iframe.locator(`img[src="${coreImage}"]`);
  await expect(previewImage).toBeVisible();
  await expect
    .poll(() => previewImage.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await page.locator("#field-heading").fill(updatedHeading);
  await expect(iframe.getByRole("heading", { name: updatedHeading, exact: true })).toBeVisible();
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: originalHeading, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeEnabled();
  const saved = await (await page.request.get(endpoint)).json();
  expect(saved.draftContent.heading).toBe(updatedHeading);
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: originalHeading, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeDisabled();
  await publicPage.close();
  const fresh = await context.newPage();
  await fresh.goto(`${publicOrigin}/fund-a-farm`);
  await expect(fresh.getByRole("heading", { name: updatedHeading, exact: true })).toBeVisible();
  const publishedImage = fresh.locator(`img[src="${coreImage}"]`);
  await expect(publishedImage).toBeVisible();
  await expect
    .poll(() => publishedImage.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  const conflict = await page.request.put(`${endpoint}/draft`, {
    data: {
      expectedRevision: current.draftRevision,
      content: { ...saved.draftContent, heading: "Stale overwrite" },
    },
  });
  expect(conflict.status()).toBe(409);
  expect((await (await page.request.get(endpoint)).json()).draftContent.heading).toBe(
    updatedHeading,
  );
  expect((await page.request.get("/api/admin/dashboard-stats")).status()).toBe(403);
  // Observe delivery and two render frames before asserting rejection, so an
  // immediate legitimate update cannot conceal acceptance of a malicious one.
  const target = page.frames().find((frame) => frame.url() === `${publicOrigin}/fund-a-farm`)!;
  for (const [name, src] of [
    ["trusted-sibling", "/auth/login"],
    ["untrusted-sibling", `${publicOrigin}/fund-a-farm`],
  ]) {
    await page.evaluate(
      ({ name, src }) => {
        const frame = document.createElement("iframe");
        frame.name = name;
        frame.src = src;
        document.body.append(frame);
      },
      { name, src },
    );
    await expect
      .poll(() =>
        page.frames().some((frame) => frame.name() === name && frame.url() !== "about:blank"),
      )
      .toBe(true);
    const sibling = page.frame({ name })!;
    const maliciousHeading = `Malicious ${name}`;
    const envelope = {
      type: "core-platform:client-site-preview",
      protocolVersion: "1.0",
      clientStackId: "better-farms-foundation",
      routeId: "fund-a-farm",
      componentKey: "fund-a-farm-page",
      revision: saved.draftRevision,
      content: { ...saved.draftContent, heading: maliciousHeading },
    };
    await target.evaluate((heading) => {
      const observe = (event: MessageEvent) => {
        if (event.data?.content?.heading !== heading) return;
        window.removeEventListener("message", observe);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            document.body.dataset.messageObserved = heading;
          }),
        );
      };
      window.addEventListener("message", observe);
    }, maliciousHeading);
    await sibling.evaluate(
      ({ envelope, publicOrigin }) => {
        window.parent.frames[0].postMessage(envelope, publicOrigin);
      },
      { envelope, publicOrigin },
    );
    await expect(iframe.locator("body")).toHaveAttribute("data-message-observed", maliciousHeading);
    await expect(iframe.getByRole("heading", { name: updatedHeading, exact: true })).toBeVisible();
    await expect(iframe.getByRole("heading", { name: maliciousHeading, exact: true })).toHaveCount(
      0,
    );
    await page.locator(`iframe[name="${name}"]`).evaluate((element) => element.remove());
  }
  // Exercise browser enforcement, not just the serialized header value.
  await page.evaluate(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      if (event.blockedURI.startsWith("https://untrusted.localhost"))
        document.body.dataset.blockedFrame = event.effectiveDirective;
    });
    const blocked = document.createElement("iframe");
    blocked.name = "blocked-origin";
    blocked.src = "https://untrusted.localhost:5443/";
    document.body.append(blocked);
  });
  await expect(page.locator("body")).toHaveAttribute("data-blocked-frame", "frame-src");
  await page.locator('iframe[name="blocked-origin"]').evaluate((element) => element.remove());
  await page.locator("#field-heading").fill("Verified legitimate preview");
  await expect(
    iframe.getByRole("heading", { name: "Verified legitimate preview", exact: true }),
  ).toBeVisible();
  await fresh.reload();
  await expect(fresh.getByRole("heading", { name: updatedHeading, exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/pilot/editor-preview.png", fullPage: true });
});
