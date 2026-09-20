/** Read-only static Blog media evidence. Never uploads, registers, or publishes. */
import { isDeepStrictEqual } from "node:util";
import { prepareArticle } from "./prepare-blog-import.mjs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { constants } from "node:fs";
import { lstat, open, writeFile } from "node:fs/promises";
import { resolve, relative, join, sep, dirname } from "node:path";
import { pathToFileURL } from "node:url";
const require = createRequire(
  new URL("../../platform/p1-core/package.json", import.meta.url),
);
const sharp = require("sharp");
const { JSDOM } = require("jsdom");
export const BLOG_MEDIA_SOURCES = Object.freeze({
  "land-clearing-cost-per-acre-south-carolina": "blog-land-clearing.png",
  "how-to-manage-retention-pond-south-carolina": "blog-retention-pond.png",
  "best-grass-large-acreage-carolinas": "blog-grass-acreage.png",
  "signs-property-drainage-problem": "blog-drainage.png",
  "preparing-land-agricultural-use-carolinas": "blog-ag-land.png",
});
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const origin = "https://www.p1landmanagement.com";
const hashPattern = /^[0-9a-f]{64}$/;
const exact = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join() === [...keys].sort().join();
function assert(value, message) {
  if (!value) throw Error(message);
}
async function noSymlinks(path) {
  const absolute = resolve(path);
  let current = sep;
  for (const part of absolute.split(sep).filter(Boolean)) {
    current = join(current, part);
    assert(
      !(await lstat(current)).isSymbolicLink(),
      "Symlinks are not permitted",
    );
  }
  return absolute;
}
async function boundedRead(path, max) {
  const checked = await noSymlinks(path);
  const file = await open(checked, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    assert(
      stat.isFile() && stat.size > 0 && stat.size <= max,
      "Invalid or oversized input file",
    );
    const buffer = Buffer.alloc(stat.size + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await file.read(
        buffer,
        offset,
        buffer.length - offset,
        null,
      );
      if (!bytesRead) break;
      offset += bytesRead;
    }
    assert(offset === stat.size, "Input file changed while reading");
    return buffer.subarray(0, offset);
  } finally {
    await file.close();
  }
}
async function rooted(root, path) {
  assert(
    typeof path === "string" &&
      path &&
      !path.includes("\\") &&
      !path.startsWith("/") &&
      !path.split("/").some((p) => !p || p === "." || p === ".."),
    "Invalid relative media path",
  );
  const result = resolve(root, path),
    rel = relative(root, result);
  assert(
    rel && !rel.startsWith(`..${sep}`) && rel !== "..",
    "Media path escapes root",
  );
  await noSymlinks(result);
  return result;
}
function assetPath(raw) {
  assert(
    typeof raw === "string" && raw.length <= 2048 && !/[\s\\%?#]/.test(raw),
    "Invalid captured asset URL",
  );
  assert(
    raw.startsWith("/assets/") || raw.startsWith(`${origin}/assets/`),
    "Captured asset must use canonical public origin/assets",
  );
  const path = raw.startsWith(origin) ? raw.slice(origin.length) : raw;
  assert(
    /^\/assets\/[A-Za-z0-9_-]+\.webp$/.test(path),
    "Invalid captured asset path",
  );
  return path.slice(1);
}
async function image(root, path, format, width, height, bytes, hash) {
  const buffer = await boundedRead(await rooted(root, path), 20 * 1024 * 1024);
  const metadata = await sharp(buffer, {
    limitInputPixels: 40_000_000,
  }).metadata();
  assert(
    metadata.format === format &&
      metadata.width === width &&
      metadata.height === height &&
      !metadata.pages,
    "Media MIME/dimensions mismatch",
  );
  assert(
    buffer.length === bytes && (!hash || sha(buffer) === hash),
    "Media bytes/hash mismatch",
  );
  return {
    logicalSourceFile: path,
    sha256: sha(buffer),
    bytes: buffer.length,
    mime: format === "png" ? "image/png" : "image/webp",
    width,
    height,
  };
}
function validateBundle(bundle) {
  assert(
    exact(bundle, [
      "schemaVersion",
      "mode",
      "canApply",
      "deploymentObservation",
      "sourceFingerprint",
      "articles",
      "summary",
    ]) &&
      bundle.schemaVersion === 2 &&
      bundle.mode === "review-only" &&
      bundle.canApply === false,
    "Unsupported review bundle structure",
  );
  const slugs = Object.keys(BLOG_MEDIA_SOURCES);
  assert(
    Array.isArray(bundle.articles) &&
      bundle.articles.length === 5 &&
      bundle.summary?.count === 5,
    "Five reviewed articles required",
  );
  assert(
    exact(bundle.deploymentObservation, [
      "sourceRevision",
      "deploymentId",
      "verification",
    ]) &&
      /^[a-f0-9]{40}$/.test(bundle.deploymentObservation.sourceRevision) &&
      /^[a-f0-9-]{36}$/.test(bundle.deploymentObservation.deploymentId),
    "Invalid deployment observation",
  );
  for (const [index, a] of bundle.articles.entries()) {
    assert(
      exact(a, [
        "slug",
        "canonical",
        "htmlSha256",
        "publishedSnapshotSha256",
        "revisions",
        "source",
        "editorial",
        "preservation",
        "declaredDates",
        "reviewRequired",
      ]) &&
        a.slug === slugs[index] &&
        a.canonical === `${origin}/blog/${a.slug}` &&
        hashPattern.test(a.htmlSha256) &&
        hashPattern.test(a.publishedSnapshotSha256),
      "Missing, duplicate, reordered or changed review article",
    );
    assert(
      exact(a.source, [
        "articleHtml",
        "bodyHtml",
        "asideHtml",
        "hero",
        "articleSchema",
        "assets",
      ]) &&
        exact(a.source.hero, [
          "eyebrow",
          "titleHtml",
          "image",
          "imageAlt",
          "srcset",
        ]) &&
        typeof a.source.articleHtml === "string" &&
        a.source.articleHtml.length <= 2 * 1024 * 1024,
      "Changed review source structure",
    );
    assert(
      a.editorial?.slug === a.slug &&
        a.preservation?.exactNormalizedContentMatch === true &&
        Array.isArray(a.preservation.differences) &&
        a.preservation.differences.length === 0,
      "Content preservation review must pass",
    );
    assert(
      exact(a.editorial, [
        "title",
        "slug",
        "content",
        "authorName",
        "presentation",
        "seoTitle",
        "seoDescription",
      ]) &&
        exact(a.revisions, ["page", "global"]) &&
        [a.revisions.page, a.revisions.global].every(
          (n) => Number.isSafeInteger(n) && n >= 0,
        ),
      "Changed editorial review structure",
    );
    const dom = new JSDOM(a.source.articleHtml);
    try {
      const articles = dom.window.document.querySelectorAll("article"),
        images = dom.window.document.querySelectorAll(
          "article > section:first-child img",
        );
      assert(
        articles.length === 1 &&
          images.length === 1 &&
          images[0].getAttribute("src") === a.source.hero.image &&
          images[0].getAttribute("srcset") === a.source.hero.srcset &&
          images[0].getAttribute("alt") === a.source.hero.imageAlt,
        "Captured hero differs from reviewed article HTML",
      );
      // Re-run the accepted read-only content mapper against the stored source
      // fragments. This detects changed review claims, not just missing fields.
      const doc = dom.window.document;
      const main = doc.createElement("main");
      main.append(articles[0]);
      const aside = doc.createElement("aside");
      aside.innerHTML = a.source.asideHtml;
      main.append(aside);
      doc.body.replaceChildren(main);
      const title = doc.createElement("title");
      title.textContent = a.editorial.seoTitle;
      doc.head.append(title);
      const description = doc.createElement("meta");
      description.name = "description";
      description.content = a.editorial.seoDescription;
      doc.head.append(description);
      const canonical = doc.createElement("link");
      canonical.rel = "canonical";
      canonical.href = a.canonical;
      doc.head.append(canonical);
      const schema = doc.createElement("script");
      schema.type = "application/ld+json";
      schema.textContent = JSON.stringify(a.source.articleSchema);
      doc.head.append(schema);
      const state = doc.createElement("script");
      state.id = "p1-published-content";
      state.type = "application/json";
      state.textContent = JSON.stringify({
        route: `/blog/${a.slug}`,
        revision: a.revisions.page,
        globalRevision: a.revisions.global,
      });
      doc.body.append(state);
      const checked = prepareArticle(a.slug, dom.serialize());
      assert(
        isDeepStrictEqual(checked.editorial, a.editorial) &&
          isDeepStrictEqual(checked.preservation, a.preservation) &&
          checked.source.bodyHtml === a.source.bodyHtml,
        "Reviewed content or preservation claim changed",
      );
    } finally {
      dom.window.close();
    }
  }
  assert(
    bundle.sourceFingerprint ===
      sha(
        JSON.stringify(
          bundle.articles.map((a) => ({
            slug: a.slug,
            htmlSha256: a.htmlSha256,
            publishedSnapshotSha256: a.publishedSnapshotSha256,
          })),
        ),
      ),
    "Capture fingerprint mismatch",
  );
}
export async function prepareBlogMedia({
  reviewBundlePath,
  assetsRoot,
  builtPublicRoot,
}) {
  const bytes = await boundedRead(reviewBundlePath, 12 * 1024 * 1024),
    bundle = JSON.parse(bytes.toString("utf8"));
  validateBundle(bundle);
  const assets = await noSymlinks(assetsRoot),
    built = await noSymlinks(builtPublicRoot);
  assert(
    (await lstat(assets)).isDirectory() && (await lstat(built)).isDirectory(),
    "Explicit asset and built public directories required",
  );
  const manifest = JSON.parse(
    (
      await boundedRead(
        await rooted(assets, "image-manifest.json"),
        2 * 1024 * 1024,
      )
    ).toString("utf8"),
  );
  const files = [];
  for (const article of bundle.articles) {
    const name = BLOG_MEDIA_SOURCES[article.slug],
      entry = manifest[name],
      stem = name.slice(0, -4);
    assert(
      exact(entry, [
        "sourceBytes",
        "sourceHash",
        "width",
        "height",
        "default",
        "variants",
      ]) &&
        entry.width === 1408 &&
        entry.height === 768 &&
        hashPattern.test(entry.sourceHash) &&
        Number.isSafeInteger(entry.sourceBytes) &&
        entry.sourceBytes > 0,
      "Invalid original image manifest",
    );
    assert(
      Array.isArray(entry.variants) &&
        entry.variants.length === 3 &&
        entry.default === `optimized/${stem}-1280.webp`,
      "Exactly three reviewed WebP variants and 1280 default required",
    );
    const sourceRoute = `/blog/${article.slug}`,
      captureFingerprint = bundle.sourceFingerprint;
    files.push({
      ...(await image(
        assets,
        name,
        "png",
        1408,
        768,
        entry.sourceBytes,
        entry.sourceHash,
      )),
      role: "original",
      default: false,
      quality: null,
      sourceRoute,
      captureFingerprint,
      capturedUrls: [],
    });
    const captured = new Map();
    assert(
      typeof article.source.hero.srcset === "string",
      "Captured responsive srcset required",
    );
    const parts = article.source.hero.srcset.split(",");
    assert(parts.length === 3, "Exactly three captured variants required");
    for (const part of parts) {
      const match = /^\s*(\S+)\s+(480|768|1280)w\s*$/.exec(part);
      assert(
        match && !captured.has(Number(match[2])),
        "Invalid or duplicate captured width",
      );
      assetPath(match[1]);
      captured.set(Number(match[2]), match[1]);
    }
    const widths = new Set();
    for (const variant of entry.variants) {
      assert(
        exact(variant, [
          "path",
          "format",
          "width",
          "height",
          "bytes",
          "quality",
        ]) &&
          [480, 768, 1280].includes(variant.width) &&
          !widths.has(variant.width) &&
          variant.path === `optimized/${stem}-${variant.width}.webp` &&
          variant.format === "webp" &&
          variant.height === Math.round((768 * variant.width) / 1408) &&
          Number.isSafeInteger(variant.quality) &&
          variant.quality >= 1 &&
          variant.quality <= 100 &&
          Number.isSafeInteger(variant.bytes) &&
          variant.bytes > 0,
        "Invalid or duplicate derivative manifest",
      );
      widths.add(variant.width);
      const item = await image(
        assets,
        variant.path,
        "webp",
        variant.width,
        variant.height,
        variant.bytes,
      );
      const urls = [captured.get(variant.width)];
      if (variant.width === 1280) urls.push(article.source.hero.image);
      for (const url of urls) {
        const served = await boundedRead(
          await rooted(built, assetPath(url)),
          20 * 1024 * 1024,
        );
        assert(
          sha(served) === item.sha256,
          "Captured built asset does not match reviewed derivative",
        );
      }
      files.push({
        ...item,
        role: "variant",
        default: variant.width === 1280,
        quality: variant.quality,
        sourceRoute,
        captureFingerprint,
        capturedUrls: [...new Set(urls)],
      });
    }
  }
  return {
    schemaVersion: 1,
    mode: "review-only",
    canApply: false,
    reviewBundleSha256: sha(bytes),
    sourceFingerprint: bundle.sourceFingerprint,
    deploymentObservation: bundle.deploymentObservation,
    files,
    summary: { articles: 5, files: 20 },
    pending: [
      "Live served asset byte readback and deployment/source verification",
      "Managed media registration and immutable variant-set contract",
      "Publication import and source ownership transfer",
    ],
  };
}
export async function writeBlogMediaReview(options, outputPath) {
  const result = await prepareBlogMedia(options);
  await noSymlinks(dirname(resolve(outputPath)));
  await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  return result;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const [
      reviewBundlePath,
      assetsRoot,
      builtPublicRoot,
      outputPath,
      ...extra
    ] = process.argv.slice(2);
    assert(
      reviewBundlePath &&
        assetsRoot &&
        builtPublicRoot &&
        outputPath &&
        !extra.length,
      "Usage: node scripts/consolidation/prepare-blog-media.mjs REVIEW_JSON ASSETS_ROOT BUILT_PUBLIC_ROOT NEW_OUTPUT_JSON",
    );
    const result = await writeBlogMediaReview(
      { reviewBundlePath, assetsRoot, builtPublicRoot },
      outputPath,
    );
    console.log(`Reviewed ${result.files.length} media files; canApply=false`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
