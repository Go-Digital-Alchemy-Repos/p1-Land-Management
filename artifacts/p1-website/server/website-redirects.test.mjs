import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  createWebsiteRedirectStore,
  parseWebsiteRedirects,
  resolveWebsiteRedirect,
} from "./website-redirects.mjs";
const sample = (
  redirects = [{ fromPath: "/old", toPath: "/new", statusCode: 301 }],
) => ({
  schemaVersion: 1,
  stackId: "p1-land-management",
  version: createHash("sha256").update(JSON.stringify(redirects)).digest("hex"),
  redirects,
});
test("strict collection rejects unsafe destinations duplicates cycles and bad provenance", () => {
  assert.deepEqual(parseWebsiteRedirects(sample()), sample());
  for (const p of [{ secret: 1 }, { stackId: "other" }, { version: "bad" }])
    assert.throws(() => parseWebsiteRedirects({ ...sample(), ...p }));
  for (const toPath of [
    "//evil",
    "/api/x",
    "/setup",
    "/x.html",
    "/x%2f",
    "/x?q=1",
    "/x#y",
    "/x\\y",
    "/old",
  ])
    assert.throws(() =>
      parseWebsiteRedirects(
        sample([{ fromPath: "/old", toPath, statusCode: 301 }]),
      ),
    );
  assert.throws(() =>
    parseWebsiteRedirects(
      sample([...sample().redirects, ...sample().redirects]),
    ),
  );
});
test("GET HEAD preserve queries, guarded routes and POST never redirect", async () => {
  const store = { snapshot: async () => sample() };
  assert.deepEqual(
    await resolveWebsiteRedirect(store, "/old", "?utm_source=a&x=1", "GET"),
    { status: 301, location: "/new?utm_source=a&x=1" },
  );
  assert.equal(
    (await resolveWebsiteRedirect(store, "/old", "", "HEAD")).status,
    301,
  );
  assert.equal(await resolveWebsiteRedirect(store, "/old", "", "POST"), null);
  assert.equal(
    await resolveWebsiteRedirect(
      {
        snapshot: () => {
          throw Error();
        },
      },
      "/api/x",
      "",
      "GET",
    ),
    null,
  );
});
test("refresh failures retain previous rules while valid empty collection removes them", async () => {
  let time = 0,
    body = sample(),
    bad = false;
  const store = createWebsiteRedirectStore({
    origin: "https://core.test",
    now: () => time,
    ttl: 10,
    fetcher: async () => {
      if (bad) throw Error();
      return Response.json(body);
    },
  });
  assert(await resolveWebsiteRedirect(store, "/old", "", "GET"));
  time = 11;
  bad = true;
  assert(await resolveWebsiteRedirect(store, "/old", "", "GET"));
  time = 22;
  bad = false;
  body = sample([]);
  assert.equal(await resolveWebsiteRedirect(store, "/old", "", "GET"), null);
});
