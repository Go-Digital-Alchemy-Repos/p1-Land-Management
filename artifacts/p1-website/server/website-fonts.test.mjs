import test from "node:test";
import assert from "node:assert/strict";
import { createWebsiteFontStore, fontStyles } from "./website-fonts.mjs";
const payload = (body = null, heading = null) => ({
  schemaVersion: 1,
  stackId: "p1-land-management",
  body,
  heading,
});
const inter = { name: "Inter", fallback: "sans-serif" },
  lora = { name: "Lora", fallback: "serif" };
test("font delivery uses fixed CSS and Google host, deduplicates families and preserves empty defaults", () => {
  assert.equal(fontStyles(payload()), "");
  const markup = fontStyles(payload(inter, lora));
  assert(markup.includes("--app-font-sans:'Inter',sans-serif"));
  assert(markup.includes("--app-font-serif:'Lora',serif"));
  assert(markup.includes("--app-font-display:'Lora',serif"));
  assert(
    markup.includes(
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;family=Lora:wght@400;700&amp;display=swap",
    ),
  );
  assert.equal(
    (fontStyles(payload(inter, inter)).match(/family=Inter/g) || []).length,
    1,
  );
  for (const bad of [
    { name: "</style><script>", fallback: "serif" },
    { name: "Inter", fallback: "url(evil)" },
    { name: "Inter", fallback: "serif", private: "x" },
    { name: "x".repeat(61), fallback: "serif" },
    "Inter",
    [],
    {},
  ])
    assert.throws(() => fontStyles(payload(bad)));
  assert.throws(() => fontStyles({ ...payload(), stackId: "foreign" }));
  assert.throws(() => fontStyles({ ...payload(), private: "x" }));
});
test("font cache coalesces and restores defaults after clearing or source failure", async () => {
  let time = 0,
    calls = 0,
    release,
    failed = false,
    value = payload(inter, lora);
  const store = createWebsiteFontStore({
    origin: "https://core.example/",
    now: () => time,
    fetcher: async (url, options) => {
      calls++;
      assert.equal(url, "https://core.example/api/p1/website-fonts");
      assert.deepEqual(options.headers, { Accept: "application/json" });
      assert.equal(options.redirect, "error");
      await new Promise((r) => (release = r));
      if (failed) throw Error("failed");
      return Response.json(value);
    },
  });
  const a = store.snapshot(),
    b = store.snapshot();
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await Promise.all([a, b]), [
    fontStyles(value),
    fontStyles(value),
  ]);
  time = 29999;
  assert(await store.snapshot());
  assert.equal(calls, 1);
  time = 30000;
  failed = true;
  const unavailable = store.snapshot();
  release();
  assert.equal(await unavailable, "");
  time = 60000;
  failed = false;
  const restored = store.snapshot();
  release();
  assert(await restored);
  time = 90000;
  value = payload();
  const cleared = store.snapshot();
  release();
  assert.equal(await cleared, "");
});
test("malformed, oversized and timed-out font reads produce no override", async () => {
  for (const response of [
    () => Response.json(payload(), { status: 503 }),
    () =>
      new Response("bad", { headers: { "content-type": "application/json" } }),
    () => Response.json(payload(), { headers: { "content-length": "16385" } }),
    () =>
      new Response(new Uint8Array([255]), {
        headers: { "content-type": "application/json" },
      }),
  ])
    assert.equal(
      await createWebsiteFontStore({
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
    await createWebsiteFontStore({
      origin: "https://core.example",
      fetcher: async () =>
        new Response(stream, {
          headers: { "content-type": "application/json" },
        }),
    }).snapshot(),
    "",
  );
  assert(cancelled);
  assert.equal(await createWebsiteFontStore({}).snapshot(), "");
  const timer = setTimeout(() => {}, 1000);
  try {
    assert.equal(
      await createWebsiteFontStore({
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
    clearTimeout(timer);
  }
});
