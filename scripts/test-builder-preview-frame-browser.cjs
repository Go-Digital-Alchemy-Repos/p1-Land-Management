const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const Module = require("node:module");
const core = path.resolve("platform/p1-core");
const { build } = require(core + "/node_modules/esbuild");
const express = require(core + "/node_modules/express");
const { chromium } = require(core + "/node_modules/@playwright/test");
const channel = "11111111-1111-4111-8111-111111111111";
async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
(async () => {
  const bundle = await build({
    entryPoints: [core + "/server/middleware/builder-preview.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    packages: "external",
    write: false,
  });
  const compiled = new Module(core + "/preview-policy-test.cjs");
  compiled.filename = core + "/preview-policy-test.cjs";
  compiled.paths = Module._nodeModulePaths(core);
  compiled._compile(bundle.outputFiles[0].text, compiled.filename);
  const { builderPreviewPolicy, builderPreviewHtml } = compiled.exports;
  const host = express(),
    preview = express();
  const parent = await listen(host),
    child = await listen(preview);
  let browser;
  try {
    preview.use(
      builderPreviewPolicy({
        NODE_ENV: "test",
        CORE_BUILDER_PREVIEW_ENABLED: "true",
        CORE_FEDERATION_ENABLED: "true",
        CORE_FEDERATION_ALLOW_SYNTHETIC_HTTP: "true",
        DASHBOARD_FEDERATION_ISSUER: parent.origin,
        APP_URL: child.origin,
        CORE_FEDERATION_CLIENT_ID: "preview-test",
        CORE_FEDERATION_CLIENT_SECRET_CURRENT: "s".repeat(43),
      }),
    );
    preview.use(
      "/admin",
      express.static(core + "/dist/public", { index: false }),
    );
    const template = await fs.readFile(
      core + "/dist/public/index.html",
      "utf8",
    );
    preview.get("/cms-preview/builder", (_req, res) =>
      res
        .type("html")
        .send(builderPreviewHtml(template, res.locals.builderPreviewOrigin)),
    );
    const requests = [];
    preview.use("/api", (req, res) => {
      requests.push({
        path: req.path,
        method: req.method,
        cookie: req.get("cookie"),
      });
      if (req.path === "/branding") return res.json({});
      if (req.path === "/events/recordings") return res.json([]);
      res.status(404).json({ message: "Unexpected preview request" });
    });
    host.get("/", (_req, res) =>
      res.type("html").send(`<!doctype html><html><body>
      <iframe title="Draft preview" sandbox="allow-scripts allow-same-origin" src="${child.origin}/cms-preview/builder#channel=${channel}" style="width:900px;height:600px"></iframe>
      <script>window.ready=false; window.addEventListener('message',function(event){
        if(event.origin===${JSON.stringify(child.origin)} && event.source===document.querySelector('iframe').contentWindow && event.data.type==='p1:builder-preview-ready') window.ready=true;
      });</script></body></html>`),
    );
    browser = await chromium.launch({
      headless: true,
      executablePath:
        process.env.CHROME_PATH ||
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    });
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "synthetic-session",
        value: "must-not-reach-api",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    await context.route("https://fonts.**/*", (route) => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(parent.origin);
    await page.waitForFunction(() => window.ready === true);
    async function send(revision, text) {
      await page.evaluate(
        ({ origin, channel, revision, text }) => {
          document.querySelector("iframe").contentWindow.postMessage(
            {
              type: "p1:builder-preview",
              version: 2,
              channel,
              revision,
              blocks: [
                {
                  id: "copy",
                  type: "raw-html",
                  props: {
                    html: `<p>${text}<img src="/missing" onerror="window.executed=true"></p><a href="/other">Link</a>`,
                  },
                },
                { id: "recordings", type: "video-archives", props: {} },
              ],
            },
            origin,
          );
        },
        { origin: child.origin, channel, revision, text },
      );
    }
    const recordingsResponse = page.waitForResponse(
      (response) => response.url() === child.origin + "/api/events/recordings",
    );
    await send(1, "Live draft text");
    const frame = page.frameLocator('iframe[title="Draft preview"]');
    await frame.getByText("Live draft text").waitFor();
    await frame.getByRole("heading", { name: "Video Archives" }).waitFor();
    assert.equal(await frame.locator("[onerror]").count(), 0);
    assert.equal(
      await frame
        .locator("[data-builder-preview-content]")
        .getAttribute("inert"),
      "",
    );
    await send(0, "Stale draft text");
    assert.equal(await frame.getByText("Stale draft text").count(), 0);
    await page.waitForFunction(() => document.querySelector("iframe") !== null);
    await recordingsResponse;
    assert.equal(
      await frame.locator("body").evaluate(async () => {
        try {
          await fetch("/api/forms/contact-form/submit", { method: "POST" });
          return false;
        } catch {
          return true;
        }
      }),
      true,
    );
    await page.evaluate(({origin,channel})=>{
      document.querySelector("iframe").contentWindow.postMessage({type:"p1:builder-preview",version:2,channel,revision:2,blocks:[],form:{name:"Unsaved estimate",slug:"unsaved-estimate",fields:[{id:"instructions",key:"instructions",label:"Instructions",type:"html",config:{htmlContent:'<p>Unsaved form instructions<img src="/missing" onerror="window.executed=true"></p>'}},{id:"email",key:"email",label:"Your email",type:"email",required:true}],settings:{submitButtonText:"Send preview"}}},origin);
    },{origin:child.origin,channel});
    await frame.getByText("Unsaved form instructions",{exact:true}).waitFor();
    assert.equal(await frame.locator('[onerror]').count(),0);
    await frame.locator('input[type="email"]').evaluate(input=>{input.value="synthetic@example.test";input.form.requestSubmit();});
    assert(!requests.some(request=>request.path.includes('/api/forms/')));
    assert(requests.some((request) => request.path === "/branding"));
    assert(
      requests.every((request) => request.method === "GET" && !request.cookie),
    );
    assert(
      !requests.some((request) =>
        /auth|setup|analytics|purchases/.test(request.path),
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Built cross-origin preview frame passed: renderer, handshake, sanitization, inert controls, anonymous reads",
    );
  } finally {
    await browser?.close();
    await Promise.all(
      [parent.server, child.server].map(
        (server) => new Promise((resolve) => server.close(resolve)),
      ),
    );
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
