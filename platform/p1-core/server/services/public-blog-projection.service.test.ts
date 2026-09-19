import { describe, it, expect } from "vitest";
import {
  projectPublicBlog,
  PublicBlogCapacityError,
  type PublishedBlogRow,
} from "./public-blog-projection.service";
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
  it("allowlists immutable public fields and emits deterministic authoritative emptiness", () => {
    const data = projectPublicBlog([{ ...row(), privateSecret: "secret" } as PublishedBlogRow]);
    expect(data.posts[0].snapshot).not.toHaveProperty("sidebarId");
    expect(JSON.stringify(data)).not.toContain("secret");
    expect(data).toEqual(projectPublicBlog([row()]));
    expect(projectPublicBlog([]).posts).toEqual([]);
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
