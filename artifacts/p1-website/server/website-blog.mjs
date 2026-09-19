import path from "node:path";
import { createPublicSettingsStore } from "./public-settings.mjs";
export const MAX_PUBLIC_BLOG_BYTES = 4194304;
export const staticBlogSlugs = new Set([
  "land-clearing-cost-per-acre-south-carolina",
  "how-to-manage-retention-pond-south-carolina",
  "best-grass-large-acreage-carolinas",
  "signs-property-drainage-problem",
  "preparing-land-agricultural-use-carolinas",
]);
const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).sort().join() === [...keys].sort().join();
const text = (v, max) =>
  typeof v === "string" &&
  v.length <= max &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v);
const optional = (v, max) => v === null || text(v, max);
function safeUrl(value, image = false) {
  if (value === null) return true;
  if (!text(value, 2048) || !value || /[\\\u0000-\u0020\u007f]/.test(value))
    return false;
  try {
    if (/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(value))) return false;
    const url = new URL(value, "https://www.p1landmanagement.com");
    return (
      !value.startsWith("//") &&
      !url.username &&
      !url.password &&
      ["http:", "https:"].includes(url.protocol) &&
      (image
        ? value.startsWith("/") &&
          url.origin === "https://www.p1landmanagement.com"
        : value.startsWith("/") || /^https?:\/\//.test(value))
    );
  } catch {
    return false;
  }
}
export function parsePublicBlog(data, validateHtml, projectListing) {
  if (
    !exact(data, [
      "schemaVersion",
      "stackId",
      "revision",
      "posts",
      "staticRoutes",
    ]) ||
    data.schemaVersion !== 2 ||
    data.stackId !== "p1-land-management" ||
    !/^[a-f0-9]{64}$/.test(data.revision) ||
    !Array.isArray(data.posts) ||
    data.posts.length > 1000 ||
    Buffer.byteLength(JSON.stringify(data)) > MAX_PUBLIC_BLOG_BYTES
  )
    throw Error("Invalid public Blog projection");
  if (!Array.isArray(data.staticRoutes) || data.staticRoutes.length > 5)
    throw Error("Invalid static Blog ownership");
  const owners = new Map(),
    ownerIds = new Set();
  for (const entry of data.staticRoutes) {
    if (
      !exact(entry, ["slug", "postId"]) ||
      !staticBlogSlugs.has(entry.slug) ||
      !text(entry.postId, 200) ||
      !entry.postId ||
      owners.has(entry.slug) ||
      ownerIds.has(entry.postId)
    )
      throw Error("Invalid static Blog ownership");
    owners.set(entry.slug, entry.postId);
    ownerIds.add(entry.postId);
  }
  const ids = new Set(),
    slugs = new Set();
  for (const post of data.posts) {
    if (
      !exact(post, [
        "id",
        "revisionId",
        "generation",
        "publishedAt",
        "modifiedAt",
        "snapshot",
      ]) ||
      !text(post.id, 200) ||
      !post.id ||
      !text(post.revisionId, 200) ||
      !post.revisionId ||
      ids.has(post.id) ||
      !Number.isSafeInteger(post.generation) ||
      post.generation < 1 ||
      typeof post.publishedAt !== "string" ||
      !Number.isFinite(Date.parse(post.publishedAt)) ||
      typeof post.modifiedAt !== "string" ||
      !Number.isFinite(Date.parse(post.modifiedAt)) ||
      Date.parse(post.modifiedAt) < Date.parse(post.publishedAt)
    )
      throw Error("Invalid public Blog identity");
    ids.add(post.id);
    const s = post.snapshot;
    if (
      !exact(s, [
        "title",
        "slug",
        "excerpt",
        "content",
        "authorName",
        "coverImageUrl",
        "coverImagePositionX",
        "coverImagePositionY",
        "category",
        "categories",
        "tags",
        "postType",
        "podcastUrl",
        "externalUrl",
        "seoTitle",
        "seoDescription",
        "ogImageUrl",
        "noindex",
      ]) ||
      !text(s.title, 2000) ||
      !s.title.trim() ||
      !text(s.slug, 255) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug) ||
      (staticBlogSlugs.has(s.slug) && owners.get(s.slug) !== post.id) ||
      slugs.has(s.slug) ||
      !text(s.authorName, 2000) ||
      !optional(s.excerpt, 12000) ||
      !optional(s.seoTitle, 2000) ||
      !optional(s.seoDescription, 12000) ||
      !optional(s.category, 300) ||
      !optional(s.postType, 300) ||
      typeof s.noindex !== "boolean" ||
      typeof validateHtml !== "function" ||
      !validateHtml(s.content)
    )
      throw Error("Invalid public Blog content");
    slugs.add(s.slug);
    for (const key of ["coverImagePositionX", "coverImagePositionY"])
      if (
        s[key] !== null &&
        (!Number.isInteger(s[key]) || s[key] < 0 || s[key] > 100)
      )
        throw Error("Invalid image position");
    for (const key of ["categories", "tags"])
      if (
        s[key] !== null &&
        (!Array.isArray(s[key]) ||
          s[key].length > 100 ||
          !s[key].every((v) => text(v, 300)))
      )
        throw Error("Invalid taxonomy");
    for (const key of ["coverImageUrl", "ogImageUrl"])
      if (!safeUrl(s[key], true)) throw Error("Invalid image URL");
    for (const key of ["podcastUrl", "externalUrl"])
      if (!safeUrl(s[key])) throw Error("Invalid link URL");
  }
  if (typeof projectListing !== "function")
    throw Error("Missing Blog listing validator");
  projectListing(data.posts);
  return data;
}
export function createWebsiteBlogStore({
  origin,
  cacheDir = "/tmp/p1-public-content",
  validateHtml,
  projectListing,
  ...options
} = {}) {
  const observed = new Map();
  function parse(data) {
    const next = parsePublicBlog(data, validateHtml, projectListing);
    const ownership = new Map(
      next.staticRoutes.map((entry) => [entry.slug, entry.postId]),
    );
    for (const [slug, postId] of observed)
      if (ownership.get(slug) !== postId)
        throw Error("Static Blog ownership cannot disappear or change");
    for (const [slug, postId] of ownership) observed.set(slug, postId);
    return next;
  }
  return createPublicSettingsStore({
    origin,
    path: "/api/website/blog-publication",
    parse,
    fallback: () => null,
    preserveLastValid: true,
    maxBytes: MAX_PUBLIC_BLOG_BYTES,
    cacheFile: cacheDir
      ? path.join(cacheDir, "website-blog-v2.json")
      : undefined,
    ...options,
  });
}

/** Route-specific views never hydrate unrelated article bodies. */
export function blogForRoute(publication, route, projectListing) {
  if (!publication)
    return {
      revision: null,
      staticRoutes: null,
      posts: [],
      ...(route === "/blog" ? { listing: [] } : {}),
    };
  const owner = publication.staticRoutes.find(
    (entry) => `/blog/${entry.slug}` === route,
  );
  return {
    revision: publication.revision,
    staticRoutes: publication.staticRoutes,
    posts:
      route === "/blog"
        ? []
        : publication.posts.filter(
            (post) =>
              route === `/blog/${post.snapshot.slug}` &&
              (!owner || owner.postId === post.id),
          ),
    ...(route === "/blog"
      ? { listing: projectListing(publication.posts) }
      : {}),
  };
}
