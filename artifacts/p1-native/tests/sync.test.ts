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

test("drains 201 original operations in bounded batches including conflicts", async () => {
  const saved = Array.from({ length: 201 }, (_, i) => ({ ...event, id: `event-${i}` }));
  const batches: number[] = [];
  const recorded: { id: string; status: string }[] = [];
  let reads = 0;
  await syncOperations({
    pending: async () => { reads++; return saved; },
    recordResults: async rows => { recorded.push(...rows); },
  }, async batch => {
    batches.push(batch.length);
    assert.deepEqual(batch, saved.slice(recorded.length, recorded.length + batch.length));
    return { results: batch.map(row => ({ id: row.id, status: row.id === "event-1" ? "conflict" : "accepted" })) };
  });
  assert.deepEqual(batches, [100, 100, 1]);
  assert.equal(reads, 1);
  assert.equal(recorded.length, 201);
  assert.equal(recorded[1].status, "conflict");
});
test("partial acknowledgment persists only confirmed entries and stops later batches", async () => {
  const saved = Array.from({ length: 101 }, (_, i) => ({ ...event, id: `event-${i}` }));
  let sends = 0;
  const recorded: unknown[] = [];
  await assert.rejects(syncOperations({
    pending: async () => saved,
    recordResults: async rows => { recorded.push(...rows); },
  }, async () => {
    sends++;
    return { results: [{ id: "event-0", status: "accepted" }] };
  }), /incomplete/);
  assert.equal(sends, 1);
  assert.deepEqual(recorded, [{ id: "event-0", status: "accepted" }]);
});
test("later batch failure preserves earlier receipts and never sends remaining work", async () => {
  const saved = Array.from({ length: 201 }, (_, i) => ({ ...event, id: `event-${i}` }));
  let sends = 0;
  const recorded: unknown[] = [];
  const denial = new Error("Authorization expired");
  await assert.rejects(syncOperations({
    pending: async () => saved,
    recordResults: async rows => { recorded.push(...rows); },
  }, async batch => {
    sends++;
    if (sends === 2) throw denial;
    return { results: batch.map(row => ({ id: row.id, status: "accepted" })) };
  }), error => error === denial);
  assert.equal(sends, 2);
  assert.equal(recorded.length, 100);
});
