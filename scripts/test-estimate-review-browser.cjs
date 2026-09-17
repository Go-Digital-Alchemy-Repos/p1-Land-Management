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
        viewport: { width: 390, height: 844 },
      }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let approved = false;
    await page.route("**/api/public/estimates/**", (route) => {
      if (route.request().method() === "POST") {
        approved = true;
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({
        json: {
          title: "Synthetic agreement",
          client_name: "José Álvarez",
          property_name: "Café grounds",
          scope: "First scope line\nSecond scope line",
          line_items: [
            {
              position: 0,
              description: "Care",
              quantity: 1.25,
              unit: "acre",
              unit_price_cents: 10001,
            },
          ],
          amount_cents: 12501,
          expires_at: "2030-01-31T00:00:00Z",
          agreement_template_snapshot:
            "Saved MSA line\n<script>Literal terms</script>",
          terms: "Additional client terms",
        },
      });
    });
    await page.goto("http://127.0.0.1:4347/estimate-approval/synthetic");
    await page
      .getByRole("heading", { name: "Agreement terms", exact: true })
      .waitFor();
    await page.getByText("Additional client terms", { exact: true }).waitFor();
    await page
      .getByText("Valid through Jan 31, 2030, 12:00 AM UTC", { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByText("Saved MSA line", { exact: false })
        .evaluate((node) => getComputedStyle(node).whiteSpace),
      "pre-wrap",
    );
    assert.equal(
      await page
        .getByText("First scope line", { exact: false })
        .evaluate((node) => getComputedStyle(node).whiteSpace),
      "pre-wrap",
    );
    assert.equal(
      await page
        .getByRole("link", { name: "Download PDF", exact: true })
        .getAttribute("href"),
      "/api/public/estimates/synthetic/pdf",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: "/tmp/p1-estimate-review-mobile.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Approve estimate", exact: true })
      .click();
    await page
      .getByText("Thank you. P1 will schedule your Job.", { exact: true })
      .waitFor();
    assert(approved);
    assert.equal(
      await page.getByText("Loading estimate…", { exact: true }).count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Customer estimate review passed: saved MSA/additional terms, preserved newlines/literal text, mobile layout and approval completion.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
