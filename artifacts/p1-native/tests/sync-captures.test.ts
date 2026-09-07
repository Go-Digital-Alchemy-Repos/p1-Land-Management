import { test } from "node:test";
import assert from "node:assert/strict";
import { syncCaptures } from "../src/core/sync-captures.ts";
import { RequestFailure, SessionChanged } from "../src/core/transport.ts";
import { syncOperations } from "../src/core/sync.ts";
const isFatal = (error: unknown) =>
  error instanceof SessionChanged ||
  (error instanceof RequestFailure && [401, 403].includes(error.status));
function fixture(ids = ["photo-A", "photo-B"]) {
  const pending = new Set(ids),
    sent: string[] = [],
    acks: string[] = [];
  let operations = 0;
  return {
    pending,
    sent,
    acks,
    get operationCalls() {
      return operations;
    },
    steps: {
      photos: async () =>
        ids.filter((id) => pending.has(id)).map((id) => ({ id })),
      upload: async (photo: { id: string }): Promise<unknown> => {
        sent.push(photo.id);
        return { id: photo.id, status: "accepted" };
      },
      acknowledgePhoto: async (id: string) => {
        acks.push(id);
        pending.delete(id);
      },
      operations: async () => {
        operations++;
      },
      assertCurrent: () => {},
      isFatal,
    },
  };
}
test("first photo503 does not starve later photo or real operation receipts; retry preserves original photo ID", async () => {
  const f = fixture();
  let fail = true;
  const upload = f.steps.upload;
  f.steps.upload = async (photo) => {
    if (photo.id === "photo-A" && fail) {
      f.sent.push(photo.id);
      throw new RequestFailure(503);
    }
    return upload(photo);
  };
  const operation = {
    id: "fixed-operation",
    workOrderId: "work",
    baseVersion: 1,
    kind: "note" as const,
    payload: { text: "Synthetic durable note" },
    capturedAt: "2026-09-07T12:00:00.000Z",
  };
  let saved = [operation];
  const steps = {
    ...f.steps,
    operations: () =>
      syncOperations(
        {
          pending: async () => saved,
          recordResults: async (rows) => {
            saved = saved.filter(
              (item) =>
                !rows.some(
                  (row) => row.id === item.id && row.status === "accepted",
                ),
            );
          },
        },
        async (events) => ({
          results: events.map((event) => ({
            id: event.id,
            status: "accepted",
          })),
        }),
      ),
  };
  assert.deepEqual(await syncCaptures(steps), {
    photosAcknowledged: 1,
    photoFailures: 1,
    operationsProcessed: true,
  });
  assert.deepEqual(saved, []);
  assert.deepEqual([...f.pending], ["photo-A"]);
  fail = false;
  await syncCaptures(steps);
  assert.deepEqual(f.sent, ["photo-A", "photo-B", "photo-A"]);
  assert.equal(f.pending.size, 0);
});
test("invalid/lost receipts and failed local ack persistence remain uncounted and queued", async () => {
  const f = fixture(["wrong", "lost", "local", "good"]);
  const upload = f.steps.upload,
    ack = f.steps.acknowledgePhoto;
  f.steps.upload = async (photo) =>
    photo.id === "wrong"
      ? { id: "another-photo", status: "accepted" }
      : photo.id === "lost"
        ? undefined
        : upload(photo);
  f.steps.acknowledgePhoto = async (id) => {
    if (id === "local") throw Error("Synthetic SQLite write failure");
    await ack(id);
  };
  assert.deepEqual(await syncCaptures(f.steps), {
    photosAcknowledged: 1,
    photoFailures: 3,
    operationsProcessed: true,
  });
  assert.deepEqual([...f.pending], ["wrong", "lost", "local"]);
  assert.deepEqual(f.acks, ["good"]);
  assert.equal(f.operationCalls, 1);
});
test("401/403/session change stop immediately without later photos or operations", async () => {
  for (const error of [
    new RequestFailure(401),
    new RequestFailure(403),
    new SessionChanged(),
  ]) {
    const f = fixture();
    f.steps.upload = async (photo) => {
      f.sent.push(photo.id);
      throw error;
    };
    await assert.rejects(syncCaptures(f.steps), (e) => e === error);
    assert.deepEqual(f.sent, ["photo-A"]);
    assert.equal(f.operationCalls, 0);
    assert.equal(f.pending.size, 2);
  }
});
test("late receipt after account/vault detach cannot acknowledge or start operations", async () => {
  const f = fixture();
  let active = true,
    release!: (receipt: unknown) => void;
  f.steps.assertCurrent = () => {
    if (!active) throw new SessionChanged();
  };
  f.steps.upload = async () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const running = syncCaptures(f.steps);
  await new Promise((resolve) => setImmediate(resolve));
  active = false;
  release({ id: "photo-A", status: "accepted" });
  await assert.rejects(running, SessionChanged);
  assert.deepEqual(f.acks, []);
  assert.equal(f.operationCalls, 0);
  assert.equal(f.pending.size, 2);
});
test("operation delivery failure preserves successful photo receipts; auth failure still escapes", async () => {
  const f = fixture();
  f.steps.operations = async () => {
    throw new RequestFailure(503);
  };
  assert.deepEqual(await syncCaptures(f.steps), {
    photosAcknowledged: 2,
    photoFailures: 0,
    operationsProcessed: false,
  });
  assert.equal(f.pending.size, 0);
  const denied = fixture();
  denied.steps.operations = async () => {
    throw new RequestFailure(401);
  };
  await assert.rejects(syncCaptures(denied.steps), RequestFailure);
});
