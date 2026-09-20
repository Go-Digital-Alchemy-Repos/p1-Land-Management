import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  realpath,
  stat,
  symlink,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { prepareBlogImport } from "./prepare-blog-import.mjs";
import { BLOG_MEDIA_SOURCES, prepareBlogMedia } from "./prepare-blog-media.mjs";
import {
  prepareBlogApplyPlan,
  writeBlogApplyPlan,
} from "./prepare-blog-apply-plan.mjs";
const require = createRequire(
  new URL("../../platform/p1-core/package.json", import.meta.url),
);
const sharp = require("sharp"),
  ts = require("typescript"),
  esbuild = require("esbuild");
const core = fileURLToPath(new URL("../../platform/p1-core/", import.meta.url));
const sha = (b) => createHash("sha256").update(b).digest("hex");
async function fixture() {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "blog-apply-plan-")),
  );
  const assetsRoot = join(root, "sources"),
    builtPublicRoot = join(root, "public"),
    captureDirectory = join(root, "capture");
  await Promise.all([
    mkdir(join(assetsRoot, "optimized"), { recursive: true }),
    mkdir(join(builtPublicRoot, "assets"), { recursive: true }),
    mkdir(captureDirectory),
  ]);
  const reviewedManifest = JSON.parse(
    await readFile(join(core, "config/p1-client-site-manifest.json"), "utf8"),
  );
  const globals = reviewedManifest.puck.editableComponents.find(
    (c) => c.key === "site-chrome",
  ).defaultContent;
  const imageManifest = {},
    sourceRows = [];
  for (const [index, [slug, name]] of Object.entries(
    BLOG_MEDIA_SOURCES,
  ).entries()) {
    const original = await sharp({
      create: {
        width: 1408,
        height: 768,
        channels: 3,
        background: { r: 40 + index * 30, g: 100, b: 150 },
      },
    })
      .png()
      .toBuffer();
    await writeFile(join(assetsRoot, name), original);
    const stem = name.slice(0, -4);
    imageManifest[name] = {
      sourceBytes: original.length,
      sourceHash: sha(original),
      width: 1408,
      height: 768,
      default: `optimized/${stem}-1280.webp`,
      variants: [],
    };
    for (const width of [480, 768, 1280]) {
      const data = await sharp(original)
        .resize({ width })
        .webp({ quality: 78 })
        .toBuffer();
      const path = `optimized/${stem}-${width}.webp`;
      await writeFile(join(assetsRoot, path), data);
      await writeFile(
        join(builtPublicRoot, `assets/${stem}-${width}-hash.webp`),
        data,
      );
      imageManifest[name].variants.push({
        path,
        format: "webp",
        width,
        height: Math.round((768 * width) / 1408),
        bytes: data.length,
        quality: 78,
      });
    }
    const routeId = `blog-${slug}`,
      componentKey = `blog-${slug}-content`;
    sourceRows.push({ routeId, componentKey, row: null });
    const content = reviewedManifest.puck.editableComponents.find(
      (c) => c.key === componentKey,
    ).defaultContent;
    const state = {
      route: `/blog/${slug}`,
      revision: 0,
      globalRevision: 0,
      content,
      global: globals,
    };
    const image = `/assets/${stem}-1280-hash.webp`,
      srcset = [480, 768, 1280]
        .map((w) => `/assets/${stem}-${w}-hash.webp ${w}w`)
        .join(", ");
    const html = `<!doctype html><html><head><title>SEO title</title><meta name="description" content="Description"><link rel="canonical" href="https://www.p1landmanagement.com/blog/${slug}"><script type="application/ld+json">${JSON.stringify({ "@type": "Article", headline: "Reviewed title", description: "Description", author: { "@type": "Organization", name: "P1 Land & Property Management" }, datePublished: "2026-06-24", dateModified: "2026-09-14" })}</script></head><body><main><article><section><img src="${image}" srcset="${srcset}" alt="Reviewed landscape"><div class="site-shell"><div><span>Insights</span><h1>Reviewed <em>title</em></h1></div></div></section><section><div class="prose"><p>Reviewed body</p></div></section></article><aside><p><a href="/contact">Contact</a></p></aside></main><script id="p1-published-content" type="application/json">${JSON.stringify(state)}</script></body></html>`;
    await writeFile(join(captureDirectory, `${slug}.html`), html);
  }
  sourceRows.push({ routeId: "home", componentKey: "site-chrome", row: null });
  await writeFile(
    join(assetsRoot, "image-manifest.json"),
    JSON.stringify(imageManifest),
  );
  const options = {
    captureDirectory,
    listingHtmlPath: join(root, "listing.html"),
    reviewBundlePath: join(root, "review.json"),
    mediaReviewPath: join(root, "media-review.json"),
    reviewedManifestPath: join(root, "manifest.json"),
    sourceRowsPath: join(root, "source-rows.json"),
    assetsRoot,
    builtPublicRoot,
    actorId: "synthetic-owner",
    datePolicy: "clear-unverified",
    sourceRevision: "a".repeat(40),
    deploymentId: "00000000-0000-0000-0000-000000000000",
  };
  await writeFile(
    options.listingHtmlPath,
    `<html><head><link rel="canonical" href="https://www.p1landmanagement.com/blog"></head><body>${Object.entries(
      BLOG_MEDIA_SOURCES,
    )
      .map(([slug, name]) => {
        const stem = name.slice(0, -4);
        return `<a href="/blog/${slug}"><img src="/assets/${stem}-1280-hash.webp" srcset="${[480, 768, 1280].map((w) => `/assets/${stem}-${w}-hash.webp ${w}w`).join(", ")}"><h2>Reviewed Title</h2><p>Exact summary for ${slug}.</p></a>`;
      })
      .join("")}</body></html>`,
  );
  const review = await prepareBlogImport({
    inputDirectory: captureDirectory,
    sourceRevision: options.sourceRevision,
    deploymentId: options.deploymentId,
  });
  await writeFile(
    options.reviewBundlePath,
    JSON.stringify(review, null, 2) + "\n",
  );
  const media = await prepareBlogMedia(options);
  await writeFile(
    options.mediaReviewPath,
    JSON.stringify(media, null, 2) + "\n",
  );
  await writeFile(
    options.reviewedManifestPath,
    JSON.stringify(reviewedManifest),
  );
  await writeFile(options.sourceRowsPath, JSON.stringify(sourceRows));
  return { root, options, review, media };
}
async function using(fn) {
  const f = await fixture();
  try {
    return await fn(f);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
}
async function importerPureFunctions() {
  const importer = await readFile(
    join(core, "server/services/blog-static-import.service.ts"),
    "utf8",
  );
  const source = await readFile(
    join(core, "server/services/blog-import-source.service.ts"),
    "utf8",
  );
  function extract(text, names) {
    const ast = ts.createSourceFile(
      "pure.ts",
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const found = [];
    for (const node of ast.statements) {
      const identifiers = ts.isVariableStatement(node)
        ? node.declarationList.declarations.map((d) => d.name.getText(ast))
        : node.name
          ? [node.name.getText(ast)]
          : [];
      if (identifiers.some((name) => names.includes(name)))
        found.push(node.getText(ast));
    }
    assert.equal(
      found.length,
      names.length,
      "Exact pure helper declarations located",
    );
    return found.join("\n");
  }
  const program = `import {createHash} from 'node:crypto'; import {z} from 'zod'; import {blogEditorialSchema,STATIC_BLOG_SOURCE_SLUGS} from './shared/schema/blog-publications'; import {clientSiteManifestSchema} from './shared/client-site-manifest'; class CmsMutationError extends Error {constructor(status,code,message){super(message)}}\n${extract(source, ["digest", "componentAdmission", "blogImportSourceAdmissionSchema", "hashBlogImportJson"])}\n${extract(importer, ["hash", "planSchema", "conflict", "staticBlogFileManifest", "hashStaticBlogFileManifest", "parsePlan", "hashStaticBlogImportPlan"])}`;
  const build = await esbuild.build({
    stdin: { contents: program, loader: "ts", resolveDir: core },
    bundle: true,
    packages: "external",
    platform: "node",
    format: "cjs",
    write: false,
    logLevel: "silent",
    metafile: true,
  });
  assert(
    Object.keys(build.metafile.inputs).every(
      (path) => !path.includes("server/"),
    ),
    "No database/server runtime imported",
  );
  const module = { exports: {} };
  new Function("require", "module", "exports", build.outputFiles[0].text)(
    require,
    module,
    module.exports,
  );
  return module.exports;
}
test("verified plan matches actual importer canonical hashes and writes an exclusive private artifact", () =>
  using(async (f) => {
    const { result, output } = await writeBlogApplyPlan(
      f.options,
      join(f.root, "prepared.json"),
    );
    assert.equal(result.canApply, false);
    assert.equal(result.plan.datePolicy, "clear-unverified");
    assert.equal(result.files.length, 20);
    assert.equal(result.plan.articles.length, 5);
    assert(result.audit.inputs.length >= 40);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    const helpers = await importerPureFunctions();
    assert.equal(
      result.expectedPlanSha256,
      helpers.hashStaticBlogImportPlan(result.plan, f.options.actorId),
    );
    assert.equal(
      result.plan.fileManifestSha256,
      helpers.hashStaticBlogFileManifest(result.files),
    );
    assert.equal(
      result.plan.reviewBundleSha256,
      sha(await readFile(f.options.reviewBundlePath)),
    );
    assert.equal(
      result.plan.mediaReviewSha256,
      sha(await readFile(f.options.mediaReviewPath)),
    );
    assert.equal(
      result.plan.articles[0].presentation.structuredData.publishedDate,
      "2026-06-24",
      "date clearing remains explicit importer operation",
    );
    assert(
      result.plan.articles.every((a) => !Object.hasOwn(a, "coverImageSet")),
    );
    await assert.rejects(writeBlogApplyPlan(f.options, output), /EEXIST/);
  }));
test("raw capture and editorial tampering cannot be covered by unchanged claimed review hashes", () =>
  using(async (f) => {
    const capture = join(
      f.options.captureDirectory,
      `${f.review.articles[0].slug}.html`,
    );
    const original = await readFile(capture);
    await writeFile(
      capture,
      original.toString().replace("Reviewed body", "Altered body"),
    );
    await assert.rejects(prepareBlogApplyPlan(f.options), /Raw captures/);
    await writeFile(capture, original);
    const changed = structuredClone(f.review);
    changed.articles[0].editorial.content = "<p>Forged</p>";
    await writeFile(f.options.reviewBundlePath, JSON.stringify(changed));
    await assert.rejects(prepareBlogApplyPlan(f.options), /Raw captures/);
  }));
test("changed source observations or defaults fail admission even when syntactically valid", () =>
  using(async (f) => {
    const rows = JSON.parse(await readFile(f.options.sourceRowsPath));
    rows[0].row = {
      id: "new-row",
      draftRevision: 1,
      publishedRevision: 1,
      publishedContent: {},
    };
    await writeFile(f.options.sourceRowsPath, JSON.stringify(rows));
    await assert.rejects(prepareBlogApplyPlan(f.options), /Captured revision/);
    rows[0].row = null;
    await writeFile(f.options.sourceRowsPath, JSON.stringify(rows));
    const manifest = JSON.parse(await readFile(f.options.reviewedManifestPath));
    const def = manifest.puck.editableComponents.find(
      (c) => c.key === rows[0].componentKey,
    );
    const key = Object.keys(def.defaultContent)[0];
    def.defaultContent[key] = "Changed default";
    await writeFile(f.options.reviewedManifestPath, JSON.stringify(manifest));
    await assert.rejects(prepareBlogApplyPlan(f.options), /Captured content/);
  }));
test("forged media evidence, modified original and built derivatives are rejected", () =>
  using(async (f) => {
    const media = structuredClone(f.media);
    media.files[0].sha256 = "0".repeat(64);
    await writeFile(f.options.mediaReviewPath, JSON.stringify(media));
    await assert.rejects(
      prepareBlogApplyPlan(f.options),
      /media-review claims/,
    );
    await writeFile(
      f.options.mediaReviewPath,
      JSON.stringify(f.media, null, 2) + "\n",
    );
    const original = join(
        f.options.assetsRoot,
        f.media.files[0].logicalSourceFile,
      ),
      bytes = await readFile(original);
    await writeFile(original, Buffer.from("tampered"));
    await assert.rejects(prepareBlogApplyPlan(f.options));
    await writeFile(original, bytes);
    const variant = f.media.files.find((v) => v.role === "variant");
    const built = join(
      f.options.builtPublicRoot,
      variant.capturedUrls[0].slice(1),
    );
    await writeFile(built, Buffer.from("changed served copy"));
    await assert.rejects(prepareBlogApplyPlan(f.options), /built asset/);
  }));
test("explicit actor, date policy, deployment and source identity cannot be omitted or substituted", () =>
  using(async (f) => {
    for (const patch of [
      { actorId: "" },
      { datePolicy: undefined },
      { sourceRevision: "b".repeat(40) },
      { deploymentId: "11111111-1111-1111-1111-111111111111" },
      { extra: "unreviewed" },
    ])
      await assert.rejects(prepareBlogApplyPlan({ ...f.options, ...patch }));
  }));
test("symlinks, traversal and oversized inputs are rejected without output overwrite", () =>
  using(async (f) => {
    const linked = join(f.root, "linked.json");
    await symlink(f.options.reviewBundlePath, linked);
    await assert.rejects(
      prepareBlogApplyPlan({ ...f.options, reviewBundlePath: linked }),
      /symlinks/,
    );
    await assert.rejects(
      prepareBlogApplyPlan({
        ...f.options,
        reviewBundlePath: join(f.root, "capture") + "/../review.json",
      }),
      /path/,
    );
    const huge = join(f.root, "huge.json");
    await writeFile(huge, Buffer.alloc(5 * 1024 * 1024 + 1, 32));
    await assert.rejects(
      prepareBlogApplyPlan({ ...f.options, sourceRowsPath: huge }),
      /bounds/,
    );
    await assert.rejects(writeBlogApplyPlan(f.options, linked), /EEXIST/);
  }));

test("listing excerpts and capitalization are retained and tampered card identity/media rejected", () =>
  using(async (f) => {
    const result = await prepareBlogApplyPlan(f.options);
    assert(
      result.plan.articles.every(
        (a) => a.excerpt === `Exact summary for ${a.slug}.`,
      ),
    );
    assert.equal(result.audit.differences.length, 5);
    const original = await readFile(f.options.listingHtmlPath, "utf8");
    for (const changed of [
      original.replace(/<p>[^<]*<\/p>/, "<p></p>"),
      original.replace("Reviewed Title", "Unreviewed title"),
      original.replace("480-hash.webp 480w", "480-other.webp 480w"),
      original.replace(
        'href="/blog/land-clearing-cost-per-acre-south-carolina"',
        'href="/blog/unknown"',
      ),
    ]) {
      await writeFile(f.options.listingHtmlPath, changed);
      await assert.rejects(
        prepareBlogApplyPlan(f.options),
        /Listing|listing|card/,
      );
    }
  }));
