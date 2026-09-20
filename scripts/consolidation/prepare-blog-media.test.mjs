import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  realpath,
  symlink,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareBlogImport } from "./prepare-blog-import.mjs";
import {
  BLOG_MEDIA_SOURCES,
  prepareBlogMedia,
  writeBlogMediaReview,
} from "./prepare-blog-media.mjs";
const require = createRequire(
  new URL("../../platform/p1-core/package.json", import.meta.url),
);
const sharp = require("sharp");
const sha = (b) => createHash("sha256").update(b).digest("hex");
async function fixture() {
  const root = await realpath(
      await mkdtemp(join(tmpdir(), "blog-media-review-")),
    ),
    assetsRoot = join(root, "sources"),
    builtPublicRoot = join(root, "public"),
    capture = join(root, "capture");
  await Promise.all([
    mkdir(join(assetsRoot, "optimized"), { recursive: true }),
    mkdir(join(builtPublicRoot, "assets"), { recursive: true }),
    mkdir(capture),
  ]);
  const original = await sharp({
    create: { width: 1408, height: 768, channels: 3, background: "#448855" },
  })
    .png()
    .toBuffer();
  const variants = await Promise.all(
    [480, 768, 1280].map(async (width) => ({
      width,
      height: Math.round((768 * width) / 1408),
      bytes: await sharp(original)
        .resize({ width })
        .webp({ quality: 78 })
        .toBuffer(),
    })),
  );
  const manifest = {};
  for (const [slug, name] of Object.entries(BLOG_MEDIA_SOURCES)) {
    const stem = name.slice(0, -4);
    await writeFile(join(assetsRoot, name), original);
    manifest[name] = {
      sourceBytes: original.length,
      sourceHash: sha(original),
      width: 1408,
      height: 768,
      default: `optimized/${stem}-1280.webp`,
      variants: [],
    };
    for (const variant of variants) {
      const path = `optimized/${stem}-${variant.width}.webp`;
      await writeFile(join(assetsRoot, path), variant.bytes);
      await writeFile(
        join(builtPublicRoot, `assets/${stem}-${variant.width}-hash.webp`),
        variant.bytes,
      );
      manifest[name].variants.push({
        path,
        format: "webp",
        width: variant.width,
        height: variant.height,
        bytes: variant.bytes.length,
        quality: 78,
      });
    }
    const image = `/assets/${stem}-1280-hash.webp`,
      srcset = variants
        .map((v) => `/assets/${stem}-${v.width}-hash.webp ${v.width}w`)
        .join(", ");
    await writeFile(
      join(capture, slug + ".html"),
      `<html><head><title>Title</title><meta name="description" content="Description"><link rel="canonical" href="https://www.p1landmanagement.com/blog/${slug}"><script type="application/ld+json">${JSON.stringify({ "@type": "Article", headline: "Title", description: "Description", author: { "@type": "Organization", name: "P1" }, datePublished: "2026-06-24", dateModified: "2026-09-14" })}</script></head><body><main><article><section><img src="${image}" srcset="${srcset}" alt="Land"><div class="site-shell"><div><span>Insights</span><h1>Title</h1></div></div></section><section><div class="prose"><p>Body</p></div></section></article><aside><p><a href="/contact">Contact</a></p></aside></main><script id="p1-published-content" type="application/json">${JSON.stringify({ route: "/blog/" + slug, revision: 1, globalRevision: 1 })}</script></body></html>`,
    );
  }
  const bundle = await prepareBlogImport({
      inputDirectory: capture,
      sourceRevision: "a".repeat(40),
      deploymentId: "00000000-0000-0000-0000-000000000000",
    }),
    reviewBundlePath = join(root, "review.json");
  await writeFile(reviewBundlePath, JSON.stringify(bundle));
  await writeFile(
    join(assetsRoot, "image-manifest.json"),
    JSON.stringify(manifest),
  );
  return {
    root,
    assetsRoot,
    builtPublicRoot,
    reviewBundlePath,
    bundle,
    manifest,
  };
}
async function using(fn) {
  const f = await fixture();
  try {
    await fn(f);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
}
test("reviews exact originals and derivatives, binds built copies, and writes only exclusive private evidence", () =>
  using(async (f) => {
    const result = await prepareBlogMedia(f);
    assert.equal(result.canApply, false);
    assert.equal(result.files.length, 20);
    assert.equal(result.files.filter((x) => x.role === "original").length, 5);
    assert.equal(result.files.filter((x) => x.default).length, 5);
    assert.equal(
      result.reviewBundleSha256,
      sha(await readFile(f.reviewBundlePath)),
    );
    assert.equal(result.sourceFingerprint, f.bundle.sourceFingerprint);
    assert.deepEqual(await prepareBlogMedia(f), result);
    const output = join(f.root, "media.json");
    await writeBlogMediaReview(f, output);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    await assert.rejects(writeBlogMediaReview(f, output), /exist/);
    assert.deepEqual(JSON.parse(await readFile(output, "utf8")), result);
  }));
test("rejects modified source, derivative and built bytes without producing output", () =>
  using(async (f) => {
    const name = Object.values(BLOG_MEDIA_SOURCES)[0],
      paths = [
        join(f.assetsRoot, name),
        join(f.assetsRoot, f.manifest[name].default),
        join(
          f.builtPublicRoot,
          "assets",
          name.slice(0, -4) + "-1280-hash.webp",
        ),
      ];
    for (const path of paths) {
      const original = await readFile(path);
      await writeFile(path, Buffer.from("not an image"));
      await assert.rejects(prepareBlogMedia(f));
      await writeFile(path, original);
    }
  }));
test("rejects manifest mismatch, duplicate or missing widths and non-image claims", () =>
  using(async (f) => {
    const path = join(f.assetsRoot, "image-manifest.json"),
      name = Object.values(BLOG_MEDIA_SOURCES)[0];
    for (const mutate of [
      (m) => (m[name].sourceHash = "b".repeat(64)),
      (m) => m[name].sourceBytes++,
      (m) => (m[name].width = 1400),
      (m) => m[name].variants[0].height++,
      (m) => (m[name].variants[0].format = "svg"),
      (m) => (m[name].variants[1] = m[name].variants[0]),
      (m) => m[name].variants.pop(),
      (m) => (m[name].default = m[name].variants[0].path),
      (m) => (m[name].variants[0].path = "../escape.webp"),
    ]) {
      const m = structuredClone(f.manifest);
      mutate(m);
      await writeFile(path, JSON.stringify(m));
      await assert.rejects(prepareBlogMedia(f));
    }
    await writeFile(path, JSON.stringify(f.manifest));
  }));
test("rejects changed bundle shape, capture labels, missing articles and URL escape aliases", () =>
  using(async (f) => {
    for (const mutate of [
      (b) => (b.schemaVersion = 1),
      (b) => (b.canApply = true),
      (b) => b.articles.pop(),
      (b) => (b.articles[1] = b.articles[0]),
      (b) => (b.sourceFingerprint = "b".repeat(64)),
      (b) => (b.articles[0].source.hero.extra = "unknown"),
      (b) => (b.articles[0].editorial.content = "Changed body"),
      (b) => (b.articles[0].source.bodyHtml = "Changed source"),
      (b) => (b.articles[0].preservation.before.text = "Changed evidence"),
      (b) =>
        (b.articles[0].source.hero.image =
          "https://evil.test/assets/hero.webp"),
      (b) =>
        (b.articles[0].source.hero.srcset = "/assets/../../escape.webp 480w"),
    ]) {
      const b = structuredClone(f.bundle);
      mutate(b);
      await writeFile(f.reviewBundlePath, JSON.stringify(b));
      await assert.rejects(prepareBlogMedia(f));
    }
    await writeFile(f.reviewBundlePath, JSON.stringify(f.bundle));
    for (const url of [
      "https://evil.test/assets/x.webp",
      "//www.p1landmanagement.com/assets/x.webp",
      "/assets/%2e%2e/x.webp",
      "/assets/../x.webp",
      "/assets/x.webp?x=1",
    ]) {
      const b = structuredClone(f.bundle),
        old = b.articles[0].source.hero.image;
      b.articles[0].source.hero.image = url;
      b.articles[0].source.articleHtml =
        b.articles[0].source.articleHtml.replace(old, url);
      await writeFile(f.reviewBundlePath, JSON.stringify(b));
      await assert.rejects(prepareBlogMedia(f));
    }
  }));
test("rejects symlink files, symlink roots and oversized review input", () =>
  using(async (f) => {
    const alias = join(f.root, "alias");
    await symlink(f.assetsRoot, alias);
    await assert.rejects(
      prepareBlogMedia({ ...f, assetsRoot: alias }),
      /Symlinks/,
    );
    const name = Object.values(BLOG_MEDIA_SOURCES)[0],
      path = join(f.assetsRoot, name),
      copy = join(f.root, "copy.png");
    await writeFile(copy, await readFile(path));
    await rm(path);
    await symlink(copy, path);
    await assert.rejects(prepareBlogMedia(f), /Symlinks/);
    await rm(path);
    await writeFile(path, await readFile(copy));
    await writeFile(f.reviewBundlePath, "x".repeat(12 * 1024 * 1024 + 1));
    await assert.rejects(prepareBlogMedia(f), /oversized/);
  }));
