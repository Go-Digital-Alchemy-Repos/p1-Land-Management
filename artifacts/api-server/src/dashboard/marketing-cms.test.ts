import { test } from "node:test";
import assert from "node:assert/strict";
import { isCapability } from "@workspace/api-zod/business-access";
import {
  callCms,
  cmsOperations,
  cmsDestination,
} from "./marketing-cms.transport";
const connection = {
  origin: "https://core.example.test",
  key: "synthetic-key",
};
const operation = (method: string, path: string) =>
  cmsOperations.find((item) => item.method === method && item.path === path)!;

test("CMS allowlist uses current leaf grants, exact paths and bounded query parameters", () => {
  assert(cmsOperations.length > 40);
  assert.equal(
    new Set(cmsOperations.map((item) => `${item.method} ${item.path}`)).size,
    cmsOperations.length,
  );
  assert(
    cmsOperations.every(
      (item) =>
        item.capabilities.length && item.capabilities.every(isCapability),
    ),
  );
  assert.deepEqual(
    operation("POST", "/pages/:id/relationships/remove-menu-items")
      .capabilities,
    ["marketing.content.pages", "marketing.content.menus"],
  );
  for (const id of [
    "../users",
    "%2fusers",
    "https://example.test",
    "abc?force=true",
    "a\\b",
    ".",
    "x".repeat(161),
  ])
    assert.throws(
      () => cmsDestination(operation("PUT", "/pages/:id"), { id }, {}),
      /identifier/,
    );
  assert.throws(
    () =>
      cmsDestination(
        { method: "GET", path: "/users", capabilities: [] },
        {},
        {},
      ),
    /not found/,
  );
  assert.throws(
    () =>
      cmsDestination(
        operation("GET", "/pages"),
        {},
        { url: "https://example.test" },
      ),
    /query/,
  );
  assert.equal(
    cmsDestination(
      operation("POST", "/pages/:id/unpublish"),
      { id: "page-1" },
      { force: "true" },
    ),
    "/pages/page-1/unpublish?force=true",
  );
  assert.equal(
    cmsDestination(
      operation("GET", "/galleries"),
      {},
      { search: "field & forest", status: "draft", sort: "title" },
    ),
    "/galleries?search=field+%26+forest&status=draft&sort=title",
  );
  assert.throws(
    () =>
      cmsDestination(operation("GET", "/galleries"), {}, { status: ["draft"] }),
    /filters/,
  );
});

test("CMS transport preserves domain conflicts and sends only the server credential and user grant", async () => {
  const result = await callCms(
    connection,
    operation("PUT", "/pages/:id"),
    { id: "page-1" },
    {},
    { title: "Synthetic" },
    "user-grant",
    async (url, init) => {
      assert.equal(
        String(url),
        "https://core.example.test/api/integrations/business-center/cms/pages/page-1",
      );
      assert.equal(init?.method, "PUT");
      assert.equal(init?.redirect, "error");
      assert.deepEqual(init?.headers, {
        "content-type": "application/json",
        authorization: "Bearer synthetic-key",
        "x-p1-user-grant": "user-grant",
      });
      assert.deepEqual(JSON.parse(String(init?.body)), { title: "Synthetic" });
      return Response.json(
        { error: "A page with this slug already exists" },
        { status: 409, headers: { "set-cookie": "must-not-forward=1" } },
      );
    },
  );
  assert.deepEqual(result, {
    status: 409,
    body: { error: "A page with this slug already exists" },
  });
});

test("CMS transport bounds payloads, suppresses internal errors and never retries mutations", async () => {
  let calls = 0;
  const run = (transport: typeof fetch) =>
    callCms(
      connection,
      operation("POST", "/pages"),
      {},
      {},
      { title: "Synthetic" },
      "grant",
      transport,
    );
  await assert.rejects(
    () =>
      run(async () => {
        calls++;
        throw Error("secret network detail");
      }),
    (error) =>
      !String(error).includes("secret") &&
      String(error).includes("Refresh before retrying"),
  );
  assert.equal(calls, 1);
  await assert.rejects(
    () =>
      run(async () => Response.json({ secret: "private" }, { status: 500 })),
    (error) => !String(error).includes("private"),
  );
  await assert.rejects(
    () =>
      run(
        async () =>
          new Response("x".repeat(8 * 1024 * 1024 + 1), {
            headers: { "content-type": "application/json" },
          }),
      ),
    /unavailable/,
  );
  await assert.rejects(
    () =>
      callCms(
        connection,
        operation("POST", "/pages"),
        {},
        {},
        { content: "x".repeat(8 * 1024 * 1024) },
        "grant",
        async () => {
          throw Error("must not call");
        },
      ),
    /too large/,
  );
});
