/**
 * The encrypted field workspace is intentionally versioned independently of
 * application code. Migrations are forward-only: a newer protected workspace
 * is never opened by an older build and silently modified.
 */
export const CURRENT_VAULT_SCHEMA_VERSION = 2;

export type VaultMigration = Readonly<{
  from: number;
  to: number;
  statements: readonly string[];
}>;

const migrations: readonly VaultMigration[] = [
  {
    from: 0,
    to: 1,
    statements: [
      "CREATE TABLE IF NOT EXISTS operations(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,payload TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending')",
      "CREATE TABLE IF NOT EXISTS photos(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,manifest TEXT NOT NULL,bytes BLOB NOT NULL,state TEXT NOT NULL DEFAULT 'pending')",
    ],
  },
  {
    from: 1,
    to: 2,
    statements: [
      "CREATE TABLE IF NOT EXISTS photo_staging(id TEXT PRIMARY KEY,manifest TEXT NOT NULL,temporary_uri TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending')",
    ],
  },
];

export function vaultMigrationPlan(version: number): readonly VaultMigration[] {
  if (!Number.isSafeInteger(version) || version < 0)
    throw new Error("Protected storage version is invalid.");
  if (version > CURRENT_VAULT_SCHEMA_VERSION)
    throw new Error(
      "Protected storage was created by a newer P1 Field build. Update the app before opening it.",
    );

  const plan: VaultMigration[] = [];
  let current = version;
  while (current < CURRENT_VAULT_SCHEMA_VERSION) {
    const migration = migrations.find(
      (candidate) => candidate.from === current,
    );
    if (!migration)
      throw new Error("Protected storage upgrade path is unavailable.");
    plan.push(migration);
    current = migration.to;
  }
  return plan;
}
