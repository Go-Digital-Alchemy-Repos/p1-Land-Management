import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkClientRedirect,
  clientRedirectDestination,
} from "./website-redirects.ts";
const projection = (
  redirects = [{ fromPath: "/old", toPath: "/contact", statusCode: 301 }],
) => ({
  schemaVersion: 1,
  stackId: "p1-land-management",
  version: "a".repeat(64),
  redirects,
});
test("client redirects preserve the browser query and reject unsafe paths, cycles and provenance", () => {
  assert.equal(
    clientRedirectDestination(projection(), "/old", "?x=%2F&x=2"),
    "/contact?x=%2F&x=2",
  );
  assert.equal(clientRedirectDestination(projection(), "/other", ""), null);
  assert.equal(
    clientRedirectDestination(
      { ...projection(), stackId: "other" },
      "/old",
      "",
    ),
    null,
  );
  for (const toPath of [
    "//evil.test",
    "https://evil.test",
    "/api/private",
    "/old",
    "/testimonials",
    "/contact?x=1",
  ])
    assert.equal(
      clientRedirectDestination(
        projection([{ fromPath: "/old", toPath, statusCode: 301 }]),
        "/old",
        "",
      ),
      null,
    );
  assert.equal(
    clientRedirectDestination(
      projection([
        { fromPath: "/old", toPath: "/next", statusCode: 301 },
        { fromPath: "/next", toPath: "/old", statusCode: 302 },
      ]),
      "/old",
      "",
    ),
    null,
  );
});
test("request uses only the fixed public projection without credentials and fails open on errors", async () => {
  const signal = new AbortController().signal;
  const fetcher: typeof fetch = async (url, options) => {
    assert.equal(url, "/api/p1/website-redirects");
    assert.equal(options?.credentials, "omit");
    assert.equal(options?.redirect, "error");
    return Response.json(projection());
  };
  assert.equal(
    await checkClientRedirect("/old", "?utm_source=qa", signal, fetcher),
    "/contact?utm_source=qa",
  );
  assert.equal(
    await checkClientRedirect("/old", "", signal, async () => {
      throw Error("network");
    }),
    null,
  );
  assert.equal(
    await checkClientRedirect(
      "/old",
      "",
      signal,
      async () => new Response("failure", { status: 503 }),
    ),
    null,
  );
});
test("late results from aborted checks cannot redirect", async () => {
  const abort = new AbortController();
  const result = checkClientRedirect("/old", "", abort.signal, async () => {
    abort.abort();
    return Response.json(projection());
  });
  assert.equal(await result, null);
});
