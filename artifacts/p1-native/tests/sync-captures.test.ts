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
      photoIds: async () => ids.filter((id) => pending.has(id)),
      loadPhoto: async (id: string): Promise<{ id: string } | null> =>
        pending.has(id) ? { id } : null,
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

test("ID snapshot excludes later captures and loads one row only after prior attempt finishes", async () => {
  const ids = ["photo-A", "photo-B"],
    f = fixture(ids),
    loads: string[] = [],
    events: string[] = [];
  let release!: (value: unknown) => void;
  f.steps.photoIds = async () => ids;
  f.steps.loadPhoto = async (id) => {
    loads.push(id);
    events.push("load:" + id);
    return { id };
  };
  f.steps.upload = async (photo) => {
    events.push("upload:" + photo.id);
    if (photo.id === "photo-A")
      return new Promise((resolve) => {
        release = resolve;
      });
    return { id: photo.id, status: "accepted" };
  };
  const ack = f.steps.acknowledgePhoto;
  f.steps.acknowledgePhoto = async (id) => {
    await ack(id);
    events.push("ack:" + id);
  };
  const running = syncCaptures(f.steps);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(loads, ["photo-A"]);
  ids.push("later-photo");
  f.pending.add("later-photo");
  release({ id: "photo-A", status: "accepted" });
  await running;
  assert.deepEqual(loads, ["photo-A", "photo-B"]);
  assert.deepEqual(events, [
    "load:photo-A",
    "upload:photo-A",
    "ack:photo-A",
    "load:photo-B",
    "upload:photo-B",
    "ack:photo-B",
  ]);
  assert.deepEqual([...f.pending], ["later-photo"]);
});
test("missing, mismatched and failed per-photo loads stay unconfirmed while other work progresses", async () => {
  const f = fixture(["missing", "mismatch", "read-failed", "good"]);
  f.steps.loadPhoto = async (id) => {
    if (id === "missing") return null;
    if (id === "mismatch") return { id: "different" };
    if (id === "read-failed") throw Error("Synthetic read failure");
    return { id };
  };
  assert.deepEqual(await syncCaptures(f.steps), {
    photosAcknowledged: 1,
    photoFailures: 3,
    operationsProcessed: true,
  });
  assert.deepEqual(f.sent, ["good"]);
  assert.deepEqual([...f.pending], ["missing", "mismatch", "read-failed"]);
});
test("binding change during single-photo loading aborts before upload; auth load failure is not swallowed", async () => {
  const f = fixture();
  let active = true,
    release!: (value: { id: string }) => void;
  f.steps.assertCurrent = () => {
    if (!active) throw new SessionChanged();
  };
  f.steps.loadPhoto = async () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const running = syncCaptures(f.steps);
  await new Promise((resolve) => setImmediate(resolve));
  active = false;
  release({ id: "photo-A" });
  await assert.rejects(running, SessionChanged);
  assert.deepEqual(f.sent, []);
  assert.deepEqual(f.acks, []);
  assert.equal(f.operationCalls, 0);
  const denied = fixture();
  denied.steps.loadPhoto = async () => {
    throw new RequestFailure(403);
  };
  await assert.rejects(syncCaptures(denied.steps), RequestFailure);
  assert.deepEqual(denied.sent, []);
  assert.equal(denied.operationCalls, 0);
});

test("user cancellation stops the snapshot before later photos or operations", async () => {
  const calls: string[] = [];
  const cancelled = new Error("cancelled by crew");
  await assert.rejects(
    syncCaptures({
      photoIds: async () => ["one", "two"],
      loadPhoto: async (id) => {
        calls.push(`load:${id}`);
        return { id };
      },
      upload: async () => {
        calls.push("upload:one");
        throw cancelled;
      },
      acknowledgePhoto: async () => calls.push("ack"),
      operations: async () => calls.push("operations"),
      assertCurrent: () => {},
      isFatal: () => false,
      isCancelled: (error) => error === cancelled,
    }),
    /cancelled by crew/,
  );
  assert.deepEqual(calls, ["load:one", "upload:one"]);
});

test("progress reports only delivery state and ordinal, not saved capture contents", async () => {
  const f = fixture();
  const progress: unknown[] = [];
  await syncCaptures({
    ...f.steps,
    onProgress: (event) => progress.push(event),
  });
  assert.deepEqual(progress, [
    { kind: "photos", status: "uploading", current: 1, total: 2 },
    { kind: "photos", status: "accepted", current: 1, total: 2 },
    { kind: "photos", status: "uploading", current: 2, total: 2 },
    { kind: "photos", status: "accepted", current: 2, total: 2 },
    { kind: "operations", status: "processing" },
    { kind: "operations", status: "processed" },
  ]);
  assert.doesNotMatch(JSON.stringify(progress), /photo-A|photo-B/);
});
