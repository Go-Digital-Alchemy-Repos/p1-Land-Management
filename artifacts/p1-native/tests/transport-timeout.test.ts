import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BusinessTransport,
  RequestTimeout,
  RequestCancelled,
  RequestFailure,
  SessionChanged,
  TRANSPORT_TIMEOUTS,
} from "../src/core/transport.ts";
import { syncCaptures } from "../src/core/sync-captures.ts";
const origin = "https://timeout.synthetic.test";
const settle = () => new Promise((resolve) => setImmediate(resolve));
const bind = (transport: BusinessTransport) =>
  transport.bind({ accountId: "A", token: "synthetic" });
test("ordinary30s and media120s deadlines abort stalled requests without automatic retry", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const signals: AbortSignal[] = [];
  const transport = new BusinessTransport(origin, async (_url, init) => {
    signals.push(init!.signal!);
    return new Promise(() => {});
  });
  bind(transport);
  const api = transport.request("/api/v1/me"),
    photo = transport.request("/api/v1/files/fixed", {
      method: "POST",
      body: new Uint8Array([1]),
    }),
    image = transport.request("/api/v1/files/fixed/content", {}, "image");
  t.mock.timers.tick(TRANSPORT_TIMEOUTS.apiMs);
  await assert.rejects(api, RequestTimeout);
  assert.deepEqual(
    signals.map((s) => s.aborted),
    [true, false, false],
  );
  t.mock.timers.tick(TRANSPORT_TIMEOUTS.mediaMs - TRANSPORT_TIMEOUTS.apiMs);
  await assert.rejects(photo, RequestTimeout);
  await assert.rejects(image, RequestTimeout);
  assert.equal(signals.length, 3);
  assert.ok(signals.every((s) => s.aborted));
});
test("deadline covers delayed response body and discards its late success", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let release!: (value: unknown) => void,
    success = false;
  const response = new Response("{}");
  response.json = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const transport = new BusinessTransport(origin, async () => response);
  bind(transport);
  const request = transport.request("/api/v1/me");
  void request.then(
    () => {
      success = true;
    },
    () => {},
  );
  await settle();
  t.mock.timers.tick(30_000);
  await assert.rejects(request, RequestTimeout);
  release({ accepted: true });
  await settle();
  assert.equal(success, false);
});
test("late401/403 after deadline cannot produce success; account changes cancel immediately", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const status of [401, 403]) {
    let release!: (response: Response) => void,
      success = false;
    const transport = new BusinessTransport(
      origin,
      async () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    bind(transport);
    const request = transport.request("/api/v1/me");
    void request.then(
      () => {
        success = true;
      },
      () => {},
    );
    t.mock.timers.tick(30_000);
    await assert.rejects(request, RequestTimeout);
    release(new Response("{}", { status }));
    await settle();
    assert.equal(success, false);
  }
  const transport = new BusinessTransport(
    origin,
    async () => new Promise(() => {}),
  );
  bind(transport);
  const request = transport.request("/api/v1/me");
  transport.bind({ accountId: "B", token: "other-synthetic" });
  await assert.rejects(request, SessionChanged);
});
test("external cancellation is unconfirmed and completed requests remove timers/listeners", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let signal!: AbortSignal;
  const external = new AbortController();
  let added = 0,
    removed = 0;
  const add = external.signal.addEventListener.bind(external.signal),
    remove = external.signal.removeEventListener.bind(external.signal);
  external.signal.addEventListener = ((...args: Parameters<typeof add>) => {
    added++;
    return add(...args);
  }) as typeof add;
  external.signal.removeEventListener = ((
    ...args: Parameters<typeof remove>
  ) => {
    removed++;
    return remove(...args);
  }) as typeof remove;
  const transport = new BusinessTransport(origin, async (_url, init) => {
    signal = init!.signal!;
    return Response.json({ ok: true });
  });
  bind(transport);
  await transport.request("/api/v1/me", { signal: external.signal });
  assert.equal(added, 1);
  assert.equal(removed, 1);
  external.abort();
  t.mock.timers.tick(120_000);
  transport.bind(null);
  assert.equal(signal.aborted, false);
  const cancelled = new AbortController(),
    hanging = new BusinessTransport(origin, async (_url, init) => {
      signal = init!.signal!;
      return new Promise(() => {});
    });
  bind(hanging);
  const request = hanging.request("/api/v1/me", { signal: cancelled.signal });
  cancelled.abort();
  await assert.rejects(request, RequestCancelled);
  assert.equal(signal.aborted, true);
  let calls = 0;
  const pre = new BusinessTransport(origin, async () => {
    calls++;
    return Response.json({});
  });
  bind(pre);
  await assert.rejects(
    pre.request("/api/v1/me", { signal: cancelled.signal }),
    RequestCancelled,
  );
  assert.equal(calls, 0);
});
test("timed-out server acceptance retains sameID until retry receipt; independent operations progress", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const server = new Map<string, unknown>(),
    sent: string[] = [];
  let late!: (value: Response) => void;
  let first = true,
    operations = 0,
    acks = 0;
  const pending = new Set(["original-photo"]);
  const transport = new BusinessTransport(
    origin,
    async (url) => {
      const id = new URL(String(url)).pathname.split("/").at(-1)!;
      sent.push(id);
      if (!server.has(id)) server.set(id, { id, status: "accepted" });
      if (first) {
        first = false;
        return new Promise((resolve) => {
          late = resolve;
        });
      }
      return Response.json(server.get(id));
    },
    { apiMs: 10, mediaMs: 20 },
  );
  bind(transport);
  const steps = {
    photoIds: async () => [...pending],
    loadPhoto: async (id: string) => ({ id }),
    upload: (photo: { id: string }) =>
      transport.request("/api/v1/files/" + photo.id, {
        method: "POST",
        body: new Uint8Array([1]),
      }),
    acknowledgePhoto: async (id: string) => {
      acks++;
      pending.delete(id);
    },
    operations: async () => {
      operations++;
    },
    assertCurrent: () => {},
    isFatal: (e: unknown) =>
      e instanceof SessionChanged ||
      (e instanceof RequestFailure && [401, 403].includes(e.status)),
  };
  const firstRun = syncCaptures(steps);
  await settle();
  t.mock.timers.tick(20);
  assert.deepEqual(await firstRun, {
    photosAcknowledged: 0,
    photoFailures: 1,
    operationsProcessed: true,
  });
  assert.equal(pending.size, 1);
  assert.equal(operations, 1);
  await syncCaptures(steps);
  assert.equal(server.size, 1);
  assert.deepEqual(sent, ["original-photo", "original-photo"]);
  assert.equal(pending.size, 0);
  assert.equal(acks, 1);
  late(Response.json(server.get("original-photo")));
  await settle();
  assert.equal(acks, 1);
});
test("timeout policy cannot be disabled or extended by constructor options", () => {
  for (const apiMs of [0, -1, Infinity, NaN, 30_001])
    assert.throws(
      () => new BusinessTransport(origin, fetch, { apiMs, mediaMs: 120_000 }),
    );
  assert.throws(
    () =>
      new BusinessTransport(origin, fetch, { apiMs: 30_000, mediaMs: 120_001 }),
  );
});
