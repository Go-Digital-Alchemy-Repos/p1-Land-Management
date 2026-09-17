const { chromium } = require(
  process.cwd() + "/platform/p1-core/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const listen = async (server) => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
};
(async () => {
  let child, browser;
  const upstream = http.createServer((req, res) => {
    if (req.url === "/api/p1/website-colors") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({schemaVersion:1,stackId:"p1-land-management",colors:{brand_primary_color:"#FF0000",text_h1_color:"#FF0000",text_h2_color:"#00FF00",text_link_color:"#0000FF",text_link_hover_color:"#FF0000"}}));
    } else if (req.url === "/api/p1/website-head-tags") {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          schemaVersion: 1,
          stackId: "p1-land-management",
          html: '<meta name="p1-head-browser" content="verified literal $&"><script>window.p1ForbiddenInline=true</script>',
        }),
      );
    } else if (req.url.startsWith("/api/client-site-content/")) {
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 404;
      res.end("{}");
    } else if (req.url === "/admin/") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        "<!doctype html><html><head><title>Synthetic admin</title></head><body>Admin fixture</body></html>",
      );
    } else {
      res.statusCode = 404;
      res.end("Synthetic unavailable");
    }
  });
  try {
    const sourcePort = await listen(upstream);
    const reservation = http.createServer();
    const port = await listen(reservation);
    await new Promise((r) => reservation.close(r));
    child = spawn(process.execPath, ["server/index.mjs"], {
      cwd: process.cwd() + "/artifacts/p1-website",
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(port),
        P1_CORE_ORIGIN: `http://127.0.0.1:${sourcePort}`,
        P1_CONTENT_CACHE_DIR: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Synthetic gateway startup timed out")),
        10000,
      );
      child.stdout.on("data", (data) => {
        if (String(data).includes("P1 website listening")) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.once("exit", () => {
        clearTimeout(timer);
        reject(Error("Synthetic gateway exited"));
      });
    });
    browser = await chromium.launch({
      headless: true,
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    // Block every non-loopback request; this rehearsal must not contact live services or vendors.
    await page.route("**/*", (route) =>
      new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue()
        : route.abort(),
    );
    await page.goto(`http://127.0.0.1:${port}/`, {
      waitUntil: "domcontentloaded",
    });
    assert.equal(
      await page
        .locator('head meta[name="p1-head-browser"]')
        .getAttribute("content"),
      "verified literal $&",
    );
    assert.equal(
      await page.evaluate(() => window.p1ForbiddenInline),
      undefined,
    );
    await page.waitForFunction(()=>{const h=document.querySelector("h1");return h && getComputedStyle(h).color === "rgb(255, 0, 0)";});
    assert.equal(await page.locator("html").evaluate(e=>getComputedStyle(e).getPropertyValue("--primary").trim()), "0 100% 50%");
    await page.goto(`http://127.0.0.1:${port}/service-areas/inman-sc`, {waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>{const h=document.querySelector("h1");return h && getComputedStyle(h).color === "rgb(255, 0, 0)";});
    await page.waitForFunction(()=>{const h=document.querySelector("h2");return h && getComputedStyle(h).color === "rgb(0, 255, 0)";});
    const link=page.locator(".public-link").first();
    assert.equal(await link.evaluate(e=>getComputedStyle(e).color), "rgb(0, 0, 255)");
    await link.hover();assert.equal(await link.evaluate(e=>getComputedStyle(e).color), "rgb(255, 0, 0)");
    await page.goto(`http://127.0.0.1:${port}/?cmsPreview=1`, {
      waitUntil: "domcontentloaded",
    });
    assert.equal(await page.locator('meta[name="p1-head-browser"]').count(), 0);
    assert.equal(await page.locator("#p1-website-colors").count(), 1);
    await page.waitForFunction(()=>{const h=document.querySelector("h1");return h && getComputedStyle(h).color === "rgb(255, 0, 0)";});
    await page.goto(`http://127.0.0.1:${port}/admin/`, {
      waitUntil: "domcontentloaded",
    });
    assert.equal(await page.locator('meta[name="p1-head-browser"]').count(), 0);
    assert.equal(await page.locator("#p1-website-colors").count(), 0);
    console.log(
      "Public branding browser passed: palette computed on home/location/preview, link hover, admin exclusion, head metadata, inline CSP blocking and external networking blocked.",
    );
  } finally {
    if (browser) await browser.close();
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
    await new Promise((r) => upstream.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
