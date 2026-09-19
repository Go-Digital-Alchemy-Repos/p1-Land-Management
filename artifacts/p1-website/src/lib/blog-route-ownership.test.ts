import test from "node:test";
import assert from "node:assert/strict";
import {
  staticBlogSlugs,
  staticBlogDisposition,
  observeBlogOwnership,
} from "./blog-route-ownership.ts";
const slug = "signs-property-drainage-problem";
test("static route dispatch needs authoritative ownership, never a missing-field fallback", () => {
  assert.equal(staticBlogDisposition(slug, undefined), "unknown");
  assert.equal(staticBlogDisposition(slug, null), "unknown");
  assert.equal(staticBlogDisposition(slug, []), "unowned");
  assert.equal(
    staticBlogDisposition(slug, [{ slug, postId: "post" }]),
    "owned",
  );
  assert.equal(staticBlogSlugs.size, 5);
});
test("browser retains known ownership across unrelated routes and rejects downgrade/remapping", () => {
  const owned = [{ slug, postId: "post" }];
  assert.deepEqual(observeBlogOwnership([], owned), owned);
  for (const value of [undefined, null, [], [{ slug, postId: "other" }]])
    assert.throws(() => observeBlogOwnership(owned, value));
  assert.deepEqual(
    observeBlogOwnership(owned, [
      ...owned,
      { slug: "best-grass-large-acreage-carolinas", postId: "second" },
    ]),
    [
      ...owned,
      { slug: "best-grass-large-acreage-carolinas", postId: "second" },
    ],
  );
  assert.throws(() =>
    observeBlogOwnership([], [{ slug: "unknown-route", postId: "post" }]),
  );
  assert.throws(() => observeBlogOwnership([], [...owned, ...owned]));
});
