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

it("accepts ten edges without collapsing mixed statuses and rejects an eleventh", () => {
  const chain = Array.from({ length: 10 }, (_, index) => ({
    ...rule(`/hop-${index}`, `/hop-${index + 1}`),
    statusCode: index % 2 ? 302 : 301,
  }));
  const projected = validateRedirectCollection([...chain].reverse());
  expect(projected).toEqual(chain.map(({ isActive, ...value }) => value));
  const eleven = [...chain, rule("/hop-10", "/hop-11")];
  expect(() => validateRedirectCollection(eleven)).toThrow("at most 10 rules");
  // The longest path matters even when multiple starting paths join the same suffix.
  expect(() => validateRedirectCollection([...chain, rule("/other", "/hop-0")])).toThrow(
    "at most 10 rules",
  );
  expect(
    validateRedirectCollection([...chain, { ...rule("/hop-10", "/hop-11"), isActive: false }]),
  ).toEqual(projected);
  expect(() => validateRedirectCollection([...chain, rule("/hop-10", "/hop-0")])).toThrow();
});
