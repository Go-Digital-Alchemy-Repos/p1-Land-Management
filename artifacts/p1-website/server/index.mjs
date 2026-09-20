import {
  createWebsiteBlogStore,
  staticBlogSlugs,
  blogForRoute,
} from "./website-blog.mjs";
import { createWebsiteMenuStore } from "./website-menus.mjs";
import {
  createWebsiteRedirectStore,
  resolveWebsiteRedirect,
} from "./website-redirects.mjs";
import {
  createWebsiteRobotsStore,
  publicRobotsContent,
} from "./website-robots.mjs";
import {
  createWebsiteIdentityStore,
  identityIconHead,
} from "./website-identity.mjs";
import { createWebsiteSocialStore } from "./website-social.mjs";
import { typographyPreview } from "./typography-preview.mjs";
import { createWebsiteFontStore } from "./website-fonts.mjs";
import { createWebsiteColorStore } from "./website-colors.mjs";
import { createHeadTagStore, insertHeadTags } from "./head-tags.mjs";
import http from "node:http";
import https from "node:https";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createGzip, createBrotliCompress } from "node:zlib";
import { createContentStore } from "./content.mjs";
import { clientIp } from "./client-ip.mjs";
import { createGoogleReviewsStore } from "./google-reviews.mjs";
import { BUSINESS_CENTER_ORIGIN } from "../config/preview-origins.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "dist/public");
const manifest = JSON.parse(
  await readFile(path.join(root, "config/client-site-manifest.json"), "utf8"),
);
const template = await readFile(path.join(publicDir, "index.html"), "utf8");
const {
  render,
  safePublishedHtml,
  publicBlogListing,
  validateBlogPresentation,
  validateBlogResponsiveCover,
} = await import(
  pathToFileURL(path.join(root, "dist/server/entry-server.js")).href
);
const origin = process.env.P1_CORE_ORIGIN?.replace(/\/$/, "");
const content = createContentStore({
  manifest,
  origin,
  cacheDir: process.env.P1_CONTENT_CACHE_DIR,
});
const websiteIdentity = createWebsiteIdentityStore({
  origin,
  cacheDir: process.env.P1_CONTENT_CACHE_DIR ?? "/tmp/p1-public-content",
});
const websiteMenus = createWebsiteMenuStore({
  origin,
  cacheDir: process.env.P1_CONTENT_CACHE_DIR ?? "/tmp/p1-public-content",
});
const websiteBlog = createWebsiteBlogStore({
  origin,
  validateHtml: safePublishedHtml,
  projectListing: publicBlogListing,
  validatePresentation: validateBlogPresentation,
  validateResponsiveCover: validateBlogResponsiveCover,
  cacheDir: process.env.P1_CONTENT_CACHE_DIR ?? "/tmp/p1-public-content",
});
const blogArticlePath = (route) =>
  /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route);
async function pageSnapshot(routePath) {
  const [page, identity, menus] = await Promise.all([
    content.snapshot(routePath),
    websiteIdentity.snapshot(),
    websiteMenus.snapshot(),
  ]);
  if (routePath === "/blog" || blogArticlePath(routePath)) {
    const blog = await websiteBlog.snapshot();
    const base = page || (await content.snapshot("/"));
    return {
      ...base,
      route: routePath,
      content:
        staticBlogSlugs.has(routePath.slice(6)) &&
        (!blog ||
          blog.staticRoutes.some(
            (entry) => `/blog/${entry.slug}` === routePath,
          ))
          ? {}
          : page?.content || {},
      identity,
      menus,
      blog: blogForRoute(blog, routePath, publicBlogListing),
    };
  }
  return page ? { ...page, identity, menus } : null;
}
const websiteRobots = createWebsiteRobotsStore({
  origin,
  cacheDir: process.env.P1_CONTENT_CACHE_DIR ?? "/tmp/p1-public-content",
});
const websiteRedirects = createWebsiteRedirectStore({
  origin,
  cacheDir: process.env.P1_CONTENT_CACHE_DIR ?? "/tmp/p1-public-content",
});
const googleReviews = createGoogleReviewsStore();
const headTags = createHeadTagStore({ origin });
const websiteColors = createWebsiteColorStore({ origin });
const websiteFonts = createWebsiteFontStore({ origin });
const websiteSocial = createWebsiteSocialStore({ origin });
const canonical = "https://www.p1landmanagement.com";
const legacyPublicRoutes = new Map([
  [
    "/commercial-snow-ice-management",
    "/services/commercial-snow-ice-management",
  ],
  [
    "/services/commercial-property-management",
    "/services/commercial-landscaping",
  ],
  ["/service-areas/charlotte-nc", "/service-areas/charlotte-north-carolina"],
]);
// The CMS is served behind the protected /admin gateway. Keep the original
// owner setup link useful without creating a separate public setup surface.
const adminShortcutRoutes = new Map([["/setup", "/admin/setup"]]);
// Keep established links useful after retiring pages that no longer represent
// an active customer journey. The destination remains within the public site.
const retiredRoutes = new Map([["/testimonials", "/contact"]]);
// Deployment-owned configuration determines whether this is an indexable
// production release. In that release, public documents only belong on the
// configured canonical host; Railway's generated service alias must not create
// a second indexable copy of the site.
const indexableDeployment = (() => {
  try {
    return new URL(manifest.origins?.publicSite).origin === canonical;
  } catch {
    return false;
  }
})();
const canonicalHost = new URL(canonical).hostname;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const escape = (x) =>
  String(x)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
function send(
  req,
  res,
  status,
  body,
  type = "text/html; charset=utf-8",
  cache = "no-cache",
) {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", cache);
  if (req.method === "HEAD") return res.end();
  const compressible =
    /text|json|xml|javascript/.test(type) && Buffer.byteLength(body) > 1024;
  const accepted = req.headers["accept-encoding"] || "";
  if (compressible && /\b(br|gzip)\b/.test(accepted)) {
    const br = /\bbr\b/.test(accepted);
    res.setHeader("Content-Encoding", br ? "br" : "gzip");
    res.setHeader("Vary", "Accept-Encoding");
    const stream = br ? createBrotliCompress() : createGzip();
    stream.pipe(res);
    stream.end(body);
  } else res.end(body);
}
function proxy(req, res) {
  if (!origin)
    return send(
      req,
      res,
      503,
      JSON.stringify({ message: "Service is temporarily unavailable." }),
      "application/json",
    );
  const incoming = new URL(req.url, "http://localhost");
  const target = new URL(origin);
  target.pathname = incoming.pathname;
  target.search = incoming.search;
  const headers = {
    ...req.headers,
    host: target.host,
    "x-forwarded-host": req.headers.host,
    "x-forwarded-proto":
      process.env.NODE_ENV === "production" ? "https" : "http",
  };
  delete headers["x-client-form-proxy-token"];
  delete headers["x-forwarded-for"];
  headers["x-forwarded-for"] = clientIp(req);
  headers["x-real-ip"] = headers["x-forwarded-for"];
  const upstream = (target.protocol === "https:" ? https : http).request(
    target,
    { method: req.method, headers },
    (response) => {
      // Dashboard, API, and upload endpoints are operational surfaces, never
      // search results. Override upstream defaults so this remains true even if
      // the Core service changes its own indexing policy.
      res.writeHead(response.statusCode || 502, {
        ...response.headers,
        "x-robots-tag": "noindex, nofollow",
      });
      if (
        req.method === "POST" &&
        req.url.includes("/publish") &&
        response.statusCode >= 200 &&
        response.statusCode < 300
      )
        content.invalidate();
      if (
        !["GET", "HEAD"].includes(req.method) &&
        response.statusCode >= 200 &&
        response.statusCode < 300 &&
        (incoming.pathname.startsWith("/api/blog") ||
          incoming.pathname.startsWith("/api/business-center/cms/blog"))
      )
        websiteBlog.invalidate();
      response.pipe(res);
    },
  );
  upstream.setTimeout(25000, () => upstream.destroy());
  upstream.on("error", () => {
    if (!res.headersSent)
      send(
        req,
        res,
        502,
        JSON.stringify({
          message: "Service is temporarily unavailable. Please retry.",
        }),
        "application/json",
      );
    else res.destroy();
  });
  req.on("aborted", () => upstream.destroy());
  req.pipe(upstream);
}
function headHtml(head, route) {
  const url = canonical + route;
  const img = head?.image?.startsWith("http")
    ? head.image
    : canonical + (head?.image || "/opengraph.jpg");
  let text = `<title>${escape(head?.title || "P1 Land & Property Management")}</title><meta name="description" content="${escape(head?.description || "")}"><meta name="robots" content="${!indexableDeployment ? "noindex, nofollow" : head?.noindex ? "noindex, follow" : "index, follow"}"><link rel="canonical" href="${url}">`;
  for (const [k, v] of Object.entries({
    "og:title": head?.title,
    "og:description": head?.description,
    "og:url": url,
    "og:image": img,
    "og:type": route.startsWith("/blog/") ? "article" : "website",
    "og:site_name": head?.siteName || "P1 Land & Property Management",
    "og:locale": "en_US",
  }))
    text += `<meta property="${k}" content="${escape(v || "")}">`;
  for (const [k, v] of Object.entries({
    "twitter:card": "summary_large_image",
    "twitter:title": head?.title,
    "twitter:description": head?.description,
    "twitter:image": img,
  }))
    text += `<meta name="${k}" content="${escape(v || "")}">`;
  for (const item of Array.isArray(head?.jsonLd)
    ? head.jsonLd
    : head?.jsonLd
      ? [head.jsonLd]
      : [])
    text += `<script type="application/ld+json" data-seo-jsonld>${JSON.stringify(item).replaceAll("<", "\\u003c")}</script>`;
  return text;
}
const server = http.createServer(async (req, res) => {
  try {
    if (!indexableDeployment)
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (!req.url?.startsWith("/") || req.url.startsWith("//"))
      return send(req, res, 400, "Bad request");
    const url = new URL(req.url, "http://localhost");
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return send(req, res, 400, "Bad request");
    }
    if (pathname.includes("\\") || pathname.includes("\0"))
      return send(req, res, 400, "Bad request");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    if (process.env.NODE_ENV === "production")
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    // Railway probes use an internal Host; readiness must not redirect to the public site.
    if (pathname === "/healthz")
      return send(
        req,
        res,
        200,
        '{"status":"ok"}',
        "application/json",
        "no-store",
      );
    const host = (req.headers.host || "").split(":")[0].toLowerCase();
    const backendPath = ["/admin", "/api", "/uploads", "/r2"].some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    );
    if (backendPath) res.setHeader("X-Robots-Tag", "noindex, nofollow");
    const infrastructurePath =
      backendPath ||
      pathname === "/healthz" ||
      pathname === "/assets" ||
      pathname.startsWith("/assets/");
    // Local hosts are kept usable for the isolated runtime suite. Public
    // alternate hosts redirect before an HTML, robots, or sitemap response can
    // be served, while operational routes remain explicitly noindex.
    const localHost =
      host === "" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]";
    const redirectToCanonicalHost =
      indexableDeployment && !localHost && host !== canonicalHost;
    let normalized = pathname;
    // Core and static asset servers own their exact paths and directory redirects.
    if (!infrastructurePath) {
      if (normalized.endsWith(".html")) normalized = normalized.slice(0, -5);
      if (normalized.endsWith("/index"))
        normalized = normalized.slice(0, -6) || "/";
      if (normalized !== "/") normalized = normalized.replace(/\/+$/, "");
    }
    const adminShortcut = adminShortcutRoutes.get(normalized);
    if (adminShortcut) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.writeHead(308, {
        Location: `${redirectToCanonicalHost ? canonical : ""}${adminShortcut}${url.search}`,
      });
      return res.end();
    }
    const replacement = retiredRoutes.get(normalized);
    if (replacement) {
      res.writeHead(301, {
        Location: `${redirectToCanonicalHost ? canonical : ""}${replacement}${url.search}`,
      });
      return res.end();
    }
    const legacyDestination = legacyPublicRoutes.get(normalized);
    if (legacyDestination) {
      res.writeHead(301, {
        Location: `${redirectToCanonicalHost ? canonical : ""}${legacyDestination}${url.search}`,
      });
      return res.end();
    }
    if (redirectToCanonicalHost || normalized !== pathname) {
      res.writeHead(308, {
        Location: `${redirectToCanonicalHost ? canonical : ""}${normalized}${url.search}`,
      });
      return res.end();
    }
    if (
      pathname === "/api/p1/page-content" &&
      ["GET", "HEAD"].includes(req.method)
    ) {
      const snapshot = await pageSnapshot(url.searchParams.get("path") || "/");
      return send(
        req,
        res,
        snapshot ? 200 : 404,
        JSON.stringify(snapshot || { error: "Not found" }),
        "application/json",
        "no-store",
      );
    }
    if (pathname === "/api/p1/social-links") {
      if (!["GET", "HEAD"].includes(req.method))
        return send(
          req,
          res,
          405,
          "Method not allowed",
          "text/plain; charset=utf-8",
          "no-store",
        );
      if (url.search)
        return send(
          req,
          res,
          400,
          "Unsupported query",
          "text/plain; charset=utf-8",
          "no-store",
        );
      return send(
        req,
        res,
        200,
        JSON.stringify(await websiteSocial.snapshot()),
        "application/json; charset=utf-8",
        "no-store",
      );
    }
    if (
      pathname === "/api/p1/google-reviews" &&
      ["GET", "HEAD"].includes(req.method)
    ) {
      try {
        const snapshot = await googleReviews.snapshot();
        return send(
          req,
          res,
          200,
          JSON.stringify(snapshot),
          "application/json",
          "public, max-age=300, stale-while-revalidate=21600",
        );
      } catch (error) {
        const unavailable =
          error?.code === "NOT_CONFIGURED" ||
          [401, 403, 429, 503].includes(error?.status);
        return send(
          req,
          res,
          unavailable ? 503 : 502,
          JSON.stringify({ error: "Reviews are temporarily unavailable." }),
          "application/json",
          "no-store",
        );
      }
    }
    if (pathname === "/api/p1/website-redirects") {
      if (!["GET", "HEAD"].includes(req.method))
        return send(
          req,
          res,
          405,
          "Method not allowed",
          "text/plain; charset=utf-8",
          "no-store",
        );
      if (url.search)
        return send(
          req,
          res,
          400,
          "Unsupported query",
          "text/plain; charset=utf-8",
          "no-store",
        );
      return send(
        req,
        res,
        200,
        JSON.stringify(await websiteRedirects.snapshot()),
        "application/json; charset=utf-8",
        "no-store",
      );
    }
    if (backendPath) return proxy(req, res);
    if (!["GET", "HEAD"].includes(req.method))
      return send(req, res, 405, "Method not allowed");
    const cmsRedirect = await resolveWebsiteRedirect(
      websiteRedirects,
      pathname,
      url.search,
      req.method,
    );
    if (cmsRedirect) {
      res.writeHead(cmsRedirect.status, {
        Location: cmsRedirect.location,
        "Cache-Control": "no-cache",
      });
      return res.end();
    }
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' https://www.googletagmanager.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://tiles.openfreemap.org https://www.google-analytics.com https://region1.google-analytics.com; frame-src 'self' https://challenges.cloudflare.com; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
    );
    if (pathname === "/cms-preview/typography") {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.removeHeader("X-Frame-Options");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader(
        "Content-Security-Policy",
        `default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'none'; frame-ancestors 'self' ${BUSINESS_CENTER_ORIGIN}; base-uri 'none'; form-action 'none'`,
      );
      try {
        return send(
          req,
          res,
          200,
          typographyPreview(url.searchParams),
          "text/html; charset=utf-8",
          "no-store",
        );
      } catch {
        return send(
          req,
          res,
          400,
          "Invalid typography preview",
          "text/plain; charset=utf-8",
          "no-store",
        );
      }
    }
    if (pathname === "/robots.txt")
      return send(
        req,
        res,
        200,
        await publicRobotsContent(indexableDeployment, websiteRobots),
        "text/plain; charset=utf-8",
        "no-cache",
      );
    if (url.searchParams.has("cmsPreview")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      if (content.routes.has(pathname)) {
        // Only public preview documents may be framed by the consolidated editor.
        res.removeHeader("X-Frame-Options");
        res.setHeader(
          "Content-Security-Policy",
          String(res.getHeader("Content-Security-Policy")).replace(
            "frame-ancestors 'self'",
            `frame-ancestors 'self' ${BUSINESS_CENTER_ORIGIN}`,
          ),
        );
      }
    }
    if (pathname === "/sitemap.xml") {
      const redirectSources = new Set(
        (await websiteRedirects.snapshot()).redirects.map(
          (rule) => rule.fromPath,
        ),
      );
      const blog = await websiteBlog.snapshot();
      const snapshots = await Promise.all(
        [...content.routes.keys()]
          .filter(
            (p) =>
              !retiredRoutes.has(p) &&
              !redirectSources.has(p) &&
              (!staticBlogSlugs.has(p.slice(6)) ||
                (blog &&
                  !blog.staticRoutes.some(
                    (entry) => p === `/blog/${entry.slug}`,
                  ))),
          )
          .map((p) => content.snapshot(p)),
      );
      snapshots.push(
        ...(blog?.posts || [])
          .filter(
            (post) =>
              !post.snapshot.noindex &&
              !redirectSources.has("/blog/" + post.snapshot.slug),
          )
          .map((post) => ({
            route: "/blog/" + post.snapshot.slug,
            publishedAt: post.modifiedAt,
          })),
      );
      const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${snapshots.map((s) => `<url><loc>${canonical}${escape(s.route)}</loc>${s.publishedAt ? `<lastmod>${escape(new Date(s.publishedAt).toISOString())}</lastmod>` : ""}</url>`).join("")}</urlset>`;
      return send(req, res, 200, body, "application/xml");
    }
    if (content.routes.has(pathname) || blogArticlePath(pathname)) {
      const snapshot = await pageSnapshot(pathname);
      const result = render(pathname, snapshot);
      const blogDocument = pathname === "/blog" || blogArticlePath(pathname);
      const unavailable = blogDocument && snapshot.blog.staticRoutes === null;
      const managed =
        blogArticlePath(pathname) &&
        (!staticBlogSlugs.has(pathname.slice(6)) ||
          snapshot.blog.staticRoutes?.some(
            (entry) => pathname === `/blog/${entry.slug}`,
          ));
      const missing =
        !unavailable &&
        managed &&
        !snapshot.blog.posts.some(
          (post) => pathname === `/blog/${post.snapshot.slug}`,
        );
      if (missing || unavailable)
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
      if (unavailable) res.setHeader("Retry-After", "30");
      const state = JSON.stringify(snapshot).replaceAll("<", "\\u003c");
      const html = template
        .replace(
          /<!--seo-head-start-->[\s\S]*?<!--seo-head-end-->/,
          `<!--seo-head-start-->${headHtml(result.head, pathname)}<!--seo-head-end-->`,
        )
        .replace(
          /<div id="root">[\s\S]*<\/div>/,
          `<div id="root">${result.html}</div><script type="application/json" id="p1-published-content">${state}</script>`,
        );
      const [palette, fonts, markup] = await Promise.all([
        websiteColors.snapshot(),
        websiteFonts.snapshot(),
        url.searchParams.has("cmsPreview") ? "" : headTags.snapshot(),
      ]);
      return send(
        req,
        res,
        unavailable ? 503 : missing ? 404 : 200,
        insertHeadTags(
          identityIconHead(html, snapshot.identity),
          palette + fonts + markup,
        ),
        "text/html; charset=utf-8",
        url.searchParams.has("cmsPreview") ? "private, no-store" : "no-cache",
      );
    }
    const file = path.resolve(publicDir, "." + pathname);
    if (
      !file.startsWith(publicDir + path.sep) ||
      pathname.split("/").some((p) => p.startsWith("."))
    )
      return send(req, res, 404, "Not found");
    try {
      const info = await stat(file);
      if (!info.isFile()) throw new Error();
      const type = mime[path.extname(file)] || "application/octet-stream";
      const immutable = pathname.startsWith("/assets/");
      if (/text|javascript|json|xml/.test(type))
        return send(
          req,
          res,
          200,
          await readFile(file),
          type,
          immutable ? "public, max-age=31536000, immutable" : "no-cache",
        );
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": info.size,
        "Cache-Control": immutable
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      });
      if (req.method === "HEAD") return res.end();
      createReadStream(file).pipe(res);
      return;
    } catch {}
    res.setHeader(
      "X-Robots-Tag",
      indexableDeployment ? "noindex" : "noindex, nofollow",
    );
    return send(
      req,
      res,
      404,
      '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found | P1 Land Management</title></head><body><main><h1>Page not found</h1><p>We could not find this page.</p><a href="/">Return home</a> · <a href="/contact">Request an estimate</a></main></body></html>',
    );
  } catch {
    if (!res.headersSent)
      send(req, res, 500, "Service temporarily unavailable");
    else res.destroy();
  }
});
server.listen(Number(process.env.PORT) || 4173, "0.0.0.0", () =>
  console.log(`P1 website listening on ${Number(process.env.PORT) || 4173}`),
);
