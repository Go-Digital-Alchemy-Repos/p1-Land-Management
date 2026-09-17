import test from "node:test";
import assert from "node:assert/strict";
import { createWebsiteColorStore, colorStyles } from "./website-colors.mjs";
const payload = (colors) => ({
  schemaVersion: 1,
  stackId: "p1-land-management",
  colors,
});
test("fixed palette produces CSS tokens and selectors without executable CSS", () => {
  assert.equal(colorStyles(payload({})), "");
  const css = colorStyles(
    payload({
      brand_primary_color: "#FF0000",
      text_body_color: "#123456",
      text_h1_color: "#ABCDEF",
      text_link_color: "#000000",
    }),
  );
  assert(css.includes("--primary:0 100% 50%"));
  assert(css.includes("--card-foreground:210 65% 20%"));
  assert(css.includes("h1{color:#ABCDEF}"));
  assert(css.includes(".public-link{color:#000000}"));
  for (const colors of [
    { text_body_color: "</style><script>bad()</script>" },
    { text_body_color: "url(https://bad)" },
    { unknown: "#123456" },
    { text_body_color: null },
    [],
    null,
  ])
    assert.throws(() => colorStyles(payload(colors)));
});
test("refresh coalesces, drops stale values after failure and propagates clearing", async () => {
  let time = 0,
    calls = 0,
    release,
    value = payload({ brand_primary_color: "#FF0000" }),
    failed = false;
  const store = createWebsiteColorStore({
    origin: "https://core.example/",
    now: () => time,
    fetcher: async (url, options) => {
      calls++;
      assert.equal(url, "https://core.example/api/p1/website-colors");
      assert.deepEqual(options.headers, { Accept: "application/json" });
      assert.equal(options.redirect, "error");
      await new Promise((r) => (release = r));
      if (failed) throw Error("unavailable");
      return Response.json(value);
    },
  });
  const a = store.snapshot(),
    b = store.snapshot();
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await Promise.all([a, b]), [
    colorStyles(value),
    colorStyles(value),
  ]);
  time = 29999;
  assert(await store.snapshot());
  assert.equal(calls, 1);
  time = 30000;
  failed = true;
  const failedRead = store.snapshot();
  release();
  assert.equal(await failedRead, "");
  time = 60000;
  failed = false;
  const restored = store.snapshot();
  release();
  assert(await restored);
  time = 90000;
  value = payload({});
  const cleared = store.snapshot();
  release();
  assert.equal(await cleared, "");
});
test("invalid transport or payload fails to built-in colors with bounded reads", async () => {
  const responses = [
    () => Response.json({ ...payload({}), stackId: "other" }),
    () => Response.json({ ...payload({}), secret: "private" }),
    () => Response.json(payload({}), { status: 503 }),
    () =>
      new Response("bad", { headers: { "content-type": "application/json" } }),
    () =>
      Response.json(payload({}), { headers: { "content-length": "16385" } }),
    () =>
      new Response(new Uint8Array([255]), {
        headers: { "content-type": "application/json" },
      }),
  ];
  for (const response of responses)
    assert.equal(
      await createWebsiteColorStore({
        origin: "https://core.example",
        fetcher: async () => response(),
      }).snapshot(),
      "",
    );
  let cancelled = false;
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(16385));
    },
    cancel() {
      cancelled = true;
    },
  });
  assert.equal(
    await createWebsiteColorStore({
      origin: "https://core.example",
      fetcher: async () =>
        new Response(stream, {
          headers: { "content-type": "application/json" },
        }),
    }).snapshot(),
    "",
  );
  assert(cancelled);
  assert.equal(await createWebsiteColorStore({}).snapshot(), "");
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    assert.equal(
      await createWebsiteColorStore({
        origin: "https://core.example",
        timeout: 5,
        fetcher: async (_url, { signal }) =>
          new Promise((_r, reject) =>
            signal.addEventListener("abort", () => reject(signal.reason), {
              once: true,
            }),
          ),
      }).snapshot(),
      "",
    );
  } finally {
    clearTimeout(keepAlive);
  }
});
