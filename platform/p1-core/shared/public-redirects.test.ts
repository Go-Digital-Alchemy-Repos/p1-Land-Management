import { expect, it } from "vitest";
import { validateRedirectCollection, validRedirectPath } from "./public-redirects";
const rule = (fromPath = "/old", toPath = "/new") => ({
  fromPath,
  toPath,
  statusCode: 301,
  isActive: true,
});
it("projects only active safe rules deterministically", () => {
  expect(
    validateRedirectCollection([
      rule("/z"),
      rule("/a"),
      { ...rule("//invalid"), isActive: false },
    ]).map((r) => r.fromPath),
  ).toEqual(["/a", "/z"]);
});
it("rejects ambiguous paths, external destinations and reserved routes", () => {
  for (const path of [
    "//evil.test",
    "https://evil.test",
    "/api/x",
    "/admin",
    "/r2/a",
    "/robots.txt",
    "/setup",
    "/testimonials",
    "/a?x=1",
    "/a#x",
    "/a%2fb",
    "/a\\b",
    "/a/../b",
    "/a/",
    "/a.html",
    "/a/index",
    "/a\n",
  ]) {
    expect(validRedirectPath(path)).toBe(false);
    expect(() => validateRedirectCollection([rule("/old", path)])).toThrow();
  }
});
it("rejects duplicates, cycles and oversized collections", () => {
  for (const rows of [
    [rule(), rule()],
    [rule("/a", "/a")],
    [rule("/a", "/b"), rule("/b", "/a")],
    Array.from({ length: 1001 }, (_, i) => rule("/" + i)),
  ])
    expect(() => validateRedirectCollection(rows)).toThrow();
});
