import { test } from "node:test";
import assert from "node:assert/strict";
import { createLostAcknowledgement } from "./crew-joined-ack.mjs";
test("withholds only first genuinely accepted nonempty response after recording replay IDs", () => {
  const fault = createLostAcknowledgement();
  for (const [status, body] of [
    [503, { results: [{ status: "accepted" }] }],
    [200, { results: [{ status: "conflict" }] }],
    [200, { results: [] }],
    [200, {}],
  ])
    assert.equal(fault.withhold(status, body), false);
  const events = [
    { id: "start", payload: { action: "start" } },
    { id: "complete", payload: { text: "Synthetic" } },
  ];
  fault.record(events);
  assert.equal(
    fault.withhold(200, {
      results: events.map((e) => ({ id: e.id, status: "accepted" })),
    }),
    true,
  );
  fault.record(events);
  assert.equal(
    fault.withhold(200, {
      results: events.map((e) => ({ id: e.id, status: "accepted" })),
    }),
    false,
  );
  assert.deepEqual(fault.batches, [
    ["start", "complete"],
    ["start", "complete"],
  ]);
});
test("separate fixture instances retain independent fault state and reject malformed request arrays", () => {
  const one = createLostAcknowledgement(),
    two = createLostAcknowledgement();
  assert.throws(() => one.record(null));
  const result = { results: [{ id: "a", status: "accepted" }] };
  assert.equal(one.withhold(200, result), true);
  assert.equal(two.withhold(200, result), true);
  assert.equal(one.withhold(200, result), false);
});
