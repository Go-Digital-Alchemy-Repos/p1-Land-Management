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

const chain = (length) =>
  Array.from({ length }, (_, index) => ({
    fromPath: `/hop-${index}`,
    toPath: `/hop-${index + 1}`,
    statusCode: index % 2 ? 302 : 301,
  }));
test("accepts exactly ten edges and retains authored mixed status codes and query strings", async () => {
  const projection = sample(chain(10));
  assert.deepEqual(parseWebsiteRedirects(projection), projection);
  for (const rule of projection.redirects)
    assert.deepEqual(
      await resolveWebsiteRedirect(
        { snapshot: async () => projection },
        rule.fromPath,
        "?source=a%2Fb&source=c",
        "HEAD",
      ),
      {
        status: rule.statusCode,
        location: rule.toPath + "?source=a%2Fb&source=c",
      },
    );
  assert.throws(
    () => parseWebsiteRedirects(sample(chain(11))),
    /chain too long/,
  );
  assert.throws(() =>
    parseWebsiteRedirects(
      sample([
        ...chain(10),
        { fromPath: "/other", toPath: "/hop-0", statusCode: 301 },
      ]),
    ),
  );
  assert.throws(
    () =>
      parseWebsiteRedirects(
        sample([
          { fromPath: "/a", toPath: "/b", statusCode: 301 },
          { fromPath: "/b", toPath: "/a", statusCode: 302 },
        ]),
      ),
    /cycle/,
  );
});
test("an overlong upstream projection never replaces the last valid rules", async () => {
  let time = 0,
    body = sample(chain(10));
  const store = createWebsiteRedirectStore({
    origin: "https://core.test",
    now: () => time,
    ttl: 10,
    fetcher: async () => Response.json(body),
  });
  const saved = await store.snapshot();
  time = 11;
  body = sample(chain(11));
  assert.deepEqual(await store.snapshot(), saved);
});
