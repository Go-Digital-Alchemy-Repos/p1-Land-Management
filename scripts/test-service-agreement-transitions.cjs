const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("assert/strict"),
  fs = require("fs");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const checks = [];
  try {
    const p = await browser.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      (process.env.AGREEMENT_BROWSER_ORIGIN || "http://127.0.0.1:4344") +
        "/tests/service-agreements-browser.html",
    );
    await p.evaluate(() => {
      const original = window.fetch;
      window.fetch = async (...args) => {
        const r = await original(...args);
        if (
          String(args[0]) ===
            "/api/v1/service-agreements/00000000-0000-4000-8000-000000000004" &&
          (!args[1]?.method || args[1].method === "GET")
        ) {
          window.agreementHeld = true;
          await new Promise(
            (resolve) => (window.releaseAgreementResponse = resolve),
          );
        }
        return r;
      };
    });
    await p.locator(".agreement-list button").first().click();
    await p.waitForFunction(() => window.agreementHeld === true);
    await p.evaluate(() => window.switchAgreementRole("dispatch"));
    await p
      .getByRole("button", { name: "New agreement", exact: true })
      .waitFor({ state: "detached" });
    await p.evaluate(() => window.releaseAgreementResponse());
    await p.waitForTimeout(100);
    assert.equal(
      await p.getByText("Saved charge periods", { exact: true }).count(),
      0,
    );
    assert.ok(!(await p.locator("body").innerText()).includes("$"));
    checks.push(
      "Delayed manager detail response discarded after dispatch transition",
    );
    await p.goto(
      (process.env.AGREEMENT_BROWSER_ORIGIN || "http://127.0.0.1:4344") +
        "/tests/service-agreements-browser.html",
    );
    await p.locator(".agreement-list button").first().click();
    await p
      .getByRole("button", { name: "Edit draft terms", exact: true })
      .click();
    await p
      .getByLabel("Agreement title", { exact: true })
      .fill("Keep this offline draft");
    await p.context().setOffline(true);
    await p.waitForFunction(() => navigator.onLine === false);
    await p
      .getByRole("button", { name: "Save draft for review", exact: true })
      .waitFor();
    assert.ok(
      await p
        .getByRole("button", { name: "Save draft for review", exact: true })
        .isDisabled(),
    );
    assert.equal(
      await p.getByLabel("Agreement title", { exact: true }).inputValue(),
      "Keep this offline draft",
    );
    checks.push("Offline edit is disabled without losing typed title");
    assert.equal(
      (await p.evaluate(() => window.agreementTrace)).filter(
        (r) => r.method === "PATCH",
      ).length,
      0,
    );
    checks.push("Offline transition does not submit or enqueue an edit");
    await p.context().setOffline(false);
    await p.waitForFunction(() => navigator.onLine === true);
    await p.waitForFunction(
      () =>
        !document.querySelector(".agreement-editor input").disabled &&
        !document.querySelector(".agreement-workspace")?.disabled,
    );
    assert.equal(
      await p.getByLabel("Agreement title", { exact: true }).inputValue(),
      "Keep this offline draft",
    );
    assert.ok(
      await p
        .getByRole("button", { name: "Save draft for review", exact: true })
        .isEnabled(),
    );
    checks.push("Reconnect restores editing with retained values");
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "/tmp/p1-agreement-transition-report.json",
      JSON.stringify({ checks, errors, synthetic: true }, null, 2),
    );
    console.log("PASS", checks.length, "agreement transition checks");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
