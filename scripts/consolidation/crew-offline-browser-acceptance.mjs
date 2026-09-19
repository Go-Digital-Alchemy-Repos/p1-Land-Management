/** Isolated real-browser client acceptance. The sync server is synthetic, not production evidence. */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const require = createRequire(path.join(root, "platform/p1-core/package.json"));
const { chromium, expect } = require("@playwright/test");
const dist = path.resolve(root, "artifacts/p1-dashboard/dist");
const profile = await fs.mkdtemp(
  path.join(os.tmpdir(), "p1-crew-offline-browser-"),
);
const userId = randomUUID(),
  workId = randomUUID();
const work = {
  id: workId,
  version: 2,
  title: "Synthetic offline crew assignment",
  status: "scheduled",
  scheduled_at: new Date().toISOString(),
  property_id: randomUUID(),
  property_name: "Synthetic property",
  scope: "Local browser acceptance only",
  access_instructions: "No real property access",
  checklist: [],
};
const operations = new Map(),
  batches = [],
  unexpected = [];
let dropFirstAck = true,
  context;
const send = (res, data, status = 200) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1"),
      p = url.pathname;
    if (p === "/api/v1/setup") return send(res, { initialized: true });
    if (p === "/api/v1/me")
      return send(res, {
        id: userId,
        name: "Synthetic Crew",
        role: "crew",
        capabilities: [],
        mfaRequired: false,
      });
    if (p === "/api/v1/work-orders") return send(res, [work]);
    if (p === "/api/v1/properties") return send(res, []);
    if (p === "/api/v1/field/sync" && req.method === "POST") {
      let text = "";
      for await (const chunk of req) text += chunk;
      const { events } = JSON.parse(text);
      assert.ok(Array.isArray(events));
      batches.push(events.map((e) => e.id));
      for (const event of events) {
        assert.equal(event.workOrderId, workId);
        if (!operations.has(event.id)) operations.set(event.id, event);
        else assert.deepEqual(operations.get(event.id), event);
      }
      if (dropFirstAck) {
        dropFirstAck = false;
        return send(
          res,
          { error: "Synthetic acknowledgement unavailable" },
          503,
        );
      }
      return send(res, {
        results: events.map((e) => ({ id: e.id, status: "accepted" })),
      });
    }
    if (p.startsWith("/api/")) {
      unexpected.push(p);
      return send(res, { error: "Unexpected synthetic route" }, 404);
    }
    const candidate = path.resolve(dist, "." + p);
    let file = candidate.startsWith(dist + path.sep) ? candidate : "";
    if (!file || !(await fs.stat(file).catch(() => null))?.isFile())
      file = path.join(dist, "index.html");
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".woff2": "font/woff2",
        ".webmanifest": "application/manifest+json",
      }[path.extname(file)] || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; worker-src 'self'; frame-src 'self'; object-src 'none'",
    );
    res.end(await fs.readFile(file));
  } catch (error) {
    if (!res.headersSent) send(res, { error: "Synthetic fixture failed" }, 500);
    else res.end();
    unexpected.push(error.message);
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const checks = [];
async function launch(offline = false) {
  const executable =
    process.env.P1_ACCEPTANCE_CHROME ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  await fs.access(executable);
  const browser = await chromium.launchPersistentContext(profile, {
    executablePath: executable,
    headless: true,
    viewport: { width: 1280, height: 900 },
    serviceWorkers: "allow",
  });
  await browser.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      unexpected.push("nonlocal request blocked: " + url.origin);
      return route.abort();
    }
    return route.continue();
  });
  await browser.setOffline(offline);
  return browser;
}
async function queue(page) {
  return page.evaluate(async (id) => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("p1-field-" + id, 2);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const rows = await new Promise((resolve, reject) => {
      const tx = db.transaction("operations", "readonly");
      const r = tx.objectStore("operations").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return rows;
  }, userId);
}
async function waitForQueue(page, count) {
  await expect
    .poll(async () => (await queue(page)).length, { timeout: 10000 })
    .toBe(count);
}
try {
  const html = await fs.readFile(path.join(dist, "index.html"));
  context = await launch();
  let page = await context.newPage();
  await page.goto(origin + "/my-day");
  await page.getByRole("heading", { name: work.title }).waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.getByRole("button", { name: "Download My Day" }).click();
  await page
    .getByText("Assignments saved for offline use on this device.")
    .waitFor();
  await context.setOffline(true);
  await page.waitForFunction(() => !navigator.onLine);
  await page.getByRole("button", { name: "Start work", exact: true }).click();
  await waitForQueue(page, 1);
  await page.getByRole("button", { name: "Add field entry" }).click();
  await page.getByLabel("Entry type").selectOption("complete");
  await page.getByRole("button", { name: "Save on this device" }).click();
  await waitForQueue(page, 2);
  const original = await queue(page);
  assert.deepEqual(original.map((e) => e.kind).sort(), ["complete", "time"]);
  assert.equal(batches.length, 0);
  checks.push(
    "Actual UI queued start and completion in IndexedDB while browser offline; no sync request",
  );
  await page.reload();
  await page.getByRole("heading", { name: work.title }).waitFor();
  assert.deepEqual(await queue(page), original);
  checks.push(
    "Offline navigation reload restored cached shell, account, assignment and exact pending payloads",
  );
  await context.close();
  context = await launch(true);
  page = await context.newPage();
  await page.goto(origin + "/my-day");
  await page.getByRole("heading", { name: work.title }).waitFor();
  assert.deepEqual(await queue(page), original);
  checks.push(
    "Full browser process/context restart with same isolated profile preserved exact pending payloads offline",
  );
  await context.setOffline(false);
  await page.waitForFunction(() => navigator.onLine);
  await page.getByRole("button", { name: "Sync Now" }).click();
  await page
    .getByText(
      "HTTP 503 Service Unavailable: Synthetic acknowledgement unavailable",
      { exact: true },
    )
    .waitFor();
  assert.equal(batches.length, 1);
  assert.equal(operations.size, 2);
  assert.deepEqual(await queue(page), original);
  checks.push(
    "Lost acknowledgement after fixture acceptance retained both exact operation IDs and payloads",
  );
  await page.getByRole("button", { name: "Sync Now" }).click();
  await waitForQueue(page, 0);
  assert.equal(batches.length, 2);
  assert.deepEqual(batches[0], batches[1]);
  assert.equal(operations.size, 2);
  await page.getByRole("button", { name: "Sync Now" }).click();
  await page.getByText("Everything is up to date.").waitFor();
  assert.equal(batches.length, 2);
  checks.push(
    "Reconnect retry reused IDs, fixture applied each once, acknowledgements cleared queue, empty resync sent nothing",
  );
  assert.deepEqual(unexpected, []);
  console.log(
    JSON.stringify(
      {
        result: "PASS",
        browser: context.browser()?.version(),
        dashboardIndexSha256: createHash("sha256").update(html).digest("hex"),
        checks,
        uniqueFixtureOperations: operations.size,
        syncRequests: batches.length,
        limitations: [
          "Synthetic in-memory sync receiver; production server idempotency is separate evidence",
          "Browser process restart, not physical device reboot",
          "No photos, reassignment, quota eviction or provider calls tested",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error("FAIL:", error.stack);
  console.error(
    "Fixture counts:",
    JSON.stringify({
      batches: batches.length,
      operations: operations.size,
      batchSizes: batches.map((b) => b.length),
    }),
  );
  if (context) {
    const pages = context.pages();
    if (pages.length)
      console.error(
        (await pages.at(-1).locator("body").innerText()).slice(0, 3500),
      );
  }
  process.exitCode = 1;
} finally {
  await context?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(profile, { recursive: true, force: true });
}
