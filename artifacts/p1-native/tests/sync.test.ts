import { test } from "node:test";
import assert from "node:assert/strict";
import { syncOperations } from "../src/core/sync.ts";
const event = {
  id: "a",
  workOrderId: "w",
  baseVersion: 1,
  kind: "note" as const,
  payload: { text: "synthetic" },
  capturedAt: "2026-09-07T00:00:00Z",
};
test("lost response retains original IDs and original capture time on retry", async () => {
  let acknowledgments = 0;
  const store = {
    pending: async () => [event],
    recordResults: async () => {
      acknowledgments++;
    },
  };
  await assert.rejects(
    syncOperations(store, async () => {
      throw new Error("response lost");
    }),
  );
  assert.equal(acknowledgments, 0);
  await syncOperations(store, async (batch) => {
    assert.deepEqual(batch, [event]);
    return { results: [{ id: "a", status: "accepted" }] };
  });
  assert.equal(acknowledgments, 1);
});
test("invalid or unrelated acknowledgment never deletes saved work", async () => {
  let acknowledgments = 0;
  const store = {
    pending: async () => [event],
    recordResults: async () => {
      acknowledgments++;
    },
  };
  for (const results of [
    [{ id: "other", status: "accepted" }],
    [{ id: "a", status: "unknown" }],
    [
      { id: "a", status: "accepted" },
      { id: "a", status: "conflict" },
    ],
  ])
    await assert.rejects(syncOperations(store, async () => ({ results })));
  assert.equal(acknowledgments, 0);
});
test("mixed conflict acknowledgment retains its conflict classification", async () => {
  let applied: unknown;
  const store = {
    pending: async () => [event],
    recordResults: async (r: unknown) => {
      applied = r;
    },
  };
  await syncOperations(store, async () => ({
    results: [{ id: "a", status: "conflict" }],
  }));
  assert.deepEqual(applied, [{ id: "a", status: "conflict" }]);
});
