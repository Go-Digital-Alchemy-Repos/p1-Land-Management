import { requireAdminPermission as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { storage } from "../../storage/index";
import type { BlogPost, CmsPage, Event } from "@shared/schema";

const router = Router();

function pageIssues(page: CmsPage): string[] {
  const issues: string[] = [];
  if (!page.seoTitle) issues.push("missing_seo_title");
  if (!page.seoDescription) issues.push("missing_seo_description");
  if (!page.ogImageUrl) issues.push("missing_og_image");
  if (page.noindex) issues.push("noindex");
  if (page.status === "draft") issues.push("not_published");
  if (page.status === "published" && !page.canonicalUrl) issues.push("no_canonical");
  return issues;
}

function postIssues(post: BlogPost): string[] {
  const issues: string[] = [];
  if (!post.seoTitle) issues.push("missing_seo_title");
  if (!post.seoDescription) issues.push("missing_seo_description");
  if (!post.ogImageUrl && !post.coverImageUrl) issues.push("missing_og_image");
  if (post.noindex) issues.push("noindex");
  if (!post.isPublished) issues.push("not_published");
  if (!post.authorName) issues.push("missing_author");
  return issues;
}

function eventIssues(event: Event): string[] {
  const issues: string[] = [];
  if (!event.description) issues.push("missing_description");
  if (!event.imageUrl) issues.push("missing_og_image");
  if (event.status === "draft") issues.push("not_published");
  if (event.visibility !== "public") issues.push("non_public");
  return issues;
}

router.get("/seo-audit", p1Authorize("content"), async (_req, res) => {
  try {
    const [pages, posts, events] = await Promise.all([
      storage.cmsPages.getAllPages(),
      storage.blog.getAllPosts(),
      storage.events.getAllEvents(),
    ]);

    res.json({
      pages: pages.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        status: p.status,
        noindex: p.noindex,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        ogImageUrl: p.ogImageUrl,
        canonicalUrl: p.canonicalUrl,
        updatedAt: p.updatedAt,
        issues: pageIssues(p),
      })),
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        isPublished: p.isPublished,
        noindex: p.noindex,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        ogImageUrl: p.ogImageUrl,
        coverImageUrl: p.coverImageUrl,
        authorName: p.authorName,
        updatedAt: p.updatedAt,
        issues: postIssues(p),
      })),
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        status: e.status,
        visibility: e.visibility,
        date: e.date,
        imageUrl: e.imageUrl,
        issues: eventIssues(e),
      })),
    });
  } catch {
    res.status(500).json({ error: "Failed to run SEO audit" });
  }
});

export default router;
