import { test, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";

const site = "https://site.localhost:5443";
async function readPilotDatabase() {
  const metadata = JSON.parse(
    await readFile(path.join(tmpdir(), "core-better-farms-pilot-database-5443.json"), "utf8"),
  );
  const url = new URL(metadata.databaseUrl);
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/core_pilot_test" ||
    url.username !== "pilot_test" ||
    url.password !== "disposable_pilot_test" ||
    !url.port ||
    url.search ||
    url.hash
  )
    throw new Error("Expected only launcher's disposable pilot database");
  return new pg.Pool({
    host: url.hostname,
    port: Number(url.port),
    user: url.username,
    password: url.password,
    database: "core_pilot_test",
    ssl: false,
    max: 1,
    connectionTimeoutMillis: 3000,
    statement_timeout: 3000,
  });
}

for (const kind of ["contact", "newsletter"] as const) {
  test(`${kind}: response lost after durable Core receipt retries once without duplicate effects`, async ({
    page,
  }, testInfo) => {
    const pool = await readPilotDatabase();
    const slug = kind === "contact" ? "contact-form" : "newsletter-signup";
    const endpoint = kind === "contact" ? "/api/contact" : "/api/forms/newsletter-signup/submit";
    const effectKind = kind === "contact" ? "contact_message" : "crm_intake";
    const rows = async () =>
      (
        await pool.query(
          `select s.id, s.idempotency_key, s.source, e.id as effect_id, e.payload->>'kind' as effect_kind from cms_form_submissions s join cms_forms f on f.id=s.form_id left join cms_form_effect_jobs e on e.submission_id=s.id where f.slug=$1 order by s.created_at,s.id`,
          [slug],
        )
      ).rows;
    try {
      expect(await rows()).toEqual([]);
      await page.goto(`${site}/contact`);
      const form = kind === "contact" ? page.locator("main form") : page.locator("footer form");
      const name = form.getByRole("textbox", { name: "Full name", exact: true });
      const email = form.getByRole("textbox", { name: "Email address", exact: true });
      const submit = form.getByRole("button", {
        name: kind === "contact" ? "Send Message" : "Subscribe",
        exact: true,
      });
      const originalEmail = `${kind}-pilot@example.test`;
      await name.fill("Synthetic Pilot");
      await email.fill("invalid-email");
      if (kind === "contact")
        await form.getByTestId("input-message").fill("Synthetic original inquiry");
      await submit.click();
      expect(await rows()).toEqual([]);
      // Also prove the actual site proxy rejects invalid input before Core receipts.
      expect(
        (
          await page.request.post(`${site}${endpoint}`, { data: { email: "invalid-email" } })
        ).status(),
      ).toBe(400);
      expect(await rows()).toEqual([]);
      await email.fill(originalEmail);
      let committedId = "";
      let originalKey = "";
      await page.route(
        `**${endpoint}`,
        async (route) => {
          originalKey = route.request().headers()["idempotency-key"];
          expect(originalKey).toMatch(/^[0-9a-f-]{36}$/);
          const realResponse = await route.fetch();
          expect(realResponse.status()).toBe(201);
          committedId = (await realResponse.json()).submissionId;
          const committed = await rows();
          expect(committed).toHaveLength(1);
          expect(committed[0]).toMatchObject({
            id: committedId,
            idempotency_key: originalKey,
            effect_kind: effectKind,
          });
          expect(committed[0].effect_id).toBeTruthy();
          // Deliberately lose only the browser response AFTER real Core commit.
          await route.abort("failed");
        },
        { times: 1 },
      );
      await submit.click();
      await expect(
        page.getByText(kind === "contact" ? "Message not sent" : "Subscription not completed", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(email).toHaveValue(originalEmail);
      await expect(name).toHaveValue("Synthetic Pilot");
      if (kind === "contact")
        await expect(form.getByTestId("input-message")).toHaveValue("Synthetic original inquiry");
      const retried = page.waitForResponse(
        (response) => response.url().endsWith(endpoint) && response.request().method() === "POST",
      );
      await submit.click();
      const retry = await retried;
      expect(retry.status()).toBe(200);
      expect(retry.request().headers()["idempotency-key"]).toBe(originalKey);
      expect((await retry.json()).submissionId).toBe(committedId);
      const afterRetry = await rows();
      expect(afterRetry).toHaveLength(1);
      expect(afterRetry[0].id).toBe(committedId);
      await expect(email).toHaveValue("");
      await name.fill("Synthetic Second");
      await email.fill(`${kind}-second@example.test`);
      if (kind === "contact")
        await form.getByTestId("input-message").fill("Synthetic changed inquiry");
      const changedResponse = page.waitForResponse(
        (response) => response.url().endsWith(endpoint) && response.request().method() === "POST",
      );
      await submit.click();
      const changed = await changedResponse;
      expect(changed.status()).toBe(201);
      expect(changed.request().headers()["idempotency-key"]).not.toBe(originalKey);
      const changedId = (await changed.json()).submissionId;
      expect(changedId).not.toBe(committedId);
      const afterChanged = await rows();
      expect(afterChanged).toHaveLength(2);
      expect(new Set(afterChanged.map((row) => row.id)).size).toBe(2);
      expect(afterChanged.every((row) => row.effect_kind === effectKind && row.effect_id)).toBe(
        true,
      );
      expect(
        afterChanged.every(
          (row) =>
            row.source ===
            `client-stack:better-farms-foundation:${kind === "contact" ? "contact" : "newsletter"}-proxy`,
        ),
      ).toBe(true);
      const evidence = {
        lostResponseSubmissionId: committedId,
        retrySubmissionId: afterRetry[0].id,
        countAfterRetry: afterRetry.length,
        changedSubmissionId: changedId,
        countAfterChanged: afterChanged.length,
        effects: afterChanged.map(({ id, effect_id, effect_kind }) => ({
          submissionId: id,
          effectId: effect_id,
          kind: effect_kind,
        })),
      };
      const evidencePath = testInfo.outputPath(`${kind}-durable-receipts.json`);
      await mkdir(path.dirname(evidencePath), { recursive: true });
      await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
      await testInfo.attach(`${kind}-durable-receipts.json`, {
        path: evidencePath,
        contentType: "application/json",
      });
    } finally {
      await pool.end();
    }
  });
}
