import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { ARTICLE_SLUGS, prepareArticle } from "./prepare-blog-import.mjs";
import {
  hashSourceJson,
  prepareBlogSourceAdmission,
} from "./prepare-blog-source-admission.mjs";

function fixture() {
  const identities = ARTICLE_SLUGS.map((slug) => [
    `blog-${slug}`,
    `blog-${slug}-content`,
  ]);
  identities.push(["home", "site-chrome"]);
  const reviewedManifest = {
    client: { stackId: "p1-land-management" },
    routes: identities.map(([id]) => ({ id, editableRegions: ["main"] })),
    puck: {
      editableComponents: identities.map(([, key]) => ({
        key,
        allowedRegions: ["main"],
        fields: [{ path: "text", type: "text", maxLength: 100 }],
        defaultContent: { text: "Default" },
      })),
    },
  };
  const sourceRows = identities.map(([routeId, componentKey]) => ({
    routeId,
    componentKey,
    row: null,
  }));
  const capturedHtml = Object.fromEntries(
    ARTICLE_SLUGS.map((slug) => [
      slug,
      `<!doctype html><html><head><title>SEO</title><meta name="description" content="Description"><link rel="canonical" href="https://www.p1landmanagement.com/blog/${slug}"><script type="application/ld+json">${JSON.stringify({ "@type": "Article", headline: "Title", description: "Description", author: { "@type": "Organization", name: "P1" } })}</script></head><body><main><article><section><img src="/assets/test.webp" alt="Site"><div class="site-shell"><div><span>Eyebrow</span><h1>Title</h1></div></div></section><section><div class="prose"><p>Body</p></div></section></article><aside><p>Related</p></aside></main><script id="p1-published-content" type="application/json">${JSON.stringify({ route: `/blog/${slug}`, revision: 0, globalRevision: 0, content: { text: "Default" }, global: { text: "Default" } })}</script></body></html>`,
    ]),
  );
  const input = { reviewedManifest, sourceRows, capturedHtml };
  refresh(input);
  return input;
}
function refresh(input) {
  const articles = ARTICLE_SLUGS.map((slug) =>
    prepareArticle(slug, input.capturedHtml[slug]),
  );
  input.reviewBundle = {
    schemaVersion: 2,
    canApply: false,
    mode: "review-only",
    articles,
    sourceFingerprint: createHash("sha256")
      .update(
        JSON.stringify(
          articles.map(({ slug, htmlSha256, publishedSnapshotSha256 }) => ({
            slug,
            htmlSha256,
            publishedSnapshotSha256,
          })),
        ),
      )
      .digest("hex"),
  };
}
test("binds explicit absence and all six effective snapshots with deterministic canonical hashes", () => {
  const input = fixture();
  const result = prepareBlogSourceAdmission(input);
  assert.equal(result.canApply, false);
  assert.equal(result.sourceAdmission.components.length, 6);
  assert(
    result.sourceAdmission.components.every(
      (component) => component.mode === "absent" && component.rowId === null,
    ),
  );
  assert.equal(
    hashSourceJson({ b: 2, a: { d: 4, c: 3 } }),
    hashSourceJson({ a: { c: 3, d: 4 }, b: 2 }),
  );
  assert.deepEqual(result, prepareBlogSourceAdmission(input));
});
test("revision zero retains unpublished row identity rather than guessing absence", () => {
  const input = fixture();
  input.sourceRows[0].row = {
    id: "existing",
    draftRevision: 5,
    publishedRevision: null,
    publishedContent: null,
  };
  const component =
    prepareBlogSourceAdmission(input).sourceAdmission.components[0];
  assert.equal(component.mode, "unpublished");
  assert.equal(component.draftRevision, 5);
  assert.equal(component.rowId, "existing");
});
test("rejects altered capture, bundle, missing/duplicate observations and inconsistent source state", () => {
  for (const mutate of [
    (input) => {
      input.capturedHtml[ARTICLE_SLUGS[0]] += "changed";
    },
    (input) => {
      input.reviewBundle.sourceFingerprint = "a".repeat(64);
    },
    (input) => {
      input.sourceRows.pop();
    },
    (input) => {
      input.sourceRows[1] = input.sourceRows[0];
    },
    (input) => {
      delete input.sourceRows[0].row;
    },
    (input) => {
      input.sourceRows[0].row = {
        id: "row",
        draftRevision: 1,
        publishedRevision: 2,
        publishedContent: null,
      };
    },
    (input) => {
      input.reviewedManifest.puck.editableComponents[0].defaultContent.text =
        "Changed";
    },
  ]) {
    const input = fixture();
    mutate(input);
    assert.throws(() => prepareBlogSourceAdmission(input));
  }
});
test("published content requires matching capture revision and effective values", () => {
  const input = fixture();
  input.sourceRows[0].row = {
    id: "row",
    draftRevision: 4,
    publishedRevision: 3,
    publishedContent: { text: "Published" },
  };
  assert.throws(() => prepareBlogSourceAdmission(input), /revision/);
  input.capturedHtml[ARTICLE_SLUGS[0]] = input.capturedHtml[ARTICLE_SLUGS[0]]
    .replace('"revision":0', '"revision":3')
    .replace('"content":{"text":"Default"}', '"content":{"text":"Published"}');
  refresh(input);
  const component =
    prepareBlogSourceAdmission(input).sourceAdmission.components[0];
  assert.equal(component.mode, "published");
  assert.equal(
    component.publishedContentSha256,
    hashSourceJson({ text: "Published" }),
  );
  input.sourceRows[0].row.publishedContent.text = null;
  assert.throws(() => prepareBlogSourceAdmission(input), /field contract/);
});
test("rejects mixed global captures even when every article was independently reviewed", () => {
  const input = fixture();
  input.capturedHtml[ARTICLE_SLUGS[1]] = input.capturedHtml[
    ARTICLE_SLUGS[1]
  ].replace('"global":{"text":"Default"}', '"global":{"text":"Changed"}');
  refresh(input);
  assert.throws(
    () => prepareBlogSourceAdmission(input),
    /Global content changed/,
  );
});
