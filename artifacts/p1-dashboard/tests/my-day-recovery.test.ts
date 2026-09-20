import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isTransientRefreshFailure,
  refreshEntries,
} from "../src/my-day-recovery";
test("only explicit transient HTTP failures allow downloaded work recovery", () => {
  for (const status of [408, 429, 500, 502, 503, 504])
    assert.equal(isTransientRefreshFailure({ status }), true);
  for (const error of [
    { status: 401 },
    { status: 403 },
    { status: 404 },
    { status: 409 },
    new Error("503"),
    { status: "503" },
    null,
  ])
    assert.equal(isTransientRefreshFailure(error), false);
});
test("concurrent access failure wins over earlier503, regardless of response order", async () => {
  const denied = Object.assign(new Error("Forbidden"), { status: 403 });
  await assert.rejects(
    refreshEntries([
      Promise.reject({ status: 503 }),
      new Promise((_, reject) => setTimeout(() => reject(denied), 5)),
    ]),
    (error) => error === denied,
  );
  await assert.rejects(
    refreshEntries([
      Promise.reject({ status: 401 }),
      Promise.reject({ status: 503 }),
    ]),
    (error: any) => error.status === 401,
  );
});
test("successful results remain intact and a lone503 stays eligible", async () => {
  assert.deepEqual(
    await refreshEntries([
      Promise.resolve(["work-orders", [{ id: "fixture" }]] as const),
      Promise.resolve(["properties", []] as const),
    ]),
    [
      ["work-orders", [{ id: "fixture" }]],
      ["properties", []],
    ],
  );
  await assert.rejects(
    refreshEntries([
      Promise.reject({ status: 503 }),
      Promise.resolve(["properties", []] as const),
    ]),
    (error) => isTransientRefreshFailure(error),
  );
});
