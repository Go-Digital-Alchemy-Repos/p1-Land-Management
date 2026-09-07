const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("assert/strict");
const fs = require("fs");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  let checks = 0;
  const check = (v, m) => {
    assert.ok(v, m);
    checks++;
  };
  try {
    const p = await browser.newPage({
      viewport: { width: 1280, height: 1000 },
    });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
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
      .fill("Reviewed grounds term");
    await p
      .getByRole("button", { name: "Save draft for review", exact: true })
      .click();
    await p
      .getByRole("alert")
      .filter({ hasText: "Agreement changed" })
      .waitFor();
    check(
      (await p.getByLabel("Agreement title", { exact: true }).inputValue()) ===
        "Reviewed grounds term",
      "409 retains edit",
    );
    check(
      await p
        .getByRole("button", { name: "Save draft for review", exact: true })
        .isDisabled(),
      "Conflict cannot silently retry stale version",
    );
    await p
      .getByRole("button", { name: "Compare current saved terms", exact: true })
      .click();
    const comparison = p.getByRole("region", {
      name: "Saved terms comparison",
    });
    await comparison
      .getByText("Another manager title", { exact: true })
      .waitFor();
    check(
      (await comparison.innerText()).includes("Reviewed grounds term"),
      "Current and proposed terms remain separate",
    );
    await p
      .getByRole("button", {
        name: "Use reviewed version for next save",
        exact: true,
      })
      .click();
    await p
      .getByRole("button", { name: "Save draft for review", exact: true })
      .click();
    await p
      .getByRole("heading", { name: "Reviewed grounds term", exact: true })
      .waitFor();
    await p
      .getByRole("button", { name: "Review activation plan", exact: true })
      .click();
    const plan = p.getByRole("region", { name: "Activation plan" });
    await plan
      .getByRole("button", { name: "Activate reviewed agreement" })
      .waitFor();
    check(
      (await plan.innerText()).includes("$100.00") &&
        (await plan.innerText()).includes("2099-01-31"),
      "Full plan and cap visible",
    );
    await plan
      .getByRole("button", { name: "Activate reviewed agreement" })
      .click();
    await p
      .getByRole("button", { name: "Review charge eligibility", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Prepare billing draft", exact: true })
      .click();
    await p
      .getByRole("status")
      .filter({ hasText: "Billing draft prepared" })
      .waitFor();
    check(true, "Explicit draft preparation");
    await p.getByLabel("Effective date", { exact: true }).fill("2099-01-01");
    await p
      .getByLabel("Cancellation reason", { exact: true })
      .fill("Fixture cancellation");
    await p
      .getByRole("button", { name: "Record cancellation", exact: true })
      .click();
    await p
      .getByText("Prepared charge affected by cancellation", { exact: true })
      .waitFor();
    check(
      (
        await p
          .getByRole("region", { name: "Agreement billing action queue" })
          .innerText()
      ).includes("00000000-0000-4000-8000-000000000006"),
      "Cancelled prepared draft visible",
    );
    await p
      .getByRole("button", {
        name: "Review cancellation impact",
        exact: true,
      })
      .click();
    await p
      .getByLabel("Decision", { exact: true })
      .selectOption("correction_required");
    await p
      .getByLabel("Reason for this decision", { exact: true })
      .fill("Fixture correction review");
    await p
      .getByRole("button", { name: "Compare current snapshot", exact: true })
      .click();
    await p
      .getByRole("status")
      .filter({ hasText: "This decision keeps posting blocked" })
      .waitFor();
    check(
      await p
        .getByRole("button", { name: "Record immutable decision", exact: true })
        .isEnabled(),
      "Correction-required decision can be recorded after comparison",
    );
    await p
      .getByRole("button", { name: "Record immutable decision", exact: true })
      .click();
    await p
      .getByRole("alert")
      .filter({ hasText: "Synthetic response loss" })
      .waitFor();
    await p
      .getByRole("button", { name: "Record immutable decision", exact: true })
      .click();
    await p
      .getByRole("status")
      .filter({ hasText: "Correction was recorded" })
      .waitFor();
    check(
      (
        await p
          .getByRole("region", { name: "Agreement billing action queue" })
          .innerText()
      ).includes("correction required"),
      "Recorded correction remains in the billing queue",
    );
    await p
      .getByRole("button", {
        name: "View prepared charge history",
        exact: true,
      })
      .click();
    check(
      (
        await p
          .getByRole("region", { name: "Prepared charge history" })
          .innerText()
      ).includes("correction required"),
      "Correction history remains discoverable from the agreement",
    );
    await p
      .getByRole("button", {
        name: "Create successor with new approval",
        exact: true,
      })
      .click();
    await p
      .getByRole("combobox", { name: /Approved estimate/ })
      .selectOption("00000000-0000-4000-8000-000000000007");
    await p.getByLabel("Term starts", { exact: true }).fill("2099-02-01");
    await p.getByLabel("Term ends", { exact: true }).fill("2099-02-28");
    await p
      .getByLabel("2099-02-01 through 2099-02-28 (USD)", { exact: true })
      .fill("12.50");
    await p
      .getByRole("button", { name: "Save draft for review", exact: true })
      .click();
    await p
      .getByRole("heading", {
        name: "Renewal · Reviewed grounds term",
        exact: true,
      })
      .waitFor();
    const trace = await p.evaluate(() => window.agreementTrace);
    const created = trace.find(
      (t) => t.path === "/api/v1/service-agreements" && t.method === "POST",
    ).body;
    check(
      created.predecessorId === "00000000-0000-4000-8000-000000000004" &&
        created.terms.periods[0].amountCents === 1250,
      "Successor binding and exact cents",
    );
    check(
      trace.filter((t) => t.path.endsWith("/charges")).length === 1,
      "One explicit charge",
    );
    check(
      trace.some(
        (t) =>
          t.path.endsWith("/review-preview") &&
          t.body.outcome === "correction_required",
      ) &&
        trace.some(
          (t) =>
            t.path.endsWith("/reviews") &&
            t.body.outcome === "correction_required",
        ),
      "Correction records only after the zero-write comparison",
    );
    const reviewWrites = trace.filter((t) => t.path.endsWith("/reviews"));
    check(
      reviewWrites.length === 2 &&
        reviewWrites[0].body.operationId === reviewWrites[1].body.operationId,
      "Ambiguous record retry preserves the same operation ID",
    );
    await p.setViewportSize({ width: 390, height: 844 });
    check(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Mobile no horizontal page overflow",
    );
    await p.screenshot({
      path: "/tmp/p1-agreement-mobile-ui.png",
      fullPage: true,
    });
    await p.evaluate(() => window.switchAgreementRole("dispatch"));
    await p
      .getByRole("button", { name: "New agreement", exact: true })
      .waitFor({ state: "detached" });
    check(
      (await p.getByText("Saved charge periods", { exact: true }).count()) ===
        0,
      "Role transition discards selected financial state",
    );
    check(
      !(await p.locator("body").innerText()).includes("$"),
      "Role transition does not retain financial values",
    );
    await p.goto(
      (process.env.AGREEMENT_BROWSER_ORIGIN || "http://127.0.0.1:4344") +
        "/tests/service-agreements-browser.html?role=dispatch",
    );
    await p.locator(".agreement-list button").first().click();
    check(
      !(await p.locator("body").innerText()).includes("$"),
      "Dispatch no prices",
    );
    check(
      (await p
        .getByRole("button", { name: "New agreement", exact: true })
        .count()) === 0,
      "Dispatch no financial mutation",
    );
    const dt = await p.evaluate(() => window.agreementTrace);
    check(
      !dt.some(
        (t) => t.path.includes("estimates") || t.path.includes("charge-queue"),
      ),
      "Dispatch does not fetch financial choices/queue",
    );
    check(errors.length === 0, "No JS errors");
    fs.writeFileSync(
      "/tmp/p1-agreement-browser-report.json",
      JSON.stringify({ checks, errors, synthetic: true }, null, 2),
    );
    console.log("PASS", checks, "agreement browser checks");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
