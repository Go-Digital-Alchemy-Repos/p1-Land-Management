import { z } from "zod";

const identifier = z.string().min(1).max(63).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const metadata = z.string().max(2048);
const snapshotSchema = z.object({
  manifest: z.object({
    schemaVersion: z.literal(1), clientStackId: metadata.nullish(),
    createdAt: z.string().datetime(), key: metadata.min(1),
    reason: z.enum(["manual", "scheduled", "startup"]),
    appVersion: metadata, gitCommitSha: metadata.nullable(), environment: metadata,
    railwayEnvironment: metadata.nullable(), railwayProjectId: metadata.nullable(), railwayServiceId: metadata.nullable(),
    storageSource: z.enum(["env", "settings"]), bucketName: metadata, bucketPrefix: metadata,
    tableCount: count, totalRowCount: count, mediaAssetCount: count,
    restoreOrder: z.array(identifier).max(1000),
    // Offline captures carry provenance; it is never a restore authorization.
    privateCapture: z.object({
      method: metadata, helperSourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
      transactionReadOnly: z.boolean(), transactionIsolation: metadata,
      excludedTables: z.array(identifier).max(1000), uploaded: z.boolean(), mediaBytesIncluded: z.boolean(),
    }).strict().optional(),
  }).strict(),
  tables: z.array(z.object({name: identifier, rowCount: count, rows: z.array(z.record(z.unknown()))}).strict()).min(1).max(1000),
  sequences: z.array(z.object({tableName: identifier, columnName: identifier, sequenceName: z.string().min(1).max(70).regex(/^(?:public\.)?[a-zA-Z_][a-zA-Z0-9_]*$/)}).strict()).max(10000),
}).strict();

/** Reject ambiguous or corrupt archives before exposing an actionable restore review. */
export function validateBackupRestoreReview(value: unknown) {
  const parsed = snapshotSchema.safeParse(value);
  if (!parsed.success) throw new Error("Backup archive structure is invalid");
  const snapshot = parsed.data;
  const names = new Set(snapshot.tables.map(t => t.name));
  const order = new Set(snapshot.manifest.restoreOrder);
  const sequences = new Set(snapshot.sequences.map(s => s.sequenceName.replace(/^public\./, "")));
  if (names.size !== snapshot.tables.length || order.size !== names.size ||
      snapshot.manifest.restoreOrder.length !== names.size || [...order].some(n => !names.has(n)) ||
      snapshot.manifest.tableCount !== names.size ||
      snapshot.tables.some(t => t.rowCount !== t.rows.length) ||
      snapshot.manifest.totalRowCount !== snapshot.tables.reduce((n,t) => n + t.rows.length, 0) ||
      snapshot.manifest.mediaAssetCount !== (snapshot.tables.find(t => t.name === "cms_media")?.rows.length ?? 0) ||
      sequences.size !== snapshot.sequences.length || snapshot.sequences.some(s => !names.has(s.tableName))) {
    throw new Error("Backup archive counts or restore references are inconsistent");
  }
  for (const table of snapshot.tables) {
    const columns = Object.keys(table.rows[0] ?? {}).sort();
    if (table.rows.some(row => {
      const keys = Object.keys(row).sort();
      return keys.length === 0 || keys.some(key => !identifier.safeParse(key).success) ||
        JSON.stringify(keys) !== JSON.stringify(columns);
    })) throw new Error("Backup archive row columns are inconsistent");
  }
  return snapshot;
}
