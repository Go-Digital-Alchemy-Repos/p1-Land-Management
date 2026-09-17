import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CURRENT_VAULT_SCHEMA_VERSION,
  vaultMigrationPlan,
} from "../src/core/vault-migrations.ts";

test("protected workspace migration is forward-only from the deployed v1 schema", () => {
  assert.equal(CURRENT_VAULT_SCHEMA_VERSION, 2);
  assert.deepEqual(
    vaultMigrationPlan(1).map(({ from, to }) => [from, to]),
    [[1, 2]],
  );
  assert.match(vaultMigrationPlan(1)[0].statements[0], /photo_staging/);
  assert.deepEqual(vaultMigrationPlan(2), []);
});

test("fresh workspaces receive every required encrypted-storage migration", () => {
  assert.deepEqual(
    vaultMigrationPlan(0).map(({ from, to }) => [from, to]),
    [
      [0, 1],
      [1, 2],
    ],
  );
  assert.throws(() => vaultMigrationPlan(-1), /version is invalid/);
  assert.throws(() => vaultMigrationPlan(3), /newer P1 Field build/);
});
