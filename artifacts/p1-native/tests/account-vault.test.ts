import { test } from "node:test";
import assert from "node:assert/strict";
import { AccountVault } from "../src/core/account-vault.ts";
test("crew A → owner MFA lock → cancel → B cannot read, queue, sync or destroy A vault", async () => {
  let closed = 0,
    read = 0,
    queued = 0,
    synced = 0,
    destroyed = 0;
  const a = {
    origin: "https://api.test",
    accountId: "A",
    close: async () => {
      closed++;
    },
    read: () => read++,
    queue: () => queued++,
    sync: () => synced++,
    destroy: () => destroyed++,
  };
  const binding = new AccountVault<typeof a>();
  binding.attach(a);
  assert.equal(binding.require(a.origin, "A"), a);
  await binding.detach();
  assert.equal(binding.current, null);
  await binding.detach();
  const b = { ...a, accountId: "B", close: async () => {} };
  binding.attach(b);
  assert.equal(binding.require(a.origin, "B"), b);
  assert.throws(() => binding.require(a.origin, "A"));
  assert.throws(() => binding.require("https://different.test", "B"));
  assert.equal(closed, 1);
  assert.deepEqual([read, queued, synced, destroyed], [0, 0, 0, 0]);
});
test("locked reference disappears before slow native close completes", async () => {
  let finish!: () => void;
  const binding = new AccountVault<{
    origin: string;
    accountId: string;
    close: () => Promise<void>;
  }>();
  binding.attach({
    origin: "https://api.test",
    accountId: "A",
    close: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const pending = binding.detach();
  assert.equal(binding.current, null);
  assert.throws(() => binding.require("https://api.test", "A"));
  finish();
  await pending;
});
