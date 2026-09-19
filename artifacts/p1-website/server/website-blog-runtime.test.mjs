import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const fixture = () => ({
  schemaVersion: 1,
  stackId: "p1-land-management",
  revision: "a".repeat(64),
  posts: [
    {
      id: "test-post",
      revisionId: "test-revision",
      generation: 1,
      publishedAt: "2026-09-01T12:00:00.000Z",
      modifiedAt: "2026-09-19T12:00:00.000Z",
      snapshot: {
        title: "Published fixture article",
        slug: "fixture-article",
        excerpt: "Published excerpt",
        content: "<p>Published body</p>",
        authorName: "P1",
        coverImageUrl: "/r2/cover.webp",
        coverImagePositionX: 20,
        coverImagePositionY: 80,
        category: null,
        categories: [],
        tags: [],
        postType: "article",
        podcastUrl: null,
        externalUrl: null,
        seoTitle: "Published fixture SEO",
        seoDescription: "Published SEO description",
        ogImageUrl: null,
        noindex: false,
      },
    },
  ],
});
const root = fileURLToPath(new URL("../", import.meta.url));
const listen = async (server) => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
};
const hydration = (html) =>
  JSON.parse(
    html.match(
      /<script type="application\/json" id="p1-published-content">([\s\S]*?)<\/script>/,
    )[1],
  );
test(
  "published Blog SSR, navigation, metadata, sitemap, rename and withdrawal share authoritative snapshots",
  { timeout: 20000 },
  async (t) => {
    let data = fixture(),
      offline = false;
    const requests = [];
    const upstream = http.createServer((req, res) => {
      requests.push({ url: req.url, headers: req.headers });
      if (req.url === "/api/website/blog-publication" && !offline) {
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify(data));
      }
      if (req.method === "POST" && req.url.startsWith("/api/blog/")) {
        res.setHeader("Content-Type", "application/json");
        return res.end("{}");
      }
      res.writeHead(503);
      res.end("Unavailable");
    });
    const upstreamPort = await listen(upstream);
    t.after(() => new Promise((resolve) => upstream.close(resolve)));
    const reservation = http.createServer();
    const port = await listen(reservation);
    await new Promise((resolve) => reservation.close(resolve));
    const child = spawn(process.execPath, ["server/index.mjs"], {
      cwd: root,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: "production",
        P1_CORE_ORIGIN: `http://127.0.0.1:${upstreamPort}`,
        P1_CONTENT_CACHE_DIR: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    t.after(async () => {
      if (child.exitCode === null) {
        child.kill("SIGTERM");
        await once(child, "exit");
      }
    });
    let diagnostics = "";
    child.stderr.on("data", (chunk) => (diagnostics += chunk));
    await new Promise((ready, reject) => {
      const timer = setTimeout(
        () => reject(Error(diagnostics || "Startup timeout")),
        10000,
      );
      child.stdout.on("data", (chunk) => {
        if (String(chunk).includes("listening")) {
          clearTimeout(timer);
          ready();
        }
      });
      child.once("exit", () => {
        clearTimeout(timer);
        reject(Error(diagnostics));
      });
    });
    const get = (path) =>
      fetch(`http://127.0.0.1:${port}${path}`, {
        headers: { Cookie: "private-cookie", Authorization: "Bearer private" },
      });
    const invalidate = () =>
      fetch(`http://127.0.0.1:${port}/api/blog/fixture/publish`, {
        method: "POST",
      });
    const response = await get("/blog/fixture-article");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<title>Published Fixture SEO<\/title>/);
    assert.match(html, /Published body/);
    assert.match(html, /September 1, 2026/);
    assert.match(html, /"datePublished":"2026-09-01T12:00:00.000Z"/);
    assert.match(html, /"dateModified":"2026-09-19T12:00:00.000Z"/);
    assert.match(
      html,
      /rel="canonical" href="https:\/\/www.p1landmanagement.com\/blog\/fixture-article"/,
    );
    const state = hydration(html);
    assert.equal(state.blog.posts.length, 1);
    assert.equal(state.blog.posts[0].snapshot.content, "<p>Published body</p>");
    assert.deepEqual(
      (
        await (
          await get("/api/p1/page-content?path=/blog/fixture-article")
        ).json()
      ).blog,
      state.blog,
    );
    const index = await (await get("/blog")).text();
    assert.match(index, /Published fixture article/);
    assert.match(index, /land-clearing-cost-per-acre-south-carolina/);
    assert.equal(hydration(index).blog.posts.length, 0);
    assert.equal(
      hydration(index).blog.listing[0].title,
      "Published fixture article",
    );
    assert.equal(hydration(index).blog.listing[0].content, undefined);
    const home = hydration(await (await get("/")).text());
    assert.equal(home.blog, undefined);
    assert.match(
      await (await get("/sitemap.xml")).text(),
      /<loc>https:\/\/www.p1landmanagement.com\/blog\/fixture-article<\/loc><lastmod>2026-09-19T12:00:00.000Z<\/lastmod>/,
    );
    assert.equal(
      (await get("/blog/signs-property-drainage-problem")).status,
      200,
    );
    assert.equal((await get("/blog/unknown-article")).status, 404);
    assert.equal(
      (await get("/blog/unknown-article")).headers.get("x-robots-tag"),
      "noindex, nofollow",
    );
    const projectionRequests = requests.filter(
      (r) => r.url === "/api/website/blog-publication",
    );
    assert.equal(projectionRequests.length, 1);
    assert.equal(projectionRequests[0].headers.cookie, undefined);
    assert.equal(projectionRequests[0].headers.authorization, undefined);
    data.posts[0].snapshot.noindex = true;
    await invalidate();
    assert.doesNotMatch(
      await (await get("/sitemap.xml")).text(),
      /fixture-article/,
    );
    assert.match(
      await (await get("/blog/fixture-article")).text(),
      /name="robots" content="noindex, follow"/,
    );
    data.posts[0].snapshot.slug = "renamed-article";
    await invalidate();
    assert.equal((await get("/blog/fixture-article")).status, 404);
    assert.equal((await get("/blog/renamed-article")).status, 200);
    const original = data.posts[0];
    data.posts = Array.from({ length: 30 }, (_, i) => ({
      ...original,
      id: `page-${i}`,
      snapshot: {
        ...original.snapshot,
        slug: `page-${i}`,
        title: `Paged article ${i}`,
        noindex: false,
      },
    }));
    await invalidate();
    const paged = await (await get("/blog")).text();
    assert.match(paged, /Load more articles/);
    assert.equal(hydration(paged).blog.listing.length, 30);
    assert.equal(hydration(paged).blog.posts.length, 0);
    assert.equal(
      (
        paged
          .split('<script type="application/json"')[0]
          .match(/Read Article/g) || []
      ).length,
      24,
    );
    assert.match(await (await get("/sitemap.xml")).text(), /\/blog\/page-29/);
    data.posts = [original];
    await invalidate();
    await get("/blog/renamed-article");
    offline = true;
    await invalidate();
    assert.equal((await get("/blog/renamed-article")).status, 200);
    offline = false;
    data = { ...data, posts: [] };
    await invalidate();
    assert.equal((await get("/blog/renamed-article")).status, 404);
    assert.doesNotMatch(
      await (await get("/blog")).text(),
      /Published fixture article/,
    );
    assert.equal(
      (await get("/blog/signs-property-drainage-problem")).status,
      200,
    );
    const head = await fetch(`http://127.0.0.1:${port}/blog/renamed-article`, {
      method: "HEAD",
    });
    assert.equal(head.status, 404);
    assert.equal(await head.text(), "");
  },
);
