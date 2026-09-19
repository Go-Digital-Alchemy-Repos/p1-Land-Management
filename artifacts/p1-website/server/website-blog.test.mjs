import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  safePublishedHtml,
  publicBlogListing,
} from "../../../platform/p1-core/shared/public-blog.ts";
import { parsePublicBlog, createWebsiteBlogStore } from "./website-blog.mjs";
export const fixture = () => ({
  schemaVersion: 2,
  staticRoutes: [],
  stackId: "p1-land-management",
  revision: "a".repeat(64),
  posts: [
    {
      id: "test-post",
      revisionId: "test-revision",
      generation: 1,
      publishedAt: "2026-09-01T12:00:00.000Z",
      modifiedAt: "2026-09-19T12:00:00.000Z",
      snapshot: {
        title: "Published fixture article",
        slug: "fixture-article",
        excerpt: "Published excerpt",
        content: "<p>Published body</p>",
        authorName: "P1",
        coverImageUrl: "/r2/cover.webp",
        coverImagePositionX: 20,
        coverImagePositionY: 80,
        category: null,
        categories: [],
        tags: [],
        postType: "article",
        podcastUrl: null,
        externalUrl: null,
        seoTitle: "Published fixture SEO",
        seoDescription: "Published SEO description",
        ogImageUrl: null,
        noindex: false,
      },
    },
  ],
});
const parse = (data) =>
  parsePublicBlog(data, safePublishedHtml, publicBlogListing);
const response = (data) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });
test("strict parser rejects private fields, reserved routes, unsafe HTML/media and wrong dates", () => {
  assert.equal(parse(fixture()).posts.length, 1);
  for (const change of [
    (d) => (d.posts[0].draft = "secret"),
    (d) => (d.posts[0].snapshot.sidebarId = "private"),
    (d) =>
      (d.posts[0].snapshot.content = '<img src="/r2/x" onerror="alert(1)">'),
    (d) => (d.posts[0].snapshot.content = "<scr<script>ipt>alert(1)</script>"),
    (d) => (d.posts[0].snapshot.coverImageUrl = "//evil.test/x"),
    (d) => (d.posts[0].snapshot.slug = "signs-property-drainage-problem"),
    (d) => (d.posts[0].modifiedAt = "2020-01-01"),
    (d) => d.posts.push(d.posts[0]),
  ]) {
    const d = fixture();
    change(d);
    assert.throws(() => parse(d));
  }
  assert.throws(() => parsePublicBlog(fixture()));
});
test("shared normalized HTML grammar handles encoded ampersands and original editor markup", () => {
  for (const html of [
    '<p style="text-align:center">Centered<br />text</p>',
    "<blockquote><strong>Quote</strong></blockquote>",
    "<h2>Section</h2><p><code>x &lt; y</code></p><pre><code>line one\nline two</code></pre><hr />",
    '<a href="https://example.test/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">Link</a>',
    '<a href="mailto:miles@example.test">Mail</a>',
    '<img src="/r2/a?x=1&amp;y=2" alt="A &quot;photo&quot;" data-align="left" class="cms-richtext-media cms-richtext-media-left" />',
  ])
    assert.equal(safePublishedHtml(html), true, html);
  for (const html of [
    '<a href="javascript&#58;alert(1)">Bad</a>',
    '<a href="mailto:bad address@example.test">Bad</a>',
    '<p style="background:url(javascript:alert(1))">Bad</p>',
    '<img src="/x"/onerror="alert(1)">',
    '<code onclick="evil()">Bad</code>',
    '<pre style="background:url(https://evil.test)">Bad</pre>',
    '<hr onload="evil()" />',
  ])
    assert.equal(safePublishedHtml(html), false, html);
});
test("30s cache, bounded transport and malformed responses retain last-valid; empty withdraws atomically", async () => {
  let time = 0,
    calls = 0,
    next = fixture();
  const store = createWebsiteBlogStore({
    origin: "https://core.test",
    cacheDir: "",
    now: () => time,
    validateHtml: safePublishedHtml,
    projectListing: publicBlogListing,
    fetcher: async (url, options) => {
      calls++;
      assert.equal(url, "https://core.test/api/website/blog-publication");
      assert.equal(options.redirect, "error");
      assert.deepEqual(options.headers, { Accept: "application/json" });
      return response(next);
    },
  });
  assert.equal((await store.snapshot()).posts.length, 1);
  time = 29999;
  await store.snapshot();
  assert.equal(calls, 1);
  time = 30000;
  next = { ...fixture(), private: "not allowed" };
  assert.equal((await store.snapshot()).posts.length, 1);
  time = 60000;
  next = { ...fixture(), posts: [] };
  assert.equal((await store.snapshot()).posts.length, 0);
  time = 90000;
  next = { bad: true };
  assert.equal((await store.snapshot()).posts.length, 0);
});
test("restart preserves validated last public data during outage, including durable withdrawal", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "p1-blog-cache-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const opts = {
    origin: "https://core.test",
    cacheDir: dir,
    validateHtml: safePublishedHtml,
    projectListing: publicBlogListing,
  };
  await createWebsiteBlogStore({
    ...opts,
    fetcher: async () => response(fixture()),
  }).snapshot();
  assert.equal(
    (
      await createWebsiteBlogStore({
        ...opts,
        fetcher: async () => {
          throw Error("offline");
        },
      }).snapshot()
    ).posts.length,
    1,
  );
  await createWebsiteBlogStore({
    ...opts,
    fetcher: async () => response({ ...fixture(), posts: [] }),
  }).snapshot();
  assert.equal(
    (
      await createWebsiteBlogStore({
        ...opts,
        fetcher: async () => {
          throw Error("offline");
        },
      }).snapshot()
    ).posts.length,
    0,
  );
});
test("oversized UTF8 transport and redirect responses cannot replace last-valid", async () => {
  let mode = "valid";
  const store = createWebsiteBlogStore({
    origin: "https://core.test",
    cacheDir: "",
    validateHtml: safePublishedHtml,
    projectListing: publicBlogListing,
    fetcher: async () =>
      mode === "valid"
        ? response(fixture())
        : mode === "large"
          ? new Response("é".repeat(2100000), {
              headers: { "content-type": "application/json" },
            })
          : new Response("", {
              status: 302,
              headers: { location: "https://evil.test" },
            }),
  });
  await store.snapshot();
  for (const next of ["large", "redirect"]) {
    mode = next;
    store.invalidate();
    assert.equal((await store.snapshot()).posts.length, 1);
  }
});

test("v2 ownership is allowlisted, unique, and required for reserved published slugs", () => {
  const slug = "signs-property-drainage-problem";
  const owned = fixture();
  owned.staticRoutes = [{ slug, postId: owned.posts[0].id }];
  owned.posts[0].snapshot.slug = slug;
  assert.equal(parse(owned).posts.length, 1);
  for (const transform of [
    (data) => (data.schemaVersion = 1),
    (data) => delete data.staticRoutes,
    (data) => (data.staticRoutes[0].slug = "invented"),
    (data) => data.staticRoutes.push(data.staticRoutes[0]),
    (data) => (data.staticRoutes[0].postId = "other"),
    (data) => (data.staticRoutes[0].secret = "private"),
    (data) =>
      data.staticRoutes.push({
        slug: "best-grass-large-acreage-carolinas",
        postId: data.posts[0].id,
      }),
  ]) {
    const changed = structuredClone(owned);
    transform(changed);
    assert.throws(() => parse(changed));
  }
});
test("cold cache outages and stale v1 cache never mean unowned", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "p1-blog-ownership-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const { writeFile } = await import("node:fs/promises");
  const old = fixture();
  old.schemaVersion = 1;
  delete old.staticRoutes;
  await writeFile(join(dir, "website-blog-v1.json"), JSON.stringify(old));
  await writeFile(join(dir, "website-blog-v2.json"), JSON.stringify(old));
  const store = createWebsiteBlogStore({
    origin: "https://core.test",
    cacheDir: dir,
    validateHtml: safePublishedHtml,
    projectListing: publicBlogListing,
    fetcher: async () => {
      throw Error("outage");
    },
  });
  assert.equal(await store.snapshot(), null);
  store.invalidate();
  assert.equal(await store.snapshot(), null);
});
test("observed permanent ownership survives withdrawals, downgrades, remaps and restart", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "p1-blog-permanent-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const ownership = [
    { slug: "signs-property-drainage-problem", postId: "test-post" },
  ];
  let next = { ...fixture(), staticRoutes: ownership };
  const opts = {
    origin: "https://core.test",
    cacheDir: dir,
    validateHtml: safePublishedHtml,
    projectListing: publicBlogListing,
    fetcher: async () => response(next),
  };
  const store = createWebsiteBlogStore(opts);
  await store.snapshot();
  next = { ...next, posts: [] };
  store.invalidate();
  assert.equal((await store.snapshot()).posts.length, 0);
  for (const invalid of [
    { ...next, staticRoutes: [] },
    { ...next, staticRoutes: [{ ...ownership[0], postId: "other" }] },
    { ...next, schemaVersion: 1 },
  ]) {
    next = invalid;
    store.invalidate();
    assert.deepEqual((await store.snapshot()).staticRoutes, ownership);
  }
  next = fixture();
  const restarted = createWebsiteBlogStore(opts);
  assert.deepEqual((await restarted.snapshot()).staticRoutes, ownership);
  assert.equal((await restarted.snapshot()).posts.length, 0);
});
