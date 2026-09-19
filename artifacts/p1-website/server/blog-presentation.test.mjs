import test from "node:test";
import assert from "node:assert/strict";
import { render } from "../dist/server/entry-server.js";
import { validateBlogPresentation } from "../../../platform/p1-core/shared/blog-presentation.ts";
import {
  safePublishedHtml,
  publicBlogListing,
} from "../../../platform/p1-core/shared/public-blog.ts";
import { parsePublicBlog } from "./website-blog.mjs";
const presentation = () => ({
  schemaVersion: 1,
  layout: "editorial",
  eyebrow: "Field notes",
  titleParts: [
    { text: "Land ", emphasis: false },
    { text: "& water", emphasis: true },
  ],
  imageAlt: "A managed field",
  relatedContent: '<p>Related <a href="/services">services</a></p>',
  structuredData: {
    type: "Article",
    headline: "Land & water",
    description: "Source description",
    authorType: "Organization",
    publishedDate: "2026-06-24",
    modifiedDate: "2026-09-14",
  },
});
const publication = () => ({
  schemaVersion: 2,
  stackId: "p1-land-management",
  revision: "a".repeat(64),
  staticRoutes: [],
  posts: [
    {
      id: "fixture",
      revisionId: "revision",
      generation: 1,
      publishedAt: "2026-09-19T12:00:00.000Z",
      modifiedAt: "2026-09-19T12:00:00.000Z",
      snapshot: {
        title: "Land & water",
        slug: "editorial-fixture",
        excerpt: "Excerpt",
        content: "<h2>Body heading</h2><p>Source body.</p>",
        authorName: "P1 Land & Property Management",
        coverImageUrl: "/r2/cover.webp",
        coverImagePositionX: 20,
        coverImagePositionY: 80,
        category: null,
        categories: [],
        tags: [],
        postType: "article",
        podcastUrl: null,
        externalUrl: null,
        seoTitle: null,
        seoDescription: null,
        ogImageUrl: null,
        noindex: false,
        presentation: presentation(),
      },
    },
  ],
});
const parse = (value) =>
  parsePublicBlog(
    value,
    safePublishedHtml,
    publicBlogListing,
    validateBlogPresentation,
  );
const ssr = (data) =>
  render("/blog/editorial-fixture", {
    route: "/blog/editorial-fixture",
    content: {},
    global: {},
    blog: { revision: data.revision, staticRoutes: [], posts: data.posts },
  });
test("editorial SSR preserves one hero H1, emphasis, body/aside order and source date precision", () => {
  const data = parse(publication());
  const result = ssr(data);
  assert.equal((result.html.match(/<h1\b/g) || []).length, 1);
  assert.match(result.html, /<em[^>]*text-tan[^>]*>\&amp; Water<\/em>/);
  assert.match(result.html, /alt="A managed field"/);
  assert.match(result.html, /object-position:20% 80%/);
  assert.match(result.html, /class="pb-24"/);
  assert.match(result.html, /class="py-16 bg-background"/);
  assert.ok(
    result.html.indexOf("Source body.") <
      result.html.indexOf('<aside class="site-shell pb-12 text-lg'),
  );
  const head = JSON.stringify(result.head);
  assert.match(head, /2026-06-24/);
  assert.match(head, /2026-09-14/);
  assert.doesNotMatch(head, /2026-09-19T12/);
  assert.match(head, /Organization/);
  assert.match(head, /#business/);
  assert.match(head, /publisher/);
});
test("plain absent and explicit null presentation keep existing article renderer and publication dates", () => {
  for (const value of [undefined, null]) {
    const data = publication();
    if (value === undefined) delete data.posts[0].snapshot.presentation;
    else data.posts[0].snapshot.presentation = value;
    const result = ssr(parse(data));
    assert.match(result.html, /site-shell py-16/);
    assert.doesNotMatch(result.html, /Field notes/);
    assert.match(JSON.stringify(result.head), /2026-09-19T12:00:00.000Z/);
  }
});
test("metadata null dates fall back to publication times and Person uses only declared name", () => {
  const data = publication();
  Object.assign(data.posts[0].snapshot.presentation.structuredData, {
    publishedDate: null,
    modifiedDate: null,
    authorType: "Person",
  });
  const result = ssr(parse(data));
  assert.match(JSON.stringify(result.head), /2026-09-19T12:00:00.000Z/);
  assert.match(JSON.stringify(result.head), /Person/);
});
test("reject unsafe related markup, arbitrary metadata, invalid dates and mismatched hero titles", () => {
  for (const mutate of [
    (p) => (p.relatedContent = "<script>alert(1)</script>"),
    (p) => (p.relatedContent = '<img src="/r2/image.webp" />'),
    (p) => (p.relatedContent = '<a href="javascript:alert(1)">bad</a>'),
    (p) => (p.structuredData.url = "https://evil.test"),
    (p) => (p.structuredData.publishedDate = "2026-02-30"),
    (p) => (p.structuredData.modifiedDate = "2025-01-01"),
    (p) => (p.titleParts[0].text = "Different "),
    (p) => (p.structuredData.authorType = "Script"),
  ]) {
    const data = publication();
    mutate(data.posts[0].snapshot.presentation);
    assert.throws(() => parse(data));
  }
});
test("hero text is escaped React text, never interpreted as markup", () => {
  const data = publication();
  data.posts[0].snapshot.title = "<script>plain title</script>";
  data.posts[0].snapshot.presentation.titleParts = [
    { text: data.posts[0].snapshot.title, emphasis: true },
  ];
  const result = ssr(parse(data));
  assert.match(result.html, /&lt;script&gt;plain title&lt;\/script&gt;/i);
  assert.doesNotMatch(result.html, /<script>plain title/);
});

test("another declared organization does not inherit P1 identity", () => {
  const data = publication();
  data.posts[0].snapshot.authorName = "Other Organization";
  const result = ssr(parse(data));
  const author = result.head.jsonLd.author;
  assert.deepEqual(author, {
    "@type": "Organization",
    name: "Other Organization",
  });
  assert.match(JSON.stringify(result.head.jsonLd.publisher), /#business/);
});
