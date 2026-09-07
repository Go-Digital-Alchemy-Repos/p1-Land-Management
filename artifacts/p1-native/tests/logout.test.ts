import { test } from "node:test";
import assert from "node:assert/strict";
import { logoutAccount } from "../src/core/logout.ts";
test("server signout locks views/reference before failing destroy/credential cleanup", async () => {
  const calls: string[] = [];
  let person: string | null = "A",
    resource: object | null = {};
  await assert.rejects(
    logoutAccount({
      pendingCount: async () => 0,
      signOut: async () => {
        calls.push("server");
      },
      detach: () => {
        person = null;
        resource = null;
        calls.push("lock");
        return Promise.resolve();
      },
      revokeOffline: async () => {
        assert.equal(person, null);
        assert.equal(resource, null);
        calls.push("revoke");
      },
      clearAuth: async () => {
        calls.push("clear");
        throw Error("keychain");
      },
      destroy: async () => {
        calls.push("destroy");
        throw Error("disk");
      },
    }),
    /Signed out/,
  );
  assert.deepEqual(calls, ["server", "lock", "revoke", "clear", "destroy"]);
});
test("pending work prevents server signout; failed revocation prevents destruction but not locking", async () => {
  let count = 1,
    locked = false,
    destroyed = false,
    signedout = false;
  const steps = {
    pendingCount: async () => count,
    signOut: async () => {
      signedout = true;
    },
    detach: async () => {
      locked = true;
    },
    revokeOffline: async () => {
      throw Error("both stores");
    },
    clearAuth: async () => {},
    destroy: async () => {
      destroyed = true;
    },
  };
  await assert.rejects(logoutAccount(steps), /pending work/);
  assert.equal(signedout, false);
  assert.equal(locked, false);
  count = 0;
  await assert.rejects(logoutAccount(steps), /Signed out/);
  assert.equal(locked, true);
  assert.equal(destroyed, false);
});
