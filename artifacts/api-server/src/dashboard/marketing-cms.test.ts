import { test } from "node:test";
import assert from "node:assert/strict";
import { isCapability } from "@workspace/api-zod/business-access";
import {
  marketingPreviewFrameSources,
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
  for (const method of ["GET","PUT"]) assert.deepEqual(operation(method,"/design/branding").capabilities,["marketing.design.branding"]);
  assert.equal(operation("POST","/design/branding/assets").multipart,true);
  assert.deepEqual(operation("POST","/design/branding/assets").capabilities,["marketing.design.branding"]);
  for (const method of ["GET","PUT"]) assert.deepEqual(operation(method,"/design/social-media").capabilities,["marketing.design.social-media"]);
  for (const method of ["GET","PUT"]) assert.deepEqual(operation(method,"/design/typography").capabilities,["marketing.design.typography"]);
  for (const method of ["GET","PUT"]) assert.deepEqual(operation(method,"/design/colors").capabilities,["marketing.design.colors"]);
  for (const method of ["GET", "PUT"]) {assert.equal(operation(method,"/website-system/features").ownerOnly,true);assert.deepEqual(operation(method,"/website-system/features").capabilities,[]);}
  for (const method of ["GET","PUT"]) { assert.equal(operation(method,"/website-system/head-tags").ownerOnly,true); assert.deepEqual(operation(method,"/website-system/head-tags").capabilities,[]); }
  for (const path of [
    "/careers/jobs",
    "/careers/applications",
    "/careers/applications/:id/resume",
  ])
    assert.deepEqual(operation("GET", path).capabilities, [
      "marketing.content.careers",
    ]);
  assert.equal(
    operation("GET", "/careers/applications/:id/resume").binary,
    true,
  );
  for (const method of ["GET", "PUT"])
    assert.equal(operation(method, "/careers/settings").ownerOnly, true);
  assert.equal(operation("POST", "/careers/applications"), undefined);

  assert.equal(operation("GET", "/notification-forms").ownerOnly, true);
  assert.deepEqual(operation("GET", "/notification-forms").capabilities, []);
  assert.equal(
    cmsOperations.some(
      (item) => item.path === "/notification-forms" && item.method !== "GET",
    ),
    false,
  );
  assert.equal(
    new Set(cmsOperations.map((item) => `${item.method} ${item.path}`)).size,
    cmsOperations.length,
  );
  assert(
    cmsOperations.every(
      (item) =>
        item.ownerOnly ||
        (item.capabilities.length && item.capabilities.every(isCapability)),
    ),
  );
  assert.deepEqual(
    operation("POST", "/editor-locks/cms_page/:id/acquire").capabilities,
    ["marketing.content.pages"],
  );
  assert.equal(
    operation("POST", "/editor-locks/doc/:id/acquire").ownerOnly,
    true,
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

test("Media bridge preserves bounded multipart bytes and never forwards browser metadata", async () => {
  const body = Buffer.from(
    '--synthetic-boundary\r\nContent-Disposition: form-data; name="file"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\nsynthetic\r\n--synthetic-boundary--\r\n',
  );
  const type = "multipart/form-data; boundary=synthetic-boundary";
  const upload = operation("POST", "/upload");
  const result = await callCms(
    connection,
    upload,
    {},
    {},
    body,
    "grant",
    async (_url, init) => {
      assert.equal(init?.body, body);
      assert.equal(new Headers(init?.headers).get("content-type"), type);
      assert.equal(new Headers(init?.headers).get("cookie"), null);
      assert.equal(new Headers(init?.headers).get("origin"), null);
      return Response.json({ id: "asset" }, { status: 201 });
    },
    type,
  );
  assert.equal(result.status, 201);
  for (const invalidType of [
    undefined,
    "application/json",
    "multipart/form-data",
    "multipart/form-data; boundary=bad; x=evil",
  ]) {
    await assert.rejects(
      () =>
        callCms(
          connection,
          upload,
          {},
          {},
          body,
          "grant",
          async () => {
            throw Error("must not call");
          },
          invalidType,
        ),
      /multipart/,
    );
  }
  await assert.rejects(
    () =>
      callCms(
        connection,
        upload,
        {},
        {},
        Buffer.alloc(11 * 1024 * 1024 + 1),
        "grant",
        async () => {
          throw Error("must not call");
        },
        type,
      ),
    /too large/,
  );
});

test("Media sources are bounded binary responses with safe content types; metadata PATCH retains JSON", async () => {
  const source = operation("GET", "/media/:id/source");
  const bytes = Buffer.from([0, 1, 2, 255]);
  const result = await callCms(
    connection,
    source,
    { id: "asset" },
    {},
    undefined,
    "grant",
    async () =>
      new Response(bytes, {
        headers: { "content-type": "image/png", "set-cookie": "secret=1" },
      }),
  );
  assert.deepEqual(result.body, bytes);
  assert.equal(result.contentType, "image/png");
  const unsafe = await callCms(
    connection,
    source,
    { id: "asset" },
    {},
    undefined,
    "grant",
    async () =>
      new Response("<html>unsafe</html>", {
        headers: { "content-type": "text/html" },
      }),
  );
  assert.equal(unsafe.contentType, "application/octet-stream");
  await assert.rejects(
    () =>
      callCms(
        connection,
        source,
        { id: "asset" },
        {},
        undefined,
        "grant",
        async () => new Response(Buffer.alloc(11 * 1024 * 1024 + 1)),
      ),
    /unavailable/,
  );
  const missing = await callCms(
    connection,
    source,
    { id: "asset" },
    {},
    undefined,
    "grant",
    async () => Response.json({ error: "Media not found" }, { status: 404 }),
  );
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.body, { error: "Media not found" });
  await callCms(
    connection,
    operation("PATCH", "/media/:id"),
    { id: "asset" },
    {},
    { alt: "Synthetic" },
    "grant",
    async (_url, init) => {
      assert.equal(init?.method, "PATCH");
      assert.deepEqual(JSON.parse(String(init?.body)), { alt: "Synthetic" });
      return Response.json({ id: "asset", alt: "Synthetic" });
    },
  );
});

test("Blog moderation accepts only known scalar status filters and static routes precede post IDs", () => {
  const comments = operation("GET", "/blog/comments");
  assert.equal(cmsDestination(comments, {}, {}), "/blog/comments");
  assert.equal(
    cmsDestination(comments, {}, { status: "pending" }),
    "/blog/comments?status=pending",
  );
  for (const query of [
    { status: "unknown" },
    { status: ["pending"] },
    { url: "https://external.test" },
  ])
    assert.throws(() => cmsDestination(comments, {}, query), /filters/);
  const postIndex = cmsOperations.indexOf(operation("GET", "/blog/:id"));
  for (const path of ["/blog/comments", "/blog/references"])
    assert(cmsOperations.indexOf(operation("GET", path)) < postIndex);
  for (const op of cmsOperations.filter((item) =>
    item.path.startsWith("/blog"),
  ))
    assert.deepEqual(op.capabilities, ["marketing.content.blog"]);
});

test("preview framing admits only a fully configured exact Core origin", () => {
  const fallback = ["https://www.p1landmanagement.com"];
  assert.deepEqual(marketingPreviewFrameSources({}), fallback);
  const env = {
    CORE_MARKETING_SERVICE_KEY: "s".repeat(43),
    CORE_MARKETING_ORIGIN: "https://core.example.test",
  };
  assert.deepEqual(marketingPreviewFrameSources(env), [
    ...fallback,
    "https://core.example.test",
  ]);
  for (const origin of [
    "https://*.example.test",
    "https://core.example.test/path",
    "http://core.example.test",
    "https://user:pass@core.example.test",
  ])
    assert.deepEqual(
      marketingPreviewFrameSources({ ...env, CORE_MARKETING_ORIGIN: origin }),
      fallback,
    );
});

test("Forms delivery queries are bounded and backfill remains owner-only", () => {
  assert.deepEqual(operation("GET", "/form-builder").capabilities, [
    "marketing.content.forms",
  ]);
  assert.deepEqual(operation("GET", "/forms").capabilities, [
    "marketing.content.forms",
  ]);
  assert.equal(
    operation("POST", "/form-delivery-jobs/commercial-backfill").ownerOnly,
    true,
  );
  const jobs = operation("GET", "/form-delivery-jobs");
  assert.equal(
    cmsDestination(jobs, {}, { limit: "20", status: "all", cursor: "abc_123" }),
    "/form-delivery-jobs?limit=20&status=all&cursor=abc_123",
  );
  for (const query of [
    { limit: "201" },
    { limit: "0" },
    { status: "unknown" },
    { cursor: ["a", "b"] },
    { cursor: "../" },
    { extra: "x" },
  ])
    assert.throws(
      () => cmsDestination(jobs, {}, query),
      /Invalid form delivery filters/,
    );
});

test("event management is explicitly scoped to Events", () => {
  for (const [method, path] of [
    ["GET", "/events/registration-forms"],
    ["GET", "/events/:eventId/attendees"],
    ["PUT", "/events/:eventId/attendees/:id/checkin"],
    ["GET", "/events"],
    ["POST", "/events"],
    ["GET", "/events/:id"],
    ["PUT", "/events/:id"],
    ["DELETE", "/events/:id"],
    ["POST", "/events/:id/notify"],
    ["POST", "/events/:id/duplicate"],
    ["GET", "/events/:id/analytics"],
    ["GET", "/events/venues"],
    ["PUT", "/events/venues/:venueId"],
    ["GET", "/events/organizers"],
    ["DELETE", "/events/organizers/:organizerId"],
  ] as const)
    assert.deepEqual(operation(method, path).capabilities, [
      "marketing.content.events",
    ]);
});

test("event form selector is resolved before the event detail wildcard", () => {
  assert(
    cmsOperations.indexOf(operation("GET", "/events/registration-forms")) <
      cmsOperations.indexOf(operation("GET", "/events/:id")),
  );
});

test("Career resume transport preserves binary bytes, bounds response size and retains missing-file errors", async () => {
  const resume = operation("GET", "/careers/applications/:id/resume");
  const bytes = Buffer.from([0, 255, 13, 10, 37, 80, 68, 70]);
  const response = await callCms(
    connection,
    resume,
    { id: "application" },
    {},
    undefined,
    "grant",
    async () =>
      new Response(bytes, {
        headers: {
          "content-type": "application/pdf",
          "set-cookie": "do-not-forward=1",
        },
      }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, bytes);
  assert.equal(response.contentType, "application/octet-stream");
  assert.equal("headers" in response, false);
  const missing = await callCms(
    connection,
    resume,
    { id: "application" },
    {},
    undefined,
    "grant",
    async () =>
      Response.json({ message: "Resume file not found" }, { status: 404 }),
  );
  assert.equal(missing.status, 404);
  await assert.rejects(
    () =>
      callCms(
        connection,
        resume,
        { id: "application" },
        {},
        undefined,
        "grant",
        async () => new Response(Buffer.alloc(11 * 1024 * 1024 + 1)),
      ),
    /unavailable/,
  );
});


test("Career deletion forwards its version body without adding bodies to legacy delete operations", async () => {
  const body={expectedUpdatedAt:"2030-01-01T00:00:00.000Z"};
  await callCms(connection,operation("DELETE","/careers/jobs/:id"),{id:"job"},{},body,"grant",async(_url,options)=>{
    assert.equal(options?.method,"DELETE");
    assert.deepEqual(JSON.parse(String(options?.body)),body);
    return Response.json({success:true});
  });
  await callCms(connection,operation("DELETE","/blog/:id"),{id:"post"},{},body,"grant",async(_url,options)=>{
    assert.equal(options?.body,undefined);
    return Response.json({success:true});
  });
});

test("document bridge operations are explicit and Owner-only", () => {
  for (const [method,path] of [["GET","/website-system/docs"],["POST","/website-system/docs"],["POST","/website-system/docs/sync"],["PUT","/website-system/docs/:id"],["DELETE","/website-system/docs/:id"]]) {
    const op=operation(method,path);
    assert.equal(op.ownerOnly,true);
    assert.deepEqual(op.capabilities,[]);
    assert.match(cmsDestination(op,{id:"11111111-1111-4111-8111-111111111111"},{}), /website-system\/docs/);
  }
  assert.equal(cmsOperations.some(op=>op.path==="/website-system/docs/:id"&&op.method==="PATCH"),false);
});

test("document deletion retains its optimistic version through the bridge", async () => {
  const body={expectedVersion:"a".repeat(64)};
  await callCms(connection,operation("DELETE","/website-system/docs/:id"),{id:"document"},{},body,"grant",async(_url,options)=>{
    assert.deepEqual(JSON.parse(String(options?.body)),body);
    return Response.json({deleted:true});
  });
});

test("onboarding bridge only permits the four Owner-only operations", () => {
 for (const [method,path] of [["POST","domain-plan"],["POST","dns-verification"],["POST","readiness"],["GET",":stackId/evidence"]]) {
  const op=operation(method,`/website-system/onboarding/${path}`);
  assert.equal(op.ownerOnly,true);assert.deepEqual(op.capabilities,[]);
  assert.match(cmsDestination(op,{stackId:"p1-land-management"},{}), /website-system\/onboarding/);
  if (method === "GET") assert.throws(()=>cmsDestination(op,{stackId:"../other"},{}));
 }
 assert.equal(cmsOperations.some(op=>op.path.startsWith("/website-system/onboarding")&&op.method==="DELETE"),false);
});
