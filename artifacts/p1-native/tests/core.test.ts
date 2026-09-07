import { test } from "node:test";
import assert from "node:assert/strict";
import { BusinessTransport, SessionChanged } from "../src/core/transport.ts";
import { SessionGate } from "../src/core/session.ts";
test("bearer transport pins origin, omits cookies, and rejects external/path escapes", async () => {
  let called = 0;
  const transport = new BusinessTransport(
    "https://api.example.test",
    async (_url, init) => {
      called++;
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("authorization"), "Bearer synthetic");
      assert.equal(headers.get("cookie"), null);
      assert.equal(headers.get("origin"), null);
      assert.equal(init?.credentials, "omit");
      assert.equal(init?.redirect, "error");
      return Response.json({ ok: true });
    },
  );
  transport.bind({ accountId: "a", token: "synthetic" });
  await transport.request("/api/v1/me", {
    headers: { Cookie: "never", Origin: "never", Authorization: "never" },
  });
  for (const path of [
    "https://external.test/api/v1/me",
    "//external.test/api/v1/me",
    "/api/v1/../../private",
    "/api/v1/\\external",
  ]) {
    await assert.rejects(transport.request(path));
  }
  assert.equal(called, 1);
});
test("late response cannot cross account binding even when fetch ignores abort", async () => {
  let deliver!: (value: Response) => void;
  const transport = new BusinessTransport(
    "https://api.example.test",
    () =>
      new Promise((resolve) => {
        deliver = resolve;
      }),
  );
  transport.bind({ accountId: "a", token: "a" });
  const request = transport.request("/api/v1/me");
  transport.bind({ accountId: "b", token: "b" });
  deliver(Response.json({ id: "a" }));
  await assert.rejects(request, SessionChanged);
});
test("session revalidation cannot unlock after forced expiry", async () => {
  const gate = new SessionGate();
  let deliver!: (value: { id: string }) => void;
  const pending = gate.revalidate(
    () =>
      new Promise((resolve) => {
        deliver = resolve;
      }),
  );
  gate.lock("expired");
  deliver({ id: "a" });
  assert.equal(await pending, false);
  assert.equal(gate.state.phase, "locked");
});
test("normal signout preserves pending work; forced lock does not invoke storage deletion", async () => {
  const gate = new SessionGate();
  let cleared = false;
  await assert.rejects(
    gate.signOut(
      async () => 1,
      async () => {
        cleared = true;
      },
    ),
  );
  gate.lock("expired");
  assert.equal(cleared, false);
  await gate.signOut(
    async () => 0,
    async () => {
      cleared = true;
    },
  );
  assert.equal(cleared, true);
  assert.equal(gate.state.phase, "signed-out");
});
