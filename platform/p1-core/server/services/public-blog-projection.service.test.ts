import type { BlogPresentation } from "@shared/blog-presentation";
import { blogEditorialSchema } from "@shared/schema/blog-publications";
import { describe, it, expect } from "vitest";
import {
  projectPublicBlog,
  PublicBlogCapacityError,
  type PublishedBlogRow,
} from "./public-blog-projection.service";
import { STATIC_BLOG_SLUGS } from "@shared/public-blog";
const fixturePresentation = (): BlogPresentation => ({
  schemaVersion: 1,
  layout: "editorial",
  eyebrow: "Land care",
  titleParts: [
    { text: "Public ", emphasis: false },
    { text: "title", emphasis: true },
  ],
  imageAlt: "Large acreage",
  relatedContent: '<p><a href="/services/land-clearing">Land clearing</a></p>',
  structuredData: {
    type: "Article",
    headline: "Public title",
    description: "Practical land advice",
    authorType: "Organization",
    publishedDate: "2026-06-24",
    modifiedDate: "2026-09-14",
  },
});
const row = (): PublishedBlogRow => ({
  id: "post",
  revisionId: "revision",
  generation: 1,
  publishedAt: new Date("2026-09-19T12:00:00Z"),
  modifiedAt: new Date("2026-09-19T12:00:00Z"),
  snapshot: {
    title: "Public title",
    slug: "new-article",
    excerpt: null,
    content: "<p>Public body</p>",
    authorName: "Author",
    coverImageUrl: null,
    coverImagePositionX: null,
    coverImagePositionY: null,
    category: null,
    categories: null,
    tags: null,
    postType: null,
    podcastUrl: null,
    externalUrl: null,
    sidebarId: "private-sidebar",
    seoTitle: null,
    seoDescription: null,
    ogImageUrl: null,
    noindex: false,
  },
});
describe("public Blog projection", () => {
  it("preserves optional metadata, sanitizes related links, and keeps old snapshots absent", () => {
    const original = row();
    const old = projectPublicBlog([original]);
    expect(old.posts[0].snapshot).not.toHaveProperty("presentation");
    expect(blogEditorialSchema.parse(original.snapshot)).not.toHaveProperty("presentation");
    original.snapshot.presentation = undefined;
    expect(projectPublicBlog([original]).revision).toBe(old.revision);
    original.snapshot.presentation = null;
    expect(projectPublicBlog([original]).posts[0].snapshot.presentation).toBeNull();
    original.snapshot.presentation = fixturePresentation();
    original.snapshot.presentation.relatedContent =
      '<p onclick="bad()">Related <a href="javascript:bad()">service</a></p><script>bad()</script>';
    const projected = projectPublicBlog([original]).posts[0].snapshot.presentation!;
    expect(projected.structuredData.authorType).toBe("Organization");
    expect(projected.structuredData.publishedDate).toBe("2026-06-24");
    expect(projected.relatedContent).not.toMatch(/script|onclick|javascript/);
    expect(original.snapshot.presentation.relatedContent).toContain("onclick");
  });
  it("rejects unsafe presentation contracts and related images before publishing", () => {
    const original = row();
    original.snapshot.presentation = fixturePresentation();
    original.snapshot.presentation.relatedContent = '<p><img src="/r2/cms/image.webp"></p>';
    expect(() => projectPublicBlog([original])).toThrow("does not support images");
    original.snapshot.presentation = fixturePresentation();
    original.snapshot.presentation.titleParts = [{ text: "Mismatched", emphasis: false }];
    expect(() => projectPublicBlog([original])).toThrow("Invalid Blog presentation");
    expect(() => blogEditorialSchema.parse(original.snapshot)).toThrow();
  });
  it("allowlists immutable public fields and emits deterministic authoritative emptiness", () => {
    const data = projectPublicBlog([{ ...row(), privateSecret: "secret" } as PublishedBlogRow]);
    expect(data.posts[0].snapshot).not.toHaveProperty("sidebarId");
    expect(JSON.stringify(data)).not.toContain("secret");
    expect(data).toEqual(projectPublicBlog([row()]));
    expect(projectPublicBlog([]).posts).toEqual([]);
  });
  it("permits an imported route only for its immutable owner", () => {
    const imported = row();
    imported.snapshot.slug = STATIC_BLOG_SLUGS[0];
    const ownership = [{ slug: imported.snapshot.slug, postId: imported.id }];
    expect(projectPublicBlog([imported], ownership).posts).toHaveLength(1);
    expect(() => projectPublicBlog([{ ...imported, id: "foreign" }], ownership)).toThrow();
    expect(projectPublicBlog([], ownership).staticRoutes).toEqual(ownership);
    imported.snapshot.slug = "renamed-article";
    expect(projectPublicBlog([imported], ownership).staticRoutes).toEqual(ownership);
    expect(projectPublicBlog([], ownership).revision).not.toBe(projectPublicBlog([]).revision);
  });
  it("rejects malformed or ambiguous ownership and hashes stable order", () => {
    const first = { slug: STATIC_BLOG_SLUGS[0], postId: "first" };
    const second = { slug: STATIC_BLOG_SLUGS[1], postId: "second" };
    expect(projectPublicBlog([], [first, second])).toEqual(projectPublicBlog([], [second, first]));
    for (const bad of [
      [{ ...first, slug: "not-static" }],
      [first, first],
      [first, { ...second, postId: first.postId }],
      [{ ...first, actorId: "private" }],
      [{ ...first, postId: "" }],
      [{ ...first, postId: "x".repeat(201) }],
    ])
      expect(() => projectPublicBlog([], bad)).toThrow();
  });
  it("sanitizes active HTML and keeps only CSP-compatible images and safe ordinary links", () => {
    const x = row();
    x.snapshot.content =
      '<script>alert(1)</script><p onclick="evil()">Text<img src="https://evil.test/image"><img src="/r2/image" onerror="evil()"><a href="javascript:evil()" target="bad">link</a></p>';
    x.snapshot.coverImageUrl = "https://evil.test/image";
    x.snapshot.ogImageUrl = "https://www.p1landmanagement.com/r2/cover";
    x.snapshot.externalUrl = "javascript:evil()";
    const s = projectPublicBlog([x]).posts[0].snapshot;
    expect(s.content).not.toMatch(/script|onclick|onerror|evil/);
    expect(s.content).toContain("/r2/image");
    expect(s.coverImageUrl).toBeNull();
    expect(s.ogImageUrl).toBe("/r2/cover");
    expect(s.externalUrl).toBeNull();
  });
  it("rejects reserved routes, duplicate slugs and unsupported sizes without truncation", () => {
    const x = row();
    x.snapshot.slug = "signs-property-drainage-problem";
    expect(() => projectPublicBlog([x])).toThrow(PublicBlogCapacityError);
    expect(() => projectPublicBlog([row(), { ...row(), id: "other" }])).toThrow();
    x.snapshot.slug = "new-article";
    x.snapshot.content = "<p>" + "é".repeat(140000) + "</p>";
    expect(() => projectPublicBlog([x])).toThrow();
    expect(() =>
      projectPublicBlog(
        Array.from({ length: 1001 }, (_, i) => ({
          ...row(),
          id: String(i),
          snapshot: { ...row().snapshot, slug: `article-${i}` },
        })),
      ),
    ).toThrow(/Too many/);
  });
  it("emits markup accepted by the identical website validator", async () => {
    const { parsePublicBlog } =
      await import("../../../../artifacts/p1-website/server/website-blog.mjs");
    const { safePublishedHtml, publicBlogListing } = await import("@shared/public-blog");
    const x = row();
    x.snapshot.content =
      '<p style="text-align: center">Text<br></p><blockquote><strong>Quote</strong></blockquote><a href="https://example.test/?x=1&amp;y=2" target="_blank">Link</a><a href="mailto:miles@example.test">Mail</a><a href="mailto:bad address@example.test">Invalid</a><img src="/r2/image?x=1&amp;y=2" alt="A &quot;photo&quot;" class="cms-richtext-media cms-richtext-media-left" data-align="left">';
    const result = projectPublicBlog([x]);
    expect(parsePublicBlog(result, safePublishedHtml, publicBlogListing)).toEqual(result);
    expect(result.posts[0].snapshot.content).toContain("mailto:miles@example.test");
    expect(result.posts[0].snapshot.content).not.toContain("bad address");
  });
  it("preserves editor code, dividers and heading structure without active attributes", async () => {
    const { parsePublicBlog } =
      await import("../../../../artifacts/p1-website/server/website-blog.mjs");
    const { safePublishedHtml, publicBlogListing } = await import("@shared/public-blog");
    const x = row();
    x.snapshot.content =
      '<h1 style="text-align:center" onclick="evil()">Section</h1><p>Use <code class="evil" onclick="evil()">x &lt; y</code>.</p><pre style="background:url(https://evil.test)"><code>&lt;script&gt;example&lt;/script&gt;\nsecond line</code></pre><hr onload="evil()">';
    const result = projectPublicBlog([x]);
    expect(result.posts[0].snapshot.content).toContain(
      '<h2 style="text-align:center">Section</h2>',
    );
    expect(result.posts[0].snapshot.content).toContain("<code>x &lt; y</code>");
    expect(result.posts[0].snapshot.content).toContain(
      "<pre><code>&lt;script&gt;example&lt;/script&gt;\nsecond line</code></pre>",
    );
    expect(result.posts[0].snapshot.content).toContain("<hr />");
    expect(result.posts[0].snapshot.content).not.toMatch(/onclick|onload|background|evil/);
    expect(parsePublicBlog(result, safePublishedHtml, publicBlogListing)).toEqual(result);
  });
  it("bounds listing summaries without truncating article titles or persisted excerpts", () => {
    const rows = Array.from({ length: 200 }, (_, i) => ({
      ...row(),
      id: String(i),
      snapshot: { ...row().snapshot, slug: `post-${i}`, title: "x".repeat(2000) },
    }));
    expect(() => projectPublicBlog(rows)).toThrow(/listing exceeds/);
  });
  it("bounds aggregate bytes and validates visible content and image positions", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      ...row(),
      id: String(i),
      snapshot: {
        ...row().snapshot,
        slug: `article-${i}`,
        content: "<p>" + "x".repeat(240000) + "</p>",
      },
    }));
    expect(() => projectPublicBlog(rows)).toThrow(/index exceeds/);
    const x = row();
    x.snapshot.content = "";
    expect(() => projectPublicBlog([x])).toThrow(/require content/);
    x.snapshot.externalUrl = "https://example.com/story";
    expect(projectPublicBlog([x]).posts).toHaveLength(1);
    x.snapshot.coverImagePositionX = NaN;
    expect(() => projectPublicBlog([x])).toThrow(/positions/);
  });
});
