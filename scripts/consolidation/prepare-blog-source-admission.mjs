/** Read-only binding of captured HTML, reviewed defaults and explicit DB observations.
 * No database/provider access. The importer rechecks all observations under lock.
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { isDeepStrictEqual } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ARTICLE_SLUGS, prepareArticle } from "./prepare-blog-import.mjs";
const require = createRequire(
  new URL("../../platform/p1-core/package.json", import.meta.url),
);
const { JSDOM } = require("jsdom");
const sha = (value) => createHash("sha256").update(value).digest("hex");
export function hashSourceJson(value) {
  function canonical(input) {
    if (
      input === null ||
      typeof input === "string" ||
      typeof input === "boolean"
    )
      return JSON.stringify(input);
    if (typeof input === "number" && Number.isFinite(input))
      return JSON.stringify(input);
    if (Array.isArray(input)) {
      if (Object.keys(input).length !== input.length)
        throw Error("Sparse JSON array");
      return `[${input.map(canonical).join(",")}]`;
    }
    if (
      !input ||
      typeof input !== "object" ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))
    )
      throw Error("Plain JSON required");
    return `{${Object.keys(input)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(input[key])}`)
      .join(",")}}`;
  }
  return sha(canonical(value));
}
function requireMatch(value, message) {
  if (!value) throw Error(message);
}
export function prepareBlogSourceAdmission({
  reviewBundle,
  capturedHtml,
  reviewedManifest,
  sourceRows,
}) {
  requireMatch(
    reviewBundle?.schemaVersion === 2 &&
      reviewBundle.canApply === false &&
      reviewBundle.mode === "review-only",
    "Expected schema2 review-only bundle",
  );
  requireMatch(
    reviewedManifest?.client?.stackId === "p1-land-management",
    "Wrong Website manifest identity",
  );
  requireMatch(
    isDeepStrictEqual(
      Object.keys(capturedHtml || {}).sort(),
      [...ARTICLE_SLUGS].sort(),
    ),
    "Exactly five captured articles required",
  );
  const articles = ARTICLE_SLUGS.map((slug) =>
    prepareArticle(slug, capturedHtml[slug]),
  );
  requireMatch(
    isDeepStrictEqual(articles, reviewBundle.articles),
    "Captured HTML differs from reviewed articles",
  );
  requireMatch(
    articles.every(
      (article) => article.preservation.exactNormalizedContentMatch,
    ),
    "Unresolved content preservation differences",
  );
  const fingerprint = sha(
    JSON.stringify(
      articles.map(({ slug, htmlSha256, publishedSnapshotSha256 }) => ({
        slug,
        htmlSha256,
        publishedSnapshotSha256,
      })),
    ),
  );
  requireMatch(
    fingerprint === reviewBundle.sourceFingerprint,
    "Reviewed source fingerprint mismatch",
  );
  const captures = articles.map(({ slug }) => {
    const dom = new JSDOM(capturedHtml[slug]);
    try {
      return JSON.parse(
        dom.window.document.querySelector("#p1-published-content").textContent,
      );
    } finally {
      dom.window.close();
    }
  });
  requireMatch(
    captures.every(
      (capture) =>
        isDeepStrictEqual(capture.global, captures[0].global) &&
        capture.globalRevision === captures[0].globalRevision,
    ),
    "Global content changed during capture",
  );
  const identities = ARTICLE_SLUGS.map((slug, index) => ({
    routeId: `blog-${slug}`,
    componentKey: `blog-${slug}-content`,
    content: captures[index].content,
    revision: captures[index].revision,
  }));
  identities.push({
    routeId: "home",
    componentKey: "site-chrome",
    content: captures[0].global,
    revision: captures[0].globalRevision,
  });
  requireMatch(
    Array.isArray(sourceRows) && sourceRows.length === 6,
    "Six explicit source row observations required",
  );
  const seen = new Set();
  const components = identities.map(
    ({ routeId, componentKey, content, revision }) => {
      const matches = sourceRows.filter(
        (entry) =>
          entry.routeId === routeId && entry.componentKey === componentKey,
      );
      requireMatch(
        matches.length === 1,
        "Missing or duplicate source row observation",
      );
      const entry = matches[0];
      seen.add(entry);
      requireMatch(
        Object.hasOwn(entry, "row") &&
          (entry.row === null || typeof entry.row === "object"),
        "Explicit row or null required; revision0 does not prove absence",
      );
      const route = reviewedManifest.routes?.find(
        (candidate) => candidate.id === routeId,
      );
      const definition = reviewedManifest.puck?.editableComponents?.find(
        (candidate) => candidate.key === componentKey,
      );
      requireMatch(
        route &&
          definition &&
          route.editableRegions.some((region) =>
            definition.allowedRegions.includes(region),
          ),
        "Missing reviewed component definition",
      );
      const row = entry.row;
      if (row) {
        requireMatch(
          typeof row.id === "string" &&
            row.id.length > 0 &&
            Number.isSafeInteger(row.draftRevision) &&
            row.draftRevision >= 0,
          "Invalid source row identity",
        );
        requireMatch(
          (row.publishedContent === null && row.publishedRevision === null) ||
            (row.publishedContent &&
              typeof row.publishedContent === "object" &&
              !Array.isArray(row.publishedContent) &&
              Number.isSafeInteger(row.publishedRevision) &&
              row.publishedRevision > 0),
          "Inconsistent source publication",
        );
      }
      const mode = !row
        ? "absent"
        : row.publishedRevision === null
          ? "unpublished"
          : "published";
      const effective = { ...definition.defaultContent };
      if (mode === "published") {
        for (const [key, value] of Object.entries(row.publishedContent)) {
          const field = definition.fields.find(
            (candidate) => candidate.path === key,
          );
          requireMatch(
            field &&
              typeof value === "string" &&
              value.length <= (field.maxLength || 12000),
            "Source content rejected by Website field contract",
          );
          if (field.type === "image")
            requireMatch(
              (/^\/(?!\/)/.test(value) ||
                /^https:\/\/www\.p1landmanagement\.com\//.test(value)) &&
                !/[\u0000-\u001f\\]/.test(value),
              "Invalid Website image",
            );
          if (field.type === "ctaTarget")
            requireMatch(
              /^(\/(?!\/)|#[A-Za-z]|https:\/\/|mailto:|tel:)/.test(value) &&
                !/[\u0000-\u001f\\]/.test(value),
              "Invalid Website CTA",
            );
          effective[key] = value;
        }
      }
      requireMatch(
        revision === (row?.publishedRevision ?? 0),
        "Captured revision differs from source observation",
      );
      requireMatch(
        isDeepStrictEqual(effective, content),
        "Captured content differs from reviewed defaults and source observation",
      );
      return {
        routeId,
        componentKey,
        mode,
        rowId: row?.id ?? null,
        draftRevision: row?.draftRevision ?? null,
        publishedRevision: row?.publishedRevision ?? null,
        publishedContentSha256:
          mode === "published" ? hashSourceJson(row.publishedContent) : null,
        defaultContentSha256: hashSourceJson(definition.defaultContent),
        effectiveContentSha256: hashSourceJson(effective),
        capturedRevision: revision,
      };
    },
  );
  requireMatch(
    seen.size === sourceRows.length,
    "Unexpected source row observation",
  );
  return {
    schemaVersion: 1,
    mode: "review-only",
    canApply: false,
    sourceFingerprint: fingerprint,
    sourceAdmission: {
      schemaVersion: 1,
      stackId: "p1-land-management",
      websiteManifestSha256: hashSourceJson(reviewedManifest),
      components,
    },
    remainingChecks: [
      "Importer validates complete manifest and Core field contracts under database lock",
      "Deployment identity must still match reviewed Website artifact",
      "Caller observations do not establish current database state",
    ],
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const [input, output, ...extra] = process.argv.slice(2);
    if (!input || !output || extra.length)
      throw Error(
        "Usage: node prepare-blog-source-admission.mjs INPUT_JSON NEW_OUTPUT_JSON",
      );
    const raw = await readFile(input);
    if (raw.length > 20 * 1024 * 1024) throw Error("Input exceeds20MiB");
    const result = prepareBlogSourceAdmission(JSON.parse(raw));
    await writeFile(output, JSON.stringify(result, null, 2) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
    console.log(
      JSON.stringify({
        canApply: false,
        components: result.sourceAdmission.components.length,
        output,
      }),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
