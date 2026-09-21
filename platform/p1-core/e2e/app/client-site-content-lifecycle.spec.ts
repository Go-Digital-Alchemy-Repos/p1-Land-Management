import { expect, test, type Page } from "@playwright/test";

const routeId = "service-areas-greer-sc";
const componentKey = "service-areas-greer-sc-content";
const editorPath = `/admin/cms/website/${routeId}/${componentKey}`;
const contentPath = `/api/client-site-content/${routeId}/${componentKey}`;

async function signInWithDashboard(page: Page) {
  await page.goto("/admin/login");
  await expect(
    page.getByRole("link", { name: "Sign in with P1 Dashboard", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sign in with P1 Dashboard", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function openEditor(page: Page) {
  await page.goto(editorPath);
  await expect(page.getByRole("heading", { name: "P1 website editor", exact: true })).toBeVisible();
  await expect(page.getByTestId("client-site-preview-frame")).toBeVisible();
}

test("federated CMS editor saves, publishes, resolves a simultaneous-editor conflict, and restores a revision", async ({
  page,
}) => {
  const originalTitle = await page.request
    .get(`/api/admin/client-site-content/${routeId}/${componentKey}`)
    .then(async (response) =>
      response.status() === 401 ? null : (await response.json()).draftContent.seoTitle,
    );
  // The first request is intentionally unauthenticated; it proves this browser journey cannot
  // silently rely on the legacy Core session.
  expect(originalTitle).toBeNull();

  await signInWithDashboard(page);
  await openEditor(page);
  const title = page.getByLabel("SEO title", { exact: true });
  const initial = `CMS acceptance ${crypto.randomUUID()}`;
  await title.fill(initial);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
  await expect(page.getByText("Draft r1", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Content published", { exact: true })).toBeVisible();
  await expect
    .poll(async () => {
      const response = await page.request.get(contentPath);
      return response.status() === 200 ? (await response.json()).content.seoTitle : null;
    })
    .toBe(initial);

  const concurrentContext = await page
    .context()
    .browser()!
    .newContext({ viewport: page.viewportSize()! });
  try {
    const concurrentPage = await concurrentContext.newPage();
    await signInWithDashboard(concurrentPage);
    await openEditor(concurrentPage);
    await expect(concurrentPage.getByText("Draft r2", { exact: false })).toBeVisible();

    const replacement = `CMS replacement ${crypto.randomUUID()}`;
    await title.fill(replacement);
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    await expect(page.getByText("Draft r3", { exact: false })).toBeVisible();

    await concurrentPage.getByLabel("SEO title", { exact: true }).fill("conflicting stale edit");
    await concurrentPage.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(
      concurrentPage.getByText("Draft could not be saved", { exact: true }),
    ).toBeVisible();
    await expect(concurrentPage.getByText("Draft revision changed", { exact: true })).toBeVisible();
  } finally {
    await concurrentContext.close();
  }

  await page.getByRole("button", { name: "Restore r1", exact: true }).click();
  await expect(page.getByText("Revision restored as a new draft", { exact: true })).toBeVisible();
  await expect(page.getByText("Draft r4", { exact: false })).toBeVisible();
  await expect(title).toHaveValue(initial);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Content published", { exact: true })).toBeVisible();
  await expect
    .poll(async () => {
      const response = await page.request.get(contentPath);
      return response.status() === 200 ? (await response.json()).content.seoTitle : null;
    })
    .toBe(initial);

  await page.reload();
  await expect(page).toHaveURL(editorPath);
  await expect(page.getByRole("heading", { name: "P1 website editor", exact: true })).toBeVisible();
  await expect(page.getByLabel("SEO title", { exact: true })).toHaveValue(initial);
});
