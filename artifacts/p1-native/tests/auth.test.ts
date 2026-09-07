import { test } from "node:test";
import assert from "node:assert/strict";
import { AuthProtocol } from "../src/core/auth.ts";
test("MFA intermediate cookie never becomes a persisted business token", async () => {
  let writes = 0;
  const auth = new AuthProtocol(
    "https://api.example.test",
    {
      read: async () => null,
      remove: async () => {},
      write: async () => {
        writes++;
      },
    },
    async () =>
      Response.json(
        { twoFactorRedirect: true },
        {
          headers: {
            "set-cookie":
              "__Secure-p1-dashboard.two_factor=synthetic; HttpOnly",
          },
        },
      ),
  );
  assert.equal((await auth.call("sign-in/email", {})).challenge, true);
  assert.equal(auth.getToken(), null);
  assert.equal(writes, 0);
});
test("secure-store write failure never enables in-memory authorization", async () => {
  const auth = new AuthProtocol(
    "https://api.example.test",
    {
      read: async () => null,
      remove: async () => {},
      write: async () => {
        throw new Error("storage failed");
      },
    },
    async () =>
      Response.json({}, { headers: { "set-auth-token": "synthetic" } }),
  );
  await assert.rejects(auth.call("sign-in/email", {}), /storage failed/);
  assert.equal(auth.getToken(), null);
});
test("clearing auth while sign-in is in flight discards late credentials", async () => {
  let deliver!: (r: Response) => void,
    writes = 0;
  const auth = new AuthProtocol(
    "https://api.example.test",
    {
      read: async () => null,
      remove: async () => {},
      write: async () => {
        writes++;
      },
    },
    () =>
      new Promise((r) => {
        deliver = r;
      }),
  );
  const request = auth.call("sign-in/email", {});
  await new Promise((r) => setTimeout(r, 0));
  await auth.clear();
  deliver(Response.json({}, { headers: { "set-auth-token": "synthetic" } }));
  await assert.rejects(request, /session changed/);
  assert.equal(writes, 0);
  assert.equal(auth.getToken(), null);
});
test("overlapping sign-ins are rejected before any secure-store await", async () => {
  let release!: (r: Response) => void,
    calls = 0;
  const auth = new AuthProtocol(
    "https://api.example.test",
    { read: async () => null, remove: async () => {}, write: async () => {} },
    () => {
      calls++;
      return new Promise((resolve) => {
        release = resolve;
      });
    },
  );
  const a = auth.call("sign-in/email", { email: "synthetic-a" });
  await assert.rejects(
    auth.call("sign-in/email", { email: "synthetic-b" }),
    /already pending/,
  );
  await new Promise((r) => setTimeout(r, 0));
  release(Response.json({}, { headers: { "set-auth-token": "synthetic-a" } }));
  await a;
  assert.equal(calls, 1);
  assert.equal(auth.getToken(), "synthetic-a");
});
test("clear waits behind a pending secure-store write and leaves no credential", async () => {
  let stored: string | null = null,
    finish!: () => void;
  const auth = new AuthProtocol(
    "https://api.example.test",
    {
      read: async () => stored,
      remove: async () => {
        stored = null;
      },
      write: async (token) => {
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        stored = token;
      },
    },
    async () =>
      Response.json({}, { headers: { "set-auth-token": "synthetic" } }),
  );
  const request = auth.call("sign-in/email", {});
  await new Promise((r) => setTimeout(r, 0));
  const clear = auth.clear();
  finish();
  await assert.rejects(request, /session changed/);
  await clear;
  assert.equal(stored, null);
  assert.equal(auth.getToken(), null);
});
