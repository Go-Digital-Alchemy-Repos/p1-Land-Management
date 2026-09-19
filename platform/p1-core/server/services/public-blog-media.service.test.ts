import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  assets: [] as Array<{ url: string; r2Key: string | null; mimeType: string }>,
}));
vi.mock("../db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => state.assets }) }) },
}));
import { resolvePublicBlogMedia } from "./public-blog-media.service";
import { projectPublicBlog, type PublishedBlogRow } from "./public-blog-projection.service";
const row = (): PublishedBlogRow => ({
  id: "p",
  revisionId: "r",
  generation: 1,
  publishedAt: new Date("2026-09-01"),
  modifiedAt: new Date("2026-09-19"),
  snapshot: {
    title: "Title",
    slug: "test-media",
    content: '<p><img src="https://cdn.test/namespace/cms/media/image.webp" alt="Test"></p>',
    authorName: "Author",
    excerpt: null,
    coverImageUrl: "https://cdn.test/namespace/cms/media/image.webp",
    coverImagePositionX: null,
    coverImagePositionY: null,
    category: null,
    categories: null,
    tags: null,
    postType: null,
    podcastUrl: null,
    externalUrl: null,
    sidebarId: null,
    seoTitle: null,
    seoDescription: null,
    ogImageUrl: null,
    noindex: false,
  },
});
beforeEach(() => {
  state.assets = [
    {
      url: "https://cdn.test/namespace/cms/media/image.webp",
      r2Key: "cms/media/image.webp",
      mimeType: "image/webp",
    },
  ];
});
describe("public Blog media resolution", () => {
  it("resolves namespace CDN and canonical aliases for cover/OG/body without mutating revisions", async () => {
    const source = row();
    source.snapshot.ogImageUrl = "https://p1landmanagement.com/r2/cms/media/image.webp";
    const before = structuredClone(source);
    const resolved = await resolvePublicBlogMedia([source]);
    expect(source).toEqual(before);
    expect(resolved[0].snapshot.coverImageUrl).toBe("/r2/cms/media/image.webp");
    expect(resolved[0].snapshot.ogImageUrl).toBe("/r2/cms/media/image.webp");
    expect(resolved[0].snapshot.content).toContain('src="/r2/cms/media/image.webp"');
    expect(projectPublicBlog(resolved).posts).toHaveLength(1);
  });
  it("preserves inert toolbar formatting through media resolution and public projection", async () => {
    const { safePublishedHtml } = await import("@shared/public-blog");
    const source = row();
    source.snapshot.content = '<h1>Section heading</h1><p><code>x &lt; y</code></p><pre><code>line one\nline two</code></pre><hr><img src="https://cdn.test/namespace/cms/media/image.webp">';
    const before = structuredClone(source);
    const projected = projectPublicBlog(await resolvePublicBlogMedia([source]));
    const html = projected.posts[0].snapshot.content;
    expect(html).toContain('<h2>Section heading</h2>');
    expect(html).toContain('<code>x &lt; y</code>');
    expect(html).toContain('<pre><code>line one\nline two</code></pre>');
    expect(html).toContain('<hr />');
    expect(html).toContain('src="/r2/cms/media/image.webp"');
    expect(safePublishedHtml(html)).toBe(true);
    expect(source).toEqual(before);
  });
  it("accepts registered local fallback uploads", async () => {
    state.assets = [{ url: "/uploads/cms/media/image.png", r2Key: null, mimeType: "image/png" }];
    const x = row();
    x.snapshot.coverImageUrl = "/uploads/cms/media/image.png";
    x.snapshot.content = "<p>Body</p>";
    expect((await resolvePublicBlogMedia([x]))[0].snapshot.coverImageUrl).toBe(
      "/uploads/cms/media/image.png",
    );
  });
  it("rejects unregistered, ambiguous, private and SVG assets with actionable publication errors", async () => {
    state.assets = [];
    await expect(resolvePublicBlogMedia([row()])).rejects.toThrow(/media library/);
    state.assets = [
      {
        url: row().snapshot.coverImageUrl!,
        r2Key: "career-resumes/private.webp",
        mimeType: "image/webp",
      },
    ];
    await expect(resolvePublicBlogMedia([row()])).rejects.toThrow(/private/);
    state.assets = [
      {
        url: row().snapshot.coverImageUrl!,
        r2Key: "cms/media/image.svg",
        mimeType: "image/svg+xml",
      },
    ];
    await expect(resolvePublicBlogMedia([row()])).rejects.toThrow(/PNG/);
  });
});
