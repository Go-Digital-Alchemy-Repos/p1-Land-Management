import { createHash } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { sanitizePublicRichHtml } from "../utils/sanitize-rich-html";
import type { BlogEditorialSnapshot } from "@shared/schema/blog-publications";
import {
  safePublishedHtml,
  publicBlogListing,
  MAX_PUBLIC_BLOG_BYTES,
  MAX_PUBLIC_BLOG_CONTENT_BYTES,
  MAX_PUBLIC_BLOG_POSTS,
  type PublicBlogPublication,
  type PublicBlogPost,
} from "@shared/public-blog";

export type PublishedBlogRow = {
  id: string;
  revisionId: string;
  generation: number;
  publishedAt: Date | string | null;
  modifiedAt: Date | string | null;
  snapshot: BlogEditorialSnapshot;
};
const reserved = new Set([
  "land-clearing-cost-per-acre-south-carolina",
  "how-to-manage-retention-pond-south-carolina",
  "best-grass-large-acreage-carolinas",
  "signs-property-drainage-problem",
  "preparing-land-agricultural-use-carolinas",
]);
export class PublicBlogCapacityError extends Error {}
function text(value: string, max: number) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    throw new PublicBlogCapacityError("Public Blog text exceeds supported bounds");
  return value;
}
const optionalText = (value: string | null, max: number) =>
  value === null ? null : text(value, max);
export function safePublicBlogUrl(value: string | null, image = false): string | null {
  if (!value || value.length > 2048 || /[\\\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    if (/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(value))) return null;
    const url = new URL(value, "https://www.p1landmanagement.com");
    if (url.username || url.password || !["http:", "https:"].includes(url.protocol)) return null;
    if (value.startsWith("//")) return null;
    if (image)
      return url.origin === "https://www.p1landmanagement.com"
        ? `${url.pathname}${url.search}${url.hash}`
        : null;
    return value.startsWith("/") || /^https?:\/\//.test(value) ? value : null;
  } catch {
    return null;
  }
}
function taxonomy(value: string[] | null) {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length > 100)
    throw new PublicBlogCapacityError("Too many public Blog terms");
  return value.map((item) => text(item, 300));
}
/** Pure and shared by publication acceptance and public delivery; never truncates. */
export function projectPublicBlog(rows: PublishedBlogRow[]): PublicBlogPublication {
  if (rows.length > MAX_PUBLIC_BLOG_POSTS)
    throw new PublicBlogCapacityError("Too many published Blog posts");
  const slugs = new Set<string>(),
    ids = new Set<string>();
  const posts: PublicBlogPost[] = rows
    .map((row) => {
      const s = row.snapshot;
      if (!s.title.trim() || !s.authorName.trim())
        throw new PublicBlogCapacityError("A public title and author are required");
      for (const position of [s.coverImagePositionX, s.coverImagePositionY])
        if (position !== null && (!Number.isInteger(position) || position < 0 || position > 100))
          throw new PublicBlogCapacityError("Image positions must be between 0 and 100");
      if (
        reserved.has(s.slug) ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug) ||
        s.slug.length > 255 ||
        slugs.has(s.slug) ||
        ids.has(row.id)
      )
        throw new PublicBlogCapacityError("Invalid public Blog route");
      slugs.add(s.slug);
      ids.add(row.id);
      text(row.id, 200);
      text(row.revisionId, 200);
      if (
        !row.id ||
        !row.revisionId ||
        !Number.isSafeInteger(row.generation) ||
        row.generation < 1 ||
        !row.publishedAt ||
        !Number.isFinite(new Date(row.publishedAt).getTime())
      )
        throw new PublicBlogCapacityError("Invalid public Blog identity");
      // First apply the established rich-text policy, then remove images that the
      // unchanged public site's same-origin CSP cannot display.
      const content = sanitizeHtml(sanitizePublicRichHtml(s.content) ?? "", {
        allowedTags: [
          "p",
          "br",
          "strong",
          "b",
          "em",
          "i",
          "u",
          "s",
          "ul",
          "ol",
          "li",
          "blockquote",
          "pre",
          "code",
          "hr",
          "h2",
          "h3",
          "h4",
          "a",
          "img",
        ],
        allowedAttributes: {
          p: ["style"],
          h2: ["style"],
          h3: ["style"],
          h4: ["style"],
          a: ["href", "target", "rel"],
          img: ["src", "alt", "data-align", "class"],
        },
        allowedStyles: { "*": { "text-align": [/^(left|center|right)$/] } },
        exclusiveFilter: (frame) =>
          frame.tag === "img" && !safePublicBlogUrl(frame.attribs.src, true),
        transformTags: {
          img: (_tag, attrs) => ({
            tagName: "img",
            attribs: {
              ...attrs,
              src: safePublicBlogUrl(attrs.src, true) ?? "",
              ...(attrs["data-align"] && !/^(left|center|right)$/.test(attrs["data-align"])
                ? { "data-align": "center" }
                : {}),
            },
          }),
          a: (_tag, attrs) => {
            const href = attrs.href;
            const safe =
              safePublicBlogUrl(href) ||
              (/^(#[A-Za-z0-9_-]*|mailto:[^&\s]+|tel:[+0-9() -]+)$/.test(href || "") ? href : "#");
            return {
              tagName: "a",
              attribs: {
                href: safe,
                ...(attrs.target === "_blank"
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {}),
              },
            };
          },
        },
      });
      text(content, MAX_PUBLIC_BLOG_CONTENT_BYTES);
      if (!safePublishedHtml(content))
        throw new PublicBlogCapacityError(
          "Article markup is unsupported by the public renderer; simplify links or formatting",
        );
      if (
        !row.modifiedAt ||
        !Number.isFinite(new Date(row.modifiedAt).getTime()) ||
        new Date(row.modifiedAt) < new Date(row.publishedAt!)
      )
        throw new PublicBlogCapacityError("Invalid publication dates");
      if (!content.trim() && !safePublicBlogUrl(s.podcastUrl) && !safePublicBlogUrl(s.externalUrl))
        throw new PublicBlogCapacityError(
          "Public articles require content or a valid episode/source link",
        );
      if (Buffer.byteLength(content) > MAX_PUBLIC_BLOG_CONTENT_BYTES)
        throw new PublicBlogCapacityError("Published Blog content exceeds supported size");
      return {
        id: row.id,
        revisionId: row.revisionId,
        generation: row.generation,
        publishedAt: new Date(row.publishedAt).toISOString(),
        modifiedAt: new Date(row.modifiedAt).toISOString(),
        snapshot: {
          title: text(s.title, 2000),
          slug: s.slug,
          excerpt: optionalText(s.excerpt, 12000),
          content,
          authorName: text(s.authorName, 2000),
          coverImageUrl: safePublicBlogUrl(s.coverImageUrl, true),
          coverImagePositionX: s.coverImagePositionX,
          coverImagePositionY: s.coverImagePositionY,
          category: optionalText(s.category, 300),
          categories: taxonomy(s.categories),
          tags: taxonomy(s.tags),
          postType: optionalText(s.postType, 300),
          podcastUrl: safePublicBlogUrl(s.podcastUrl),
          externalUrl: safePublicBlogUrl(s.externalUrl),
          seoTitle: optionalText(s.seoTitle, 2000),
          seoDescription: optionalText(s.seoDescription, 12000),
          ogImageUrl: safePublicBlogUrl(s.ogImageUrl, true),
          noindex: s.noindex === true,
        },
      };
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
  try {
    publicBlogListing(posts);
  } catch (error) {
    throw new PublicBlogCapacityError((error as Error).message);
  }
  const result: PublicBlogPublication = {
    schemaVersion: 1,
    stackId: "p1-land-management",
    revision: createHash("sha256").update(JSON.stringify(posts)).digest("hex"),
    posts,
  };
  if (Buffer.byteLength(JSON.stringify(result)) > MAX_PUBLIC_BLOG_BYTES)
    throw new PublicBlogCapacityError("Public Blog index exceeds supported size");
  return result;
}
