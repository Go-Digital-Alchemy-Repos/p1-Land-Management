import { test } from "node:test";
import assert from "node:assert/strict";
import { obtainDatabaseKey } from "../src/core/key-policy.ts";
test("missing key with an existing database never creates a new empty identity", async () => {
  let generated = false,
    persisted = false;
  await assert.rejects(
    obtainDatabaseKey({
      databaseExists: true,
      readKey: async () => null,
      generateKey: async () => {
        generated = true;
        return "a".repeat(64);
      },
      persistKey: async () => {
        persisted = true;
      },
    }),
    /Recovery/,
  );
  assert.equal(generated, false);
  assert.equal(persisted, false);
});
test("secure-store read error cannot trigger key replacement", async () => {
  let generated = false;
  await assert.rejects(
    obtainDatabaseKey({
      databaseExists: false,
      readKey: async () => {
        throw new Error("device locked");
      },
      generateKey: async () => {
        generated = true;
        return "a".repeat(64);
      },
      persistKey: async () => {},
    }),
  );
  assert.equal(generated, false);
});
test("a new key is returned only after durable secure-store success", async () => {
  await assert.rejects(
    obtainDatabaseKey({
      databaseExists: false,
      readKey: async () => null,
      generateKey: async () => "a".repeat(64),
      persistKey: async () => {
        throw new Error("secure-store unavailable");
      },
    }),
  );
});
test("valid existing key reused; malformed key locks instead of replacing", async () => {
  const base = {
    databaseExists: true,
    generateKey: async () => {
      throw new Error("must not generate");
    },
    persistKey: async () => {
      throw new Error("must not write");
    },
  };
  assert.equal(
    await obtainDatabaseKey({ ...base, readKey: async () => "a".repeat(64) }),
    "a".repeat(64),
  );
  await assert.rejects(
    obtainDatabaseKey({ ...base, readKey: async () => "invalid" }),
    /Recovery/,
  );
});
