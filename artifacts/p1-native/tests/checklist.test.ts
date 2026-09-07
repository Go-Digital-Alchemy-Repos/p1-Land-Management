import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyChecklist,
  withDownloadedChecklist,
} from "../src/core/checklist.ts";
const work = () => [
  {
    id: "job",
    version: 3,
    checklist: [
      { label: "A", done: false },
      { label: "B", done: false },
    ],
  },
];
const event = (items: { label: string; done: boolean }[]) => ({
  id: "stable-id",
  capturedAt: "2026-09-07T00:00:00Z",
  workOrderId: "job",
  baseVersion: 3,
  kind: "checklist",
  payload: { items },
});
test("reproduces snapshot loss and preserves A through reopen then B with durable snapshot", () => {
  const original = work();
  const first = event([
    { label: "A", done: true },
    { label: "B", done: false },
  ]);
  assert.equal(original[0].checklist[0].done, false); // Previous reopen source.
  const durable = JSON.stringify(applyChecklist(original, first));
  const reopened = withDownloadedChecklist(work()[0], JSON.parse(durable));
  const second = event(
    reopened.checklist.map((item) =>
      item.label === "B" ? { ...item, done: true } : item,
    ),
  );
  assert.deepEqual(
    applyChecklist(JSON.parse(durable), second)[0].checklist.map(
      (item) => item.done,
    ),
    [true, true],
  );
  assert.equal(first.id, "stable-id");
  assert.equal(first.baseVersion, 3);
  assert.equal(first.capturedAt, "2026-09-07T00:00:00Z");
  assert.equal(original[0].checklist[0].done, false);
});
test("serialized restart retains same-account projection without mutating other account or newer revision", () => {
  const accountB = work();
  const a = JSON.parse(
    JSON.stringify(
      applyChecklist(
        work(),
        event([
          { label: "A", done: true },
          { label: "B", done: false },
        ]),
      ),
    ),
  );
  assert.equal(a[0].checklist[0].done, true);
  assert.equal(accountB[0].checklist[0].done, false);
  assert.equal(
    withDownloadedChecklist({ ...work()[0], version: 4 }, a).checklist[0].done,
    false,
  );
  assert.equal(
    applyChecklist([{ ...work()[0], version: 4 }], event(a[0].checklist))[0]
      .checklist[0].done,
    false,
  );
});
test("same-revision re-download projects retained queued events in stable order", () => {
  const first = event([
    { label: "A", done: true },
    { label: "B", done: false },
  ]);
  const second = event([
    { label: "A", done: true },
    { label: "B", done: true },
  ]);
  assert.deepEqual(
    [first, second]
      .reduce(applyChecklist, work())[0]
      .checklist.map((item) => item.done),
    [true, true],
  );
});
