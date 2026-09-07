import { test } from "node:test";
import assert from "node:assert/strict";
import { OfflineRevocation } from "../src/core/offline-revocation.ts";
import { AccountVault } from "../src/core/account-vault.ts";
test("SecureStore deletion failure retains durable deny marker across a new process policy", async () => {
  let marked = false;
  const storage = {
    mark: async () => {
      marked = true;
    },
    marked: async () => marked,
    unmark: async () => {
      marked = false;
    },
    deleteEntry: async () => {
      throw Error("SecureStore unavailable");
    },
  };
  const policy = new OfflineRevocation(storage);
  const vault = new AccountVault();
  let closed = false;
  vault.attach({
    origin: "https://api.test",
    accountId: "A",
    close: async () => {
      closed = true;
    },
  });
  const detached = vault.detach();
  const revoked = policy.revoke("https://api.test");
  assert.equal(vault.current, null);
  assert.throws(() => vault.require("https://api.test", "A"));
  await assert.rejects(policy.assertAllowed("https://api.test"));
  await Promise.all([detached, revoked]);
  assert.equal(closed, true);
  await assert.rejects(
    new OfflineRevocation(storage).assertAllowed("https://api.test"),
  );
  await policy.verified("https://api.test");
  await policy.assertAllowed("https://api.test");
});
test("both storage failures still lock in memory and explicitly report failed durable revocation", async () => {
  const policy = new OfflineRevocation({
    mark: async () => {
      throw Error("disk");
    },
    marked: async () => false,
    unmark: async () => {},
    deleteEntry: async () => {
      throw Error("keychain");
    },
  });
  await assert.rejects(policy.revoke("https://api.test"), /both device stores/);
  await assert.rejects(policy.assertAllowed("https://api.test"));
});
