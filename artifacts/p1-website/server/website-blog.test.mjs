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
  schemaVersion: 1,
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
