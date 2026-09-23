// Reproducible, synthetic-only WP5 browser smoke. Run after dependencies are installed.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(path.join(root, "platform/p1-core/package.json"));
const { chromium } = require("playwright");
const port = Number(process.env.P1_WP5_BROWSER_PORT || 5191);
const origin = `http://127.0.0.1:${port}`;
const chrome = process.env.P1_CHROME_PATH ||
  (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined);
const output = mkdtempSync(path.join(tmpdir(), "p1-wp5-browser-"));
const server = spawn("pnpm", ["--filter", "@workspace/p1-dashboard", "exec", "vite",
  "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: root, stdio: "pipe" });

async function ready() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error("Dashboard preview server stopped before readiness");
    try { if ((await fetch(origin)).ok) return; } catch { /* waiting for Vite */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Dashboard preview server did not become ready");
}
function fixture(role) {
  const userId = role === "crew" ? "00000000-0000-4000-8000-000000000002" : "00000000-0000-4000-8000-000000000001";
  const workId = "00000000-0000-4000-8000-000000000003";
  return { userId, workId, async route(request) {
    const url = new URL(request.request().url());
    let body = [];
    if (url.pathname === "/api/v1/setup") body = { initialized: true };
    else if (url.pathname === "/api/v1/me") body = {
      id: userId, name: role === "crew" ? "Test Crew" : "Test Owner",
      email: `${role}@example.test`, role, capabilities: [], twoFactorEnabled: false,
      features: { quickbooks: false },
    };
    else if (url.pathname === "/api/v1/work-orders") body = role === "crew" ? [{
      id: workId, version: 1, title: "Synthetic grounds visit", property_name: "Synthetic property",
      property_id: "00000000-0000-4000-8000-000000000004",
      status: "scheduled", scheduled_at: new Date().toISOString(), assigned_to: userId,
    }] : [];
    else if (url.pathname === "/api/v1/overview/needs-you") body =
      [{ kind: "new-inquiries", count: 2, href: "/sales?status=new" }];
    else if (url.pathname === "/api/v1/search") body =
      [{ kind: "property", id: "00000000-0000-4000-8000-000000000004",
        title: "Synthetic property", subtitle: "Example Road",
        href: "/properties/00000000-0000-4000-8000-000000000004" }];
    else if (url.pathname === "/api/v1/field/conflicts") body = { items: [], hasMore: false };
    else if (url.pathname === "/api/v1/assessment-availability") body = { config: null, blackouts: [] };
    await request.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  }};
}
async function addPendingPhoto(page, userId, workId) {
  await page.evaluate(async ({ userId, workId }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("p1-field-" + userId, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").put({
        id: "synthetic-photo", workOrderId: workId,
        propertyId: "00000000-0000-4000-8000-000000000004",
        classification: "work", blob: new Blob(["test"], { type: "image/jpeg" }),
      });
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, { userId, workId });
}
let browser;
try {
  await ready();
  browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
  const owner = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const ownerPage = await owner.newPage();
  ownerPage.on("pageerror", (error) => console.error("Owner page error:", error.stack));
  const ownerFixture = fixture("owner");
  await ownerPage.route("**/api/v1/**", (route) => ownerFixture.route(route));
  await ownerPage.goto(origin + "/", { waitUntil: "networkidle" });
  assert.equal(await ownerPage.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  await ownerPage.getByText("2 new commercial inquiries").waitFor();
  await ownerPage.screenshot({ path: path.join(output, "overview-375.png"), fullPage: true });
  await ownerPage.getByRole("link", { name: /Scheduled work:.*Open list/ }).click();
  assert.match(ownerPage.url(), /\/schedule\?status=scheduled$/);
  await ownerPage.goBack();
  assert.equal(ownerPage.url(), origin + "/");
  await ownerPage.getByRole("heading", { name: "A clear view of the day." }).waitFor({ timeout: 5000 });
  await ownerPage.getByRole("button", { name: "Search workspace" }).click();
  await ownerPage.screenshot({ path: path.join(output, "search-375.png"), fullPage: true });
  await ownerPage.getByRole("combobox", { name: "Search clients, properties and work" }).fill("Synthetic");
  await ownerPage.getByRole("option", { name: /Synthetic property/ }).waitFor();
  await ownerPage.keyboard.press("ArrowDown");
  await ownerPage.keyboard.press("Enter");
  assert.match(ownerPage.url(), /\/properties\/00000000-0000-4000-8000-000000000004$/);
  await owner.close();

  const crew = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const crewPage = await crew.newPage();
  const crewFixture = fixture("crew");
  await crewPage.route("**/api/v1/**", (route) => crewFixture.route(route));
  await crewPage.goto(origin + "/my-day", { waitUntil: "networkidle" });
  await crewPage.getByText(/Today's work is saved on this phone/).waitFor();
  assert.equal(await crewPage.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  await crewPage.screenshot({ path: path.join(output, "my-day-online-375.png"), fullPage: true });
  await crew.setOffline(true);
  await crewPage.evaluate(() => window.dispatchEvent(new Event("offline")));
  assert.match(await crewPage.locator(".connection").getAttribute("class"), /offline/);
  await crewPage.screenshot({ path: path.join(output, "my-day-offline-375.png"), fullPage: true });
  await crew.setOffline(false);
  await crewPage.evaluate(() => window.dispatchEvent(new Event("online")));
  await crewPage.getByText(/Today's work is saved on this phone/).waitFor();
  await addPendingPhoto(crewPage, crewFixture.userId, crewFixture.workId);
  await crewPage.route("**/api/v1/files/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"synthetic_failure"}' });
  });
  await crewPage.evaluate(() => window.dispatchEvent(new Event("online")));
  await crewPage.getByText("Uploading field work…").waitFor({ timeout: 10000 });
  await crewPage.screenshot({ path: path.join(output, "my-day-syncing-375.png"), fullPage: true });
  await crewPage.getByText("Upload failed for 1 photo. Tap Sync now to retry.").waitFor({ timeout: 10000 });
  await crewPage.screenshot({ path: path.join(output, "my-day-failed-375.png"), fullPage: true });
  await crew.close();
  console.log("WP5 375px browser smoke passed; synthetic screenshots:", output);
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
