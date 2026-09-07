import { test } from "node:test";
import assert from "node:assert/strict";
import {
  outboxItem,
  validateOutboxCursor,
  OUTBOX_PAGE_SIZE,
} from "../src/core/outbox.ts";
const base = {
  id: "fixed-operation",
  workOrderId: "fixed-work",
  baseVersion: 2,
  capturedAt: "2026-09-07T12:00:00.000Z",
};
test("outbox preserves durable identity/state and summarizes all supported capture kinds", () => {
  const records = [
    { kind: "note", payload: { text: "Local note" } },
    { kind: "issue", payload: { text: "Local issue" } },
    { kind: "time", payload: { action: "start" } },
    {
      kind: "checklist",
      payload: {
        items: [
          { label: "A", done: true },
          { label: "B", done: false },
        ],
      },
    },
    { kind: "complete", payload: {} },
  ] as const;
  for (const record of records) {
    const item = outboxItem({
      kind: "operation",
      state: "conflict",
      operation: { ...base, ...record } as never,
    });
    assert.equal(item.id, base.id);
    assert.equal(item.capturedAt, base.capturedAt);
    assert.equal(item.targetId, base.workOrderId);
    assert.equal(item.state, "conflict");
    assert.ok(item.label);
    assert.ok(item.summary);
    assert.equal("payload" in item, false);
  }
  const photo = outboxItem({
    kind: "photo",
    state: "pending",
    photo: {
      id: "photo-id",
      workOrderId: "work-id",
      capturedAt: base.capturedAt,
      classification: "general",
      bytes: "NEVER SHOW",
      token: "SECRET",
    } as never,
  });
  assert.equal(photo.label, "Photo");
  assert.equal(JSON.stringify(photo).includes("SECRET"), false);
  assert.equal(JSON.stringify(photo).includes("NEVER SHOW"), false);
});
test("large note summaries and pages stay bounded; unsupported states and malformed cursors fail closed", () => {
  const item = outboxItem({
    kind: "operation",
    state: "pending",
    operation: { ...base, kind: "note", payload: { text: "a".repeat(10000) } },
  });
  assert.equal(item.summary.length, 321);
  assert.equal(OUTBOX_PAGE_SIZE, 50);
  assert.throws(() =>
    outboxItem({
      kind: "operation",
      state: "resolved",
      operation: { ...base, kind: "note", payload: { text: "a" } },
    } as never),
  );
  validateOutboxCursor(null);
  validateOutboxCursor({
    id: "fixed",
    capturedAt: base.capturedAt,
    kind: "photo",
  });
  for (const cursor of [
    { id: "", capturedAt: base.capturedAt, kind: "photo" },
    { id: "fixed", capturedAt: 17, kind: "photo" },
    { id: "fixed", capturedAt: "invalid", kind: "photo" },
    { id: "fixed", capturedAt: base.capturedAt, kind: "unknown" },
  ])
    assert.throws(() => validateOutboxCursor(cursor as never));
});
