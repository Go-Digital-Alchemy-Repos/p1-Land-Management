const assert = require("node:assert/strict");
const path = require("node:path");
const core = path.resolve("platform/p1-core");
const { build } = require(core + "/node_modules/esbuild");
const { chromium } = require(core + "/node_modules/@playwright/test");

(async () => {
  // Exercise the real sanitizer in a browser bundle, including its CSS parser.
  // No Core server, account, live API or persisted content is involved.
  const bundle = await build({
    entryPoints: [core + "/shared/cms-builder/sanitize-preview.ts"],
    bundle: true,
    platform: "browser",
    format: "iife",
    globalName: "previewSanitizer",
    write: false,
  });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", (route) => route.abort());
    await page.setContent('<div id="preview"></div>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const result = await page.evaluate(() => {
      const blocks = [
        {
          id: "test",
          type: "content",
          props: {
            content:
              '<p style="text-align:center;position:fixed" onclick="window.executed=true">Formatted <strong>draft</strong><img src="/missing" onerror="window.executed=true"><script>window.executed=true</script></p>',
            subtitle: '<svg onload="window.executed=true"></svg>Subtitle',
          },
        },
      ];
      const source = JSON.stringify(blocks);
      const sanitized = previewSanitizer.sanitizeBuilderPreviewBlocks(blocks);
      document.getElementById("preview").innerHTML =
        sanitized[0].props.content + sanitized[0].props.subtitle;
      return {
        unchanged: source === JSON.stringify(blocks),
        html: document.getElementById("preview").innerHTML,
        alignment: document.querySelector("p").style.textAlign,
        position: document.querySelector("p").style.position,
      };
    });
    assert.equal(result.unchanged, true);
    assert.equal(result.alignment, "center");
    assert.equal(result.position, "");
    assert.match(result.html, /<strong>draft<\/strong>/);
    assert.doesNotMatch(result.html, /script|onerror|onclick|onload|<svg/);
    await page.locator("p").click();
    assert.equal(await page.evaluate(() => window.executed), undefined);
    assert.deepEqual(errors, []);
    console.log("Builder preview browser sanitization passed");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
