import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ARTICLE_SLUGS,
  prepareArticle,
  prepareBlogImport,
} from "./prepare-blog-import.mjs";
const fixture = (
  slug = ARTICLE_SLUGS[0],
  body = '<p>Body &amp; detail <a href="/contact">Contact</a></p><h2>Section</h2><pre><code>x &lt; y</code></pre>',
) =>
  `<!doctype html><html><head><title>Exact SEO</title><meta name="description" content="Exact description"><link rel="canonical" href="https://www.p1landmanagement.com/blog/${slug}"><script type="application/ld+json">${JSON.stringify({ "@type": "Article", author: { "@type": "Organization", name: "P1" }, datePublished: "2026-06-24", dateModified: "2026-09-14" })}</script></head><body><main><article><section><img src="/assets/hero.webp" alt="Actual alt" srcset="/assets/hero-480.webp 480w"><div class="site-shell"><div><span>Eyebrow</span><h1>Title <em>emphasis</em></h1></div></div></section><section><div class="prose">${body}</div></section></article><aside><p>Review <a href="/services">services</a>.</p></aside></main><script id="p1-published-content" type="application/json">${JSON.stringify({ route: "/blog/" + slug, revision: 7, globalRevision: 2, content: { example: "resolved" } })}</script><script>document.querySelector('h1').textContent='Executed malicious script';fetch('https://example.invalid')</script></body></html>`;
test("preserves resolved text, links, hero/aside/schema metadata and does not execute scripts", () => {
  const a = prepareArticle(ARTICLE_SLUGS[0], fixture());
  assert.equal(a.editorial.title, "Title emphasis");
  assert.equal(a.source.hero.titleHtml, "Title <em>emphasis</em>");
  assert.equal(a.source.hero.imageAlt, "Actual alt");
  assert.match(a.editorial.content, /Review/);
  assert.equal(a.source.articleSchema.author["@type"], "Organization");
  assert.equal(a.declaredDates.historicallyVerified, false);
  assert.deepEqual(a.revisions, { page: 7, global: 2 });
  assert.equal(a.preservation.exactNormalizedContentMatch, true);
  assert.equal(a.preservation.before.links.length, 2);
  assert.match(a.htmlSha256, /^[a-f0-9]{64}$/);
});
test("reports destructive sanitizer differences instead of claiming parity", () => {
  const a = prepareArticle(
    ARTICLE_SLUGS[0],
    fixture(
      ARTICLE_SLUGS[0],
      '<h2>Keep</h2><table><tr><td>Cell A</td><td>Cell B</td></tr></table><a href="javascript:alert(1)">Unsafe</a>',
    ),
  );
  assert.equal(a.preservation.exactNormalizedContentMatch, false);
  assert(a.preservation.differences.includes("links"));
  assert(a.preservation.differences.includes("structure"));
  assert(!a.editorial.content.includes("javascript:"));
});
test("detects table and unsupported heading loss without unsafe-link side effects", () => {
  for (const body of [
    "<h5>Important subsection</h5>",
    "<table><tr><td>Rate</td><td>Area</td></tr></table>",
  ]) {
    const a = prepareArticle(ARTICLE_SLUGS[0], fixture(ARTICLE_SLUGS[0], body));
    assert.equal(a.preservation.exactNormalizedContentMatch, false);
    assert(a.preservation.differences.includes("structure"));
    assert.deepEqual(a.preservation.before.links, a.preservation.after.links);
  }
});
test("rejects wrong route, incomplete revisions, duplicate layout and oversized input", () => {
  assert.throws(() => prepareArticle("other", fixture()), /Unknown/);
  assert.throws(() => prepareArticle(ARTICLE_SLUGS[1], fixture()), /Canonical/);
  assert.throws(
    () =>
      prepareArticle(
        ARTICLE_SLUGS[0],
        fixture().replace('"revision":7', '"revision":-1'),
      ),
    /snapshot/,
  );
  assert.throws(
    () =>
      prepareArticle(
        ARTICLE_SLUGS[0],
        fixture().replace("</article>", "<h1>Duplicate</h1></article>"),
      ),
    /exactly one h1/,
  );
  assert.throws(
    () => prepareArticle(ARTICLE_SLUGS[0], "x".repeat(2 * 1024 * 1024 + 1)),
    /size/,
  );
});
test("whole bundle is deterministic, complete, read-only and changes fingerprint when captured content changes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "p1-blog-import-test-"));
  try {
    for (const slug of ARTICLE_SLUGS)
      await writeFile(join(dir, slug + ".html"), fixture(slug));
    const options = {
      inputDirectory: dir,
      sourceRevision: "a".repeat(40),
      deploymentId: "00000000-0000-0000-0000-000000000000",
    };
    const a = await prepareBlogImport(options),
      b = await prepareBlogImport(options);
    assert.deepEqual(a, b);
    assert.equal(a.canApply, false);
    assert.equal(a.summary.preserved, 5);
    await writeFile(
      join(dir, ARTICLE_SLUGS[0] + ".html"),
      fixture().replace("Body &amp;", "Changed &amp;"),
    );
    assert.notEqual(
      (await prepareBlogImport(options)).sourceFingerprint,
      a.sourceFingerprint,
    );
    await assert.rejects(
      prepareBlogImport({ ...options, sourceRevision: "main" }),
      /Exact observed/,
    );
    await rm(join(dir, ARTICLE_SLUGS[4] + ".html"));
    await assert.rejects(prepareBlogImport(options), /ENOENT/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
