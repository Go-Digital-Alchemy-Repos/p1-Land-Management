/** Read-only review bundle for the five existing website-owned articles.
 * Does not connect to a database, upload media, or publish content.
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { validateBlogPresentation } from "../../platform/p1-core/shared/blog-presentation.ts";
import { sanitizePublicRichHtml } from "../../platform/p1-core/shared/sanitize-rich-html.ts";
const require = createRequire(
  new URL("../../platform/p1-core/package.json", import.meta.url),
);
const { JSDOM } = require("jsdom");
export const ARTICLE_SLUGS = Object.freeze([
  "land-clearing-cost-per-acre-south-carolina",
  "how-to-manage-retention-pond-south-carolina",
  "best-grass-large-acreage-carolinas",
  "signs-property-drainage-problem",
  "preparing-land-agricultural-use-carolinas",
]);
const origin = "https://www.p1landmanagement.com";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const text = (node) => (node?.textContent || "").replace(/\s+/g, " ").trim();
function exactly(root, selector) {
  const nodes = root.querySelectorAll(selector);
  if (nodes.length !== 1) throw Error(`Expected exactly one ${selector}`);
  return nodes[0];
}
function contentEvidence(root) {
  return {
    text: text(root),
    // Formatting and code whitespace are content too; normalized prose alone
    // would falsely accept a flattened table or collapsed code block.
    structure: [...root.querySelectorAll("*")].map((n) =>
      n.tagName.toLowerCase(),
    ),
    codeBlocks: [...root.querySelectorAll("pre,code")].map(
      (n) => n.textContent,
    ),
    headings: [...root.querySelectorAll("h2,h3,h4")].map((n) => ({
      level: n.tagName.toLowerCase(),
      text: text(n),
    })),
    links: [...root.querySelectorAll("a")].map((n) => ({
      text: text(n),
      href: n.getAttribute("href"),
      target: n.getAttribute("target"),
      rel: n.getAttribute("rel"),
    })),
    images: [...root.querySelectorAll("img")].map((n) => ({
      src: n.getAttribute("src"),
      alt: n.getAttribute("alt"),
    })),
  };
}
function schemaArticles(value) {
  if (Array.isArray(value)) return value.flatMap(schemaArticles);
  if (!value || typeof value !== "object") return [];
  const types = [value["@type"]].flat();
  return [
    ...(types.some((t) => ["Article", "BlogPosting"].includes(t))
      ? [value]
      : []),
    ...schemaArticles(value["@graph"]),
  ];
}
export function prepareArticle(slug, html) {
  if (!ARTICLE_SLUGS.includes(slug)) throw Error("Unknown static article");
  if (typeof html !== "string" || Buffer.byteLength(html) > 2 * 1024 * 1024)
    throw Error("Invalid article size");
  // jsdom has no resource loader or script execution enabled. Treat captured HTML as data.
  const dom = new JSDOM(html, { url: origin + "/blog/" + slug });
  const doc = dom.window.document;
  try {
    const canonical = exactly(doc, 'link[rel="canonical"]').getAttribute(
      "href",
    );
    if (canonical !== origin + "/blog/" + slug)
      throw Error("Canonical route mismatch");
    const snapshot = JSON.parse(
      exactly(doc, "#p1-published-content").textContent,
    );
    if (
      snapshot.route !== "/blog/" + slug ||
      ![snapshot.revision, snapshot.globalRevision].every(
        (n) => Number.isSafeInteger(n) && n >= 0,
      )
    )
      throw Error("Invalid published snapshot identity");
    const main = exactly(doc, "main");
    const article = exactly(main, "article");
    const title = exactly(article, "h1");
    const sections = article.querySelectorAll(":scope > section");
    if (sections.length !== 2) throw Error("Unexpected static article layout");
    const hero = sections[0],
      body = exactly(sections[1], ".prose");
    const aside = exactly(main, ":scope > aside");
    const image = exactly(hero, "img");
    const eyebrow = exactly(hero, ".site-shell > div > span");
    const ld = [
      ...doc.querySelectorAll('script[type="application/ld+json"]'),
    ].flatMap((n) => schemaArticles(JSON.parse(n.textContent)));
    if (ld.length !== 1) throw Error("Expected one article schema");
    const combined = doc.createElement("div");
    combined.innerHTML = body.innerHTML + aside.innerHTML;
    const bodyContent = sanitizePublicRichHtml(body.innerHTML);
    const relatedContent = sanitizePublicRichHtml(aside.innerHTML);
    const proposed = bodyContent + relatedContent;
    const titleParts = [];
    for (const child of title.childNodes) {
      if (child.nodeType === 8) continue; // React separators have no visible content.
      if (
        child.nodeType !== 3 &&
        (child.nodeName !== "EM" ||
          [...child.childNodes].some(
            (n) => n.nodeType !== 3 && n.nodeType !== 8,
          ))
      )
        throw Error("Unsupported hero title markup; review before import");
      titleParts.push({
        text: child.textContent.replace(/\s+/g, " "),
        emphasis: child.nodeName === "EM",
      });
    }
    if (
      !ld[0].author ||
      typeof ld[0].author.name !== "string" ||
      !ld[0].author.name.trim()
    )
      throw Error("Explicit article author identity required");
    const presentation = {
      schemaVersion: 1,
      layout: "editorial",
      eyebrow: text(eyebrow),
      titleParts,
      imageAlt: image.getAttribute("alt"),
      relatedContent,
      structuredData: {
        type: ld[0]["@type"],
        headline: ld[0].headline,
        description: ld[0].description,
        authorType: ld[0].author["@type"],
        publishedDate: ld[0].datePublished ?? null,
        modifiedDate: ld[0].dateModified ?? null,
      },
    };
    if (!validateBlogPresentation(presentation, text(title)))
      throw Error(
        "Unsupported article presentation or declared date; review before import",
      );
    const sanitized = doc.createElement("div");
    sanitized.innerHTML = proposed;
    const before = contentEvidence(combined),
      after = contentEvidence(sanitized);
    const differences = Object.keys(before).filter(
      (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
    );
    const editorial = {
      title: text(title),
      slug,
      content: bodyContent,
      authorName: ld[0].author.name,
      presentation,
      seoTitle: text(exactly(doc, "title")),
      seoDescription: exactly(doc, 'meta[name="description"]').getAttribute(
        "content",
      ),
    };
    return {
      slug,
      canonical,
      htmlSha256: hash(html),
      publishedSnapshotSha256: hash(JSON.stringify(snapshot)),
      revisions: { page: snapshot.revision, global: snapshot.globalRevision },
      source: {
        articleHtml: article.outerHTML,
        bodyHtml: body.innerHTML,
        asideHtml: aside.innerHTML,
        hero: {
          eyebrow: text(eyebrow),
          titleHtml: title.innerHTML,
          image: image.getAttribute("src"),
          imageAlt: image.getAttribute("alt"),
          srcset: image.getAttribute("srcset"),
        },
        articleSchema: ld[0],
        assets: [
          ...doc.querySelectorAll('script[src],link[rel="stylesheet"]'),
        ].map((n) => n.getAttribute("src") || n.getAttribute("href")),
      },
      editorial,
      preservation: {
        before,
        after,
        differences,
        exactNormalizedContentMatch: differences.length === 0,
      },
      declaredDates: {
        published: ld[0].datePublished ?? null,
        modified: ld[0].dateModified ?? null,
        historicallyVerified: false,
      },
      reviewRequired: [
        "date provenance",
        "reviewed organization identity",
        "presentation editor and public-renderer parity",
        "immutable registered media",
        "durable route ownership and withdrawal",
        "reviewed source fingerprint",
      ],
    };
  } finally {
    dom.window.close();
  }
}
export async function prepareBlogImport({
  inputDirectory,
  sourceRevision,
  deploymentId,
}) {
  if (
    !/^[a-f0-9]{40}$/.test(sourceRevision || "") ||
    !/^[a-f0-9-]{36}$/.test(deploymentId || "")
  )
    throw Error("Exact observed source revision and deployment ID required");
  const articles = [];
  for (const slug of ARTICLE_SLUGS)
    articles.push(
      prepareArticle(
        slug,
        await readFile(join(inputDirectory, slug + ".html"), "utf8"),
      ),
    );
  const fingerprint = hash(
    JSON.stringify(
      articles.map((a) => ({
        slug: a.slug,
        htmlSha256: a.htmlSha256,
        publishedSnapshotSha256: a.publishedSnapshotSha256,
      })),
    ),
  );
  return {
    schemaVersion: 2,
    mode: "review-only",
    canApply: false,
    deploymentObservation: {
      sourceRevision,
      deploymentId,
      verification: "caller-supplied; correlate with Railway release evidence",
    },
    sourceFingerprint: fingerprint,
    articles,
    summary: {
      count: articles.length,
      preserved: articles.filter(
        (a) => a.preservation.exactNormalizedContentMatch,
      ).length,
      unresolved:
        "Production import and route transfer are not implemented by this tool.",
    },
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const [
      inputDirectory,
      outputDirectory,
      sourceRevision,
      deploymentId,
      ...extra
    ] = process.argv.slice(2);
    if (!inputDirectory || !outputDirectory || extra.length)
      throw Error(
        "Usage: node scripts/consolidation/prepare-blog-import.mjs INPUT_DIR NEW_OUTPUT_DIR SOURCE_SHA DEPLOYMENT_ID",
      );
    const bundle = await prepareBlogImport({
      inputDirectory,
      sourceRevision,
      deploymentId,
    });
    await mkdir(outputDirectory, { mode: 0o700 }); // Refuse to overwrite an earlier reviewed bundle.
    await writeFile(
      join(outputDirectory, "review.json"),
      JSON.stringify(bundle, null, 2) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        mode: bundle.mode,
        canApply: bundle.canApply,
        sourceFingerprint: bundle.sourceFingerprint,
        summary: bundle.summary,
        outputDirectory,
      }),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
