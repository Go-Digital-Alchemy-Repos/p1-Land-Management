/** Public Blog delivery contract. No database, sanitizer, or Node runtime dependencies. */
export const MAX_PUBLIC_BLOG_POSTS = 1000;
export const MAX_PUBLIC_BLOG_CONTENT_BYTES = 262144;
export const MAX_PUBLIC_BLOG_BYTES = 4194304;
export type PublicBlogSnapshot = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  authorName: string;
  coverImageUrl: string | null;
  coverImagePositionX: number | null;
  coverImagePositionY: number | null;
  category: string | null;
  categories: string[] | null;
  tags: string[] | null;
  postType: string | null;
  podcastUrl: string | null;
  externalUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
};
export type PublicBlogPost = {
  id: string;
  revisionId: string;
  generation: number;
  publishedAt: string;
  modifiedAt: string;
  snapshot: PublicBlogSnapshot;
};
export type PublicBlogPublication = {
  schemaVersion: 1;
  stackId: "p1-land-management";
  revision: string;
  posts: PublicBlogPost[];
};

const text = (v: unknown, max: number): v is string =>
  typeof v === "string" &&
  v.length <= max &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v);
function safeUrl(value: string | null, image = false) {
  if (value === null) return true;
  if (!text(value, 2048) || !value || /[\\\u0000-\u0020\u007f]/.test(value)) return false;
  try {
    if (/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(value))) return false;
    const url = new URL(value, "https://www.p1landmanagement.com");
    return (
      !value.startsWith("//") &&
      !url.username &&
      !url.password &&
      ["http:", "https:"].includes(url.protocol) &&
      (image
        ? value.startsWith("/") && url.origin === "https://www.p1landmanagement.com"
        : value.startsWith("/") || /^https?:\/\//.test(value))
    );
  } catch {
    return false;
  }
}
// Defense in depth: accept only the normalized grammar emitted by Core's rich
// text sanitizer. Reject the whole projection; never try regex-based repair.
export function safePublishedHtml(html: string) {
  if (!text(html, 262144) || new TextEncoder().encode(html).length > 262144) return false;
  let end = 0;
  for (const match of html.matchAll(/<[^>]*>/g)) {
    if (html.slice(end, match.index).includes("<")) return false;
    end = match.index + match[0].length;
    const tag =
      /^<(\/?)(p|br|strong|b|em|i|u|s|ul|ol|li|blockquote|pre|code|hr|h2|h3|h4|a|img)(?=[\s/>])([^<>]*)>$/.exec(
        match[0],
      );
    if (!tag) return false;
    if (tag[1]) {
      if (tag[3].trim()) return false;
      continue;
    }
    let attrs = tag[3].replace(/\/\s*$/, ""),
      consumed = "";
    const seen = new Set();
    for (const attr of attrs.matchAll(/\s+([a-z-]+)="([^"<>]*)"/g)) {
      consumed += attr[0];
      const [, key, value] = attr;
      if (seen.has(key)) return false;
      seen.add(key);
      if (
        key === "style" &&
        ["p", "h2", "h3", "h4"].includes(tag[2]) &&
        /^text-align:(left|center|right);?$/.test(value)
      )
        continue;
      if (
        tag[2] === "a" &&
        key === "href" &&
        (safeUrl(value) || /^(#[A-Za-z0-9_-]*|mailto:[^&\s]+|tel:[+0-9() -]+)$/.test(value))
      )
        continue;
      if (
        tag[2] === "a" &&
        key === "target" &&
        ["_blank", "_self", "_parent", "_top"].includes(value)
      )
        continue;
      if (tag[2] === "a" && key === "rel" && /^[a-z -]*$/.test(value)) continue;
      if (tag[2] === "img" && key === "src" && safeUrl(value, true)) continue;
      if (tag[2] === "img" && key === "alt") continue;
      if (tag[2] === "img" && key === "data-align" && /^(left|center|right)$/.test(value)) continue;
      if (
        tag[2] === "img" &&
        key === "class" &&
        value.split(" ").every((v) => /^cms-richtext-media(?:-(left|center|right))?$/.test(v))
      )
        continue;
      return false;
    }
    if (consumed.trim() !== attrs.trim()) return false;
  }
  return !html.slice(end).includes("<");
}

export const MAX_PUBLIC_BLOG_LISTING_BYTES = 262144;
export type PublicBlogSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImagePositionX: number | null;
  coverImagePositionY: number | null;
};
export function publicBlogListing(posts: PublicBlogPost[]): PublicBlogSummary[] {
  const listing = posts.map(({ id, snapshot: s }) => ({
    id,
    title: s.title,
    slug: s.slug,
    excerpt: s.excerpt && s.excerpt.length > 500 ? s.excerpt.slice(0, 500) + "…" : s.excerpt || "",
    coverImageUrl: s.coverImageUrl,
    coverImagePositionX: s.coverImagePositionX,
    coverImagePositionY: s.coverImagePositionY,
  }));
  if (
    new TextEncoder().encode(JSON.stringify(listing).replaceAll("<", "\\u003c")).length >
    MAX_PUBLIC_BLOG_LISTING_BYTES
  )
    throw new Error(
      "Published Blog listing exceeds 256 KiB; shorten public titles or excerpts, or withdraw older posts",
    );
  return listing;
}
