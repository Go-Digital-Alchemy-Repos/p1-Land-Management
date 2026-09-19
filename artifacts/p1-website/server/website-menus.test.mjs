import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createWebsiteMenuStore,
  menuLocations,
  parseWebsiteMenus,
  safeMenuDestination,
} from "./website-menus.mjs";

const item = (extra = {}) => ({
  id: "link",
  label: "About",
  url: "/about",
  openInNewTab: false,
  action: "internal-link",
  formSlug: null,
  modalTitle: null,
  modalDescription: null,
  children: [],
  ...extra,
});
const menu = (items = [item()]) => ({ id: "menu", version: 1, items });
const projection = (value = menu()) => ({
  schemaVersion: 1,
  stackId: "p1-land-management",
  revision: "a".repeat(64),
  locations: Object.fromEntries(
    menuLocations.map((key, i) => [key, i === 0 ? value : null]),
  ),
});
const json = (value) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });

test("URL safety mirrors the shared policy including encoded browser normalization tricks", () => {
  for (const value of [
    "/",
    "/about?a=b#team",
    "/space%20here",
    "#",
    "#team_1",
    "https://example.org/path",
    "http://example.org",
    "mailto:info@example.org",
    "tel:+1(555)123-4567",
  ])
    assert.equal(safeMenuDestination(value), true, value);
  for (const value of [
    "//evil.test",
    "/\\evil.test",
    "/bad%0a",
    "/%5cevil.test",
    "javascript:alert(1)",
    "https://user:password@example.org",
    "https://example.org/a b",
    "/#bad%zz",
    "about",
    "#bad:anchor",
    "tel:1",
    "mailto:a@b",
    "HTTPS://example.org",
  ])
    assert.equal(safeMenuDestination(value), false, value);
});
test("strict envelope rejects incorrect schema, stack, revision, locations and excess bytes", () => {
  for (const value of [
    null,
    [],
    { ...projection(), schemaVersion: 2 },
    { ...projection(), stackId: "other" },
    { ...projection(), revision: 2 },
    { ...projection(), private: "unexpected" },
    { ...projection(), locations: {} },
    {
      ...projection(),
      locations: { ...projection().locations, legacy_footer: null },
    },
    { ...projection(), revision: "z".repeat(270337) },
  ])
    assert.throws(() => parseWebsiteMenus(value));
});
test("null and deliberately empty assignments remain distinct and valid public fields survive", () => {
  assert.equal(
    parseWebsiteMenus(projection(null)).locations.main_navigation,
    null,
  );
  assert.deepEqual(
    parseWebsiteMenus(projection(menu([]))).locations.main_navigation,
    menu([]),
  );
  const modal = item({
    action: "form-modal",
    url: "#",
    formSlug: "Contact_Form",
    modalTitle: "Contact",
    modalDescription: "First\nSecond\tline",
  });
  assert.deepEqual(
    parseWebsiteMenus(projection(menu([modal]))).locations.main_navigation
      .items,
    [modal],
  );
});
test("invalid slot is isolated and cannot carry unknown fields or unsafe links", () => {
  const invalids = [
    { ...menu(), version: Number.MAX_SAFE_INTEGER + 1 },
    { ...menu(), extra: "private" },
    menu([item({ url: "javascript:alert(1)" })]),
    menu([item({ pageId: "private" })]),
    menu([item({ children: [item()] })]),
    menu([item({ formSlug: "unexpected" })]),
    menu([
      item({
        action: "form-modal",
        url: "#",
        formSlug: "active",
        openInNewTab: true,
      }),
    ]),
    menu([item({ label: "\u0000" })]),
  ];
  for (const bad of invalids) {
    const value = projection(bad);
    value.locations.p1_footer_company = menu([]);
    const parsed = parseWebsiteMenus(value);
    assert.equal(parsed.locations.main_navigation, null);
    assert.deepEqual(parsed.locations.p1_footer_company, menu([]));
  }
});
test("depth and count are bounded per slot with three levels and 200 items allowed", () => {
  const tree = (levels) =>
    item({
      id: `level-${levels}`,
      children: levels > 1 ? [tree(levels - 1)] : [],
    });
  assert.ok(
    parseWebsiteMenus(projection(menu([tree(3)]))).locations.main_navigation,
  );
  assert.equal(
    parseWebsiteMenus(projection(menu([tree(4)]))).locations.main_navigation,
    null,
  );
  const rows = Array.from({ length: 201 }, (_, i) => item({ id: `item-${i}` }));
  assert.ok(
    parseWebsiteMenus(projection(menu(rows.slice(0, 200)))).locations
      .main_navigation,
  );
  assert.equal(
    parseWebsiteMenus(projection(menu(rows))).locations.main_navigation,
    null,
  );
});
test("slot byte cap counts UTF-8 bytes, not JavaScript characters", () => {
  const rows = Array.from({ length: 70 }, (_, i) =>
    item({ id: `item-${i}`, label: "界".repeat(300) }),
  );
  const value = menu(rows);
  assert.ok(JSON.stringify(value).length < 65536);
  assert.ok(Buffer.byteLength(JSON.stringify(value)) > 65536);
  assert.equal(
    parseWebsiteMenus(projection(value)).locations.main_navigation,
    null,
  );
});
test("store coalesces requests, refreshes at 30 seconds and retains last valid on transport or malformed envelopes", async () => {
  let clock = 100,
    calls = 0,
    next = projection(),
    fail = false;
  const store = createWebsiteMenuStore({
    origin: "https://core.example/",
    now: () => clock,
    fetcher: async (url, options) => {
      calls++;
      assert.equal(url, "https://core.example/api/p1/website-menus");
      assert.equal(options.redirect, "error");
      assert.equal(options.headers.Accept, "application/json");
      if (fail) throw Error("offline");
      return json(next);
    },
  });
  const first = await Promise.all([store.snapshot(), store.snapshot()]);
  assert.deepEqual(first[0], first[1]);
  assert.equal(calls, 1);
  clock = 30099;
  await store.snapshot();
  assert.equal(calls, 1);
  clock = 30100;
  fail = true;
  assert.deepEqual(await store.snapshot(), first[0]);
  assert.equal(calls, 2);
  clock += 30000;
  fail = false;
  next = { ...projection(), schemaVersion: 2 };
  assert.deepEqual(await store.snapshot(), first[0]);
  clock += 30000;
  next = projection(menu([]));
  assert.deepEqual(
    (await store.snapshot()).locations.main_navigation.items,
    [],
  );
  clock += 30000;
  next = projection(null);
  assert.equal((await store.snapshot()).locations.main_navigation, null);
});
test("restart loads last-valid private disk cache; corrupted or oversized cache falls back", async () => {
  const cacheDir = await mkdtemp(path.join(tmpdir(), "p1-menu-cache-"));
  try {
    const saved = await createWebsiteMenuStore({
      cacheDir,
      origin: "https://core.example",
      fetcher: async () => json(projection()),
    }).snapshot();
    const file = path.join(cacheDir, "website-menus.json");
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), saved);
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    assert.deepEqual(
      await createWebsiteMenuStore({
        cacheDir,
        origin: "https://core.example",
        fetcher: async () => {
          throw Error("offline");
        },
      }).snapshot(),
      saved,
    );
    assert.deepEqual(
      await createWebsiteMenuStore({ cacheDir }).snapshot(),
      saved,
    );
    for (const content of ['{"schemaVersion":2}', "x".repeat(270337)]) {
      await writeFile(file, content);
      assert.equal(await createWebsiteMenuStore({ cacheDir }).snapshot(), null);
    }
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});
test("invalid status, redirects, type, oversized streamed response and malformed UTF-8 never replace last-valid", async () => {
  let clock = 100,
    response = json(projection());
  const store = createWebsiteMenuStore({
    origin: "https://core.example",
    now: () => clock,
    fetcher: async () => response,
  });
  const saved = await store.snapshot();
  for (const bad of [
    new Response("{}", { status: 503 }),
    new Response("{}", {
      status: 302,
      headers: { location: "https://evil.test" },
    }),
    new Response("{}", { headers: { "content-type": "text/html" } }),
    new Response("x".repeat(270337), {
      headers: { "content-type": "application/json" },
    }),
    new Response(new Uint8Array([0xff]), {
      headers: { "content-type": "application/json" },
    }),
  ]) {
    response = bad;
    clock += 30000;
    assert.deepEqual(await store.snapshot(), saved);
  }
});

test("timeout aborts an unresponsive refresh and retains the last valid snapshot", async () => {
  let clock = 100,
    fail = false,
    aborted = false;
  const store = createWebsiteMenuStore({
    origin: "https://core.example",
    now: () => clock,
    timeout: 10,
    fetcher: async (_url, { signal }) => {
      if (!fail) return json(projection());
      return new Promise((_resolve, reject) => {
        const watchdog = setTimeout(
          () => reject(Error("Abort was not observed")),
          1000,
        );
        signal.addEventListener(
          "abort",
          () => {
            aborted = true;
            clearTimeout(watchdog);
            reject(signal.reason);
          },
          { once: true },
        );
      });
    },
  });
  const saved = await store.snapshot();
  clock += 30000;
  fail = true;
  assert.deepEqual(await store.snapshot(), saved);
  assert.equal(aborted, true);
});
