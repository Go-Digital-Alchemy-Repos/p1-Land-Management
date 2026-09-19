import test from "node:test";
import assert from "node:assert/strict";
import {
  parseWebsiteSocial,
  createWebsiteSocialStore,
} from "./website-social.mjs";
const payload = (links = [], iconStyle = "brand") => ({
  schemaVersion: 1,
  stackId: "p1-land-management",
  links,
  iconStyle,
});
const link = { platform: "facebook", url: "https://example.test/profile" };
test("public social projection is strict, bounded and contains only safe known platforms", () => {
  assert.deepEqual(parseWebsiteSocial(payload([link], "outline")), {
    links: [link],
    iconStyle: "outline",
  });
  for (const bad of [
    payload([link, link]),
    payload([{ ...link, platform: "unknown" }]),
    payload([{ ...link, secret: "x" }]),
    payload([{ ...link, url: "javascript:bad()" }]),
    payload([{ ...link, url: "https://user:secret@example.test" }]),
    payload([{ ...link, url: "https://example.test/a b" }]),
    payload([], "custom"),
    { ...payload(), private: "secret" },
    { ...payload(), stackId: "other" },
  ])
    assert.throws(() => parseWebsiteSocial(bad));
  const platforms = [
    "facebook",
    "instagram",
    "linkedin",
    "x",
    "tiktok",
    "youtube",
    "pinterest",
    "houzz",
    "yelp",
    "nextdoor",
  ];
  assert.equal(
    parseWebsiteSocial(
      payload(platforms.map((platform) => ({ ...link, platform }))),
    ).links.length,
    10,
  );
});
test("social refresh coalesces, strips credentials, clears links and drops expired data on failure", async () => {
  let time = 0,
    calls = 0,
    release,
    value = payload([link], "solid"),
    failed = false;
  const store = createWebsiteSocialStore({
    origin: "https://core.example/",
    now: () => time,
    fetcher: async (url, options) => {
      calls++;
      assert.equal(url, "https://core.example/api/p1/website-social");
      assert.deepEqual(options.headers, { Accept: "application/json" });
      assert.equal(options.redirect, "error");
      await new Promise((r) => (release = r));
      if (failed) throw Error("unavailable");
      return Response.json(value);
    },
  });
  const a = store.snapshot(),
    b = store.snapshot();
  release();
  assert.deepEqual(await Promise.all([a, b]), [
    { links: [link], iconStyle: "solid" },
    { links: [link], iconStyle: "solid" },
  ]);
  assert.equal(calls, 1);
  time = 30000;
  failed = true;
  const failedRead = store.snapshot();
  release();
  assert.deepEqual(await failedRead, { links: [], iconStyle: "brand" });
  time = 60000;
  failed = false;
  const recovered = store.snapshot();
  release();
  assert.equal((await recovered).links.length, 1);
  time = 90000;
  value = payload();
  const cleared = store.snapshot();
  release();
  assert.deepEqual(await cleared, { links: [], iconStyle: "brand" });
});
test("oversized social projections cancel their stream and return no links", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(32769));
    },
    cancel() {
      cancelled = true;
    },
  });
  assert.deepEqual(
    await createWebsiteSocialStore({
      origin: "https://core.example",
      fetcher: async () =>
        new Response(stream, {
          headers: { "content-type": "application/json" },
        }),
    }).snapshot(),
    { links: [], iconStyle: "brand" },
  );
  assert(cancelled);
});
