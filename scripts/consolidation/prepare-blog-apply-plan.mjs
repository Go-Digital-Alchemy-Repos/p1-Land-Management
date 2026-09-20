/** Privileged local review preparation only. No database/provider access or apply entrypoint. */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { isDeepStrictEqual } from "node:util";
import { constants } from "node:fs";
import {
  lstat,
  open,
  mkdtemp,
  writeFile,
  rm,
  realpath,
} from "node:fs/promises";
import { resolve, join, sep, relative, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ARTICLE_SLUGS, prepareBlogImport } from "./prepare-blog-import.mjs";
import { prepareBlogMedia } from "./prepare-blog-media.mjs";
import {
  prepareBlogSourceAdmission,
  hashSourceJson,
} from "./prepare-blog-source-admission.mjs";
const require = createRequire(
  new URL("../../platform/p1-core/package.json", import.meta.url),
);
const requireTs = require("tsx/cjs/api").require;
// Pure schema modules only. Never load server services, DB configuration, or provider clients.
const { clientSiteManifestSchema } = requireTs(
  fileURLToPath(
    new URL(
      "../../platform/p1-core/shared/client-site-manifest.ts",
      import.meta.url,
    ),
  ),
  import.meta.url,
);
const { blogEditorialSchema } = requireTs(
  fileURLToPath(
    new URL(
      "../../platform/p1-core/shared/schema/blog-publications.ts",
      import.meta.url,
    ),
  ),
  import.meta.url,
);
const sharp = require("sharp");
const { JSDOM } = require("jsdom");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const optionKeys = [
  "captureDirectory",
  "listingHtmlPath",
  "reviewBundlePath",
  "mediaReviewPath",
  "reviewedManifestPath",
  "sourceRowsPath",
  "assetsRoot",
  "builtPublicRoot",
  "actorId",
  "datePolicy",
  "sourceRevision",
  "deploymentId",
];
function assert(value, message) {
  if (!value) throw Error(message);
}
function exact(value, keys) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join() === [...keys].sort().join()
  );
}
async function checkedPath(path) {
  assert(
    typeof path === "string" &&
      path.length > 0 &&
      path.length <= 4096 &&
      !/[\u0000-\u001f\\]/.test(path) &&
      !path.split("/").includes(".."),
    "Invalid artifact path",
  );
  const absolute = resolve(path);
  let current = sep;
  for (const part of absolute.split(sep).filter(Boolean)) {
    current = join(current, part);
    assert(
      !(await lstat(current)).isSymbolicLink(),
      "Artifact symlinks are not permitted",
    );
  }
  return absolute;
}
async function readBounded(path, maxBytes) {
  const absolute = await checkedPath(path);
  const handle = await open(
    absolute,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const before = await handle.stat();
    assert(
      before.isFile() && before.size > 0 && before.size <= maxBytes,
      "Artifact size/type exceeds bounds",
    );
    const buffer = Buffer.alloc(before.size + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.length - offset,
        null,
      );
      if (!bytesRead) break;
      offset += bytesRead;
    }
    const after = await handle.stat();
    assert(
      offset === before.size &&
        after.size === before.size &&
        after.mtimeMs === before.mtimeMs,
      "Artifact changed while reading",
    );
    return {
      path: absolute,
      bytes: buffer.subarray(0, offset),
      sha256: sha(buffer.subarray(0, offset)),
    };
  } finally {
    await handle.close();
  }
}
async function directory(path) {
  const absolute = await checkedPath(path);
  assert(
    (await lstat(absolute)).isDirectory(),
    "Explicit artifact directory required",
  );
  return absolute;
}
async function rooted(root, path) {
  assert(
    typeof path === "string" &&
      path &&
      !path.startsWith("/") &&
      !path.includes("\\") &&
      !path.split("/").some((part) => !part || part === "." || part === ".."),
    "Invalid rooted artifact path",
  );
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  assert(
    rel && rel !== ".." && !rel.startsWith(`..${sep}`),
    "Artifact escapes selected root",
  );
  return checkedPath(absolute);
}
const metadata = (file) => ({
  sourceSlug: file.sourceSlug,
  role: file.role,
  sha256: file.sha256,
  bytes: file.bytes,
  mime: file.mime,
  width: file.width,
  height: file.height,
  quality: file.quality,
});
const fileOrder = (a, b) =>
  a.sourceSlug.localeCompare(b.sourceSlug) ||
  a.role.localeCompare(b.role) ||
  a.width - b.width;
/** Mirrors importer normalization, tested against its actual extracted pure functions. */
export function preparedBlogPlanHash(plan, actorId) {
  const normalized = {
    ...plan,
    articles: plan.articles
      .map((article) => blogEditorialSchema.parse(article))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
    sourceAdmission: {
      ...plan.sourceAdmission,
      components: [...plan.sourceAdmission.components].sort(
        (a, b) =>
          a.routeId.localeCompare(b.routeId) ||
          a.componentKey.localeCompare(b.componentKey),
      ),
    },
  };
  return hashSourceJson({ plan: normalized, actorId });
}
export function extractBlogListing(html, articles) {
  const dom = new JSDOM(html, { url: "https://www.p1landmanagement.com/blog" });
  const normalized = (value) => value.replace(/\s+/g, " ").trim();
  const assetUrl = (value) =>
    value?.replace(/^https:\/\/www\.p1landmanagement\.com/, "");
  function imageSet(value) {
    assert(
      typeof value === "string",
      "Listing responsive image set is missing",
    );
    const entries = value.split(",").map((part) => {
      const match = /^\s*(\S+)\s+(480|768|1280)w\s*$/.exec(part);
      assert(match, "Invalid listing responsive image set");
      return [Number(match[2]), assetUrl(match[1])];
    });
    assert(
      entries.length === 3 && new Set(entries.map((e) => e[0])).size === 3,
      "Listing must retain all three cover variants",
    );
    return entries.sort((a, b) => a[0] - b[0]);
  }
  try {
    const doc = dom.window.document,
      canonicals = doc.querySelectorAll('link[rel="canonical"]');
    assert(
      canonicals.length === 1 &&
        canonicals[0].getAttribute("href") ===
          "https://www.p1landmanagement.com/blog",
      "Listing canonical mismatch",
    );
    const cards = [...doc.querySelectorAll('a[href^="/blog/"]')].filter(
      (link) => link.querySelector("h2"),
    );
    assert(
      cards.length === 5,
      "Exactly five original Blog listing cards required",
    );
    const excerpts = {},
      differences = [];
    for (const card of cards) {
      const slug = card.getAttribute("href").slice("/blog/".length),
        article = articles.find((a) => a.slug === slug);
      assert(
        article && !Object.hasOwn(excerpts, slug),
        "Missing, duplicate or unknown Blog listing card",
      );
      const headings = card.querySelectorAll("h2"),
        paragraphs = card.querySelectorAll("p"),
        images = card.querySelectorAll("img");
      assert(
        headings.length === 1 && paragraphs.length === 1 && images.length === 1,
        "Listing card must have one title, excerpt and cover image",
      );
      const title = normalized(headings[0].textContent),
        canonicalTitle = normalized(article.editorial.title);
      assert(
        title.toLowerCase() === canonicalTitle.toLowerCase(),
        "Listing title differs from reviewed article title",
      );
      if (title !== canonicalTitle)
        differences.push({
          sourceSlug: slug,
          kind: "listing-title-capitalization",
          listingTitle: title,
          canonicalHeroTitle: canonicalTitle,
        });
      const excerpt = paragraphs[0].textContent;
      assert(
        excerpt.trim().length > 0 && excerpt.length <= 12000,
        "Listing excerpt is missing or exceeds bounds",
      );
      assert(
        assetUrl(images[0].getAttribute("src")) ===
          assetUrl(article.source.hero.image) &&
          isDeepStrictEqual(
            imageSet(images[0].getAttribute("srcset")),
            imageSet(article.source.hero.srcset),
          ),
        "Listing cover differs from reviewed responsive media",
      );
      excerpts[slug] = excerpt;
    }
    return { excerpts, differences };
  } finally {
    dom.window.close();
  }
}
export async function prepareBlogApplyPlan(options) {
  assert(exact(options, optionKeys), "Exact Blog preparation options required");
  const { actorId, datePolicy, sourceRevision, deploymentId } = options;
  assert(
    typeof actorId === "string" &&
      actorId.trim() === actorId &&
      actorId.length > 0 &&
      actorId.length <= 200 &&
      !/[\u0000-\u001f]/.test(actorId),
    "Explicit actor ID required",
  );
  assert(
    ["retain-declared", "clear-unverified"].includes(datePolicy),
    "Explicit declared-date policy required",
  );
  assert(
    /^[a-f0-9]{40}$/.test(sourceRevision) &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        deploymentId,
      ),
    "Exact reviewed source revision and deployment ID required",
  );
  const captureDirectory = await directory(options.captureDirectory),
    assetsRoot = await directory(options.assetsRoot),
    builtPublicRoot = await directory(options.builtPublicRoot);
  const inputs = [];
  async function artifact(path, max, role) {
    const item = await readBounded(path, max);
    inputs.push({
      role,
      path: item.path,
      bytes: item.bytes.length,
      sha256: item.sha256,
    });
    return item;
  }
  const listingFile = await artifact(
    options.listingHtmlPath,
    2 * 1024 * 1024,
    "blog-listing",
  );
  const review = await artifact(
    options.reviewBundlePath,
    12 * 1024 * 1024,
    "review-bundle",
  );
  const media = await artifact(
    options.mediaReviewPath,
    5 * 1024 * 1024,
    "media-review",
  );
  const manifestFile = await artifact(
    options.reviewedManifestPath,
    5 * 1024 * 1024,
    "website-manifest",
  );
  const sourceFile = await artifact(
    options.sourceRowsPath,
    5 * 1024 * 1024,
    "source-rows",
  );
  const reviewBundle = JSON.parse(review.bytes),
    mediaReview = JSON.parse(media.bytes),
    reviewedManifest = JSON.parse(manifestFile.bytes),
    sourceRows = JSON.parse(sourceFile.bytes);
  clientSiteManifestSchema.parse(reviewedManifest);
  const capturedHtml = {};
  const privateRoot = await realpath(tmpdir());
  const capturedCopy = await mkdtemp(
    join(privateRoot, "p1-blog-plan-capture-"),
  );
  let reconstructed;
  try {
    for (const slug of ARTICLE_SLUGS) {
      const capture = await artifact(
        await rooted(captureDirectory, `${slug}.html`),
        2 * 1024 * 1024,
        `capture:${slug}`,
      );
      capturedHtml[slug] = capture.bytes.toString("utf8");
      await writeFile(join(capturedCopy, `${slug}.html`), capture.bytes, {
        flag: "wx",
        mode: 0o600,
      });
    }
    // Existing mapper reads only our private bounded copies, never mutable original paths.
    reconstructed = await prepareBlogImport({
      inputDirectory: capturedCopy,
      sourceRevision,
      deploymentId,
    });
  } finally {
    await rm(capturedCopy, { recursive: true, force: true });
  }
  assert(
    isDeepStrictEqual(reconstructed, reviewBundle),
    "Raw captures or reviewed editorial/deployment claims differ from the review bundle",
  );
  const checkedMedia = await prepareBlogMedia({
    reviewBundlePath: review.path,
    assetsRoot,
    builtPublicRoot,
  });
  assert(
    isDeepStrictEqual(checkedMedia, mediaReview),
    "Original/variant media or supplied media-review claims changed",
  );
  const listing = extractBlogListing(
    listingFile.bytes.toString("utf8"),
    reconstructed.articles,
  );
  const source = prepareBlogSourceAdmission({
    reviewBundle: reconstructed,
    capturedHtml,
    reviewedManifest,
    sourceRows,
  });
  const files = [];
  let total = 0;
  const seenHash = new Set();
  await artifact(
    await rooted(assetsRoot, "image-manifest.json"),
    2 * 1024 * 1024,
    "image-manifest",
  );
  for (const file of checkedMedia.files) {
    const sourceSlug = file.sourceRoute.slice("/blog/".length);
    assert(
      ARTICLE_SLUGS.includes(sourceSlug),
      "Unknown reviewed media article",
    );
    const local = await artifact(
      await rooted(assetsRoot, file.logicalSourceFile),
      10 * 1024 * 1024,
      `media:${sourceSlug}:${file.role}:${file.width}`,
    );
    total += local.bytes.length;
    assert(
      total <= 50 * 1024 * 1024,
      "Reviewed media exceeds total staging bounds",
    );
    assert(
      local.bytes.length === file.bytes &&
        local.sha256 === file.sha256 &&
        !seenHash.has(file.sha256),
      "Reviewed media changed or has duplicate content identities",
    );
    seenHash.add(file.sha256);
    // Match staging's full decode; metadata alone does not prove a non-truncated image.
    await sharp(local.bytes, { limitInputPixels: 40_000_000 }).raw().toBuffer();
    const servedPaths = [];
    for (const url of file.capturedUrls) {
      const assetPath = url
        .replace(/^https:\/\/www\.p1landmanagement\.com/, "")
        .slice(1);
      const served = await artifact(
        await rooted(builtPublicRoot, assetPath),
        10 * 1024 * 1024,
        `served-media:${sourceSlug}:${file.width}`,
      );
      assert(
        served.sha256 === file.sha256,
        "Built served image differs from reviewed media",
      );
      servedPaths.push(served.path);
    }
    files.push({
      ...metadata({ ...file, sourceSlug }),
      relativePath: file.logicalSourceFile,
      path: local.path,
      servedPaths,
    });
  }
  assert(files.length === 20, "Twenty verified media files required");
  files.sort(fileOrder);
  const articles = reconstructed.articles
    .map((article) =>
      blogEditorialSchema.parse({
        ...article.editorial,
        // Source extraction has no authored values for these optional fields. Preserve the
        // five static articles' plain publication behavior; do not invent taxonomy or links.
        excerpt: listing.excerpts[article.slug],
        coverImageUrl: article.source.hero.image,
        coverImagePositionX: 50,
        coverImagePositionY: 50,
        category: null,
        categories: [],
        tags: [],
        postType: "article",
        podcastUrl: null,
        externalUrl: null,
        sidebarId: null,
        ogImageUrl: null,
        noindex: false,
      }),
    )
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const plan = {
    schemaVersion: 1,
    reviewBundleSha256: review.sha256,
    sourceFingerprint: reconstructed.sourceFingerprint,
    mediaReviewSha256: media.sha256,
    fileManifestSha256: hashSourceJson(files.map(metadata)),
    sourceRevision,
    deploymentId,
    datePolicy,
    sourceAdmission: {
      ...source.sourceAdmission,
      components: [...source.sourceAdmission.components].sort(
        (a, b) =>
          a.routeId.localeCompare(b.routeId) ||
          a.componentKey.localeCompare(b.componentKey),
      ),
    },
    reviewedManifest,
    articles,
  };
  // Re-check every original evidence file after preparation, before exposing a prepared result.
  for (const input of inputs) {
    const current = await readBounded(input.path, input.bytes);
    assert(
      current.sha256 === input.sha256,
      "Evidence changed during preparation",
    );
  }
  return {
    schemaVersion: 1,
    mode: "prepare-only",
    canApply: false,
    actorId,
    plan,
    expectedPlanSha256: preparedBlogPlanHash(plan, actorId),
    files,
    audit: {
      inputs,
      differences: listing.differences,
      checks: [
        "Raw captures re-extracted and complete review bundle matched",
        "Originals, derivatives and built served copies reverified",
        "All images fully decoded without re-encoding",
        "Source admission reconstructed from explicit observations and reviewed defaults",
      ],
      remaining: [
        "No live source freshness or deployment verification performed",
        "No object staging, database writes, publication or ownership transfer performed",
        "Apply requires fresh source fence and separate explicit authorization",
        "Declared dates remain unverified historical claims unless independently reviewed",
      ],
    },
  };
}
export async function writeBlogApplyPlan(options, outputPath) {
  assert(
    typeof outputPath === "string" && !outputPath.split("/").includes(".."),
    "Invalid output path",
  );
  const output = resolve(outputPath);
  await directory(dirname(output));
  const result = await prepareBlogApplyPlan(options);
  const bytes = Buffer.from(JSON.stringify(result, null, 2) + "\n");
  assert(
    bytes.length <= 20 * 1024 * 1024,
    "Prepared plan exceeds output bounds",
  );
  const handle = await open(
    output,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(bytes);
  } finally {
    await handle.close();
  }
  return { result, output };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const [input, output, ...extra] = process.argv.slice(2);
    assert(
      input && output && !extra.length,
      "Usage: node prepare-blog-apply-plan.mjs OPTIONS_JSON NEW_OUTPUT_JSON",
    );
    const options = JSON.parse((await readBounded(input, 64 * 1024)).bytes);
    const prepared = await writeBlogApplyPlan(options, output);
    console.log(
      JSON.stringify({
        canApply: false,
        articles: 5,
        files: 20,
        expectedPlanSha256: prepared.result.expectedPlanSha256,
        output: prepared.output,
      }),
    );
  } catch {
    console.error("Blog plan preparation failed; no apply was performed.");
    process.exitCode = 1;
  }
}
