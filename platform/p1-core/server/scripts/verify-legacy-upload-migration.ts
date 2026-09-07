import { constants, realpathSync } from "node:fs";
import { open } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { S3Client } from "@aws-sdk/client-s3";
import { databasePoolConfig } from "../config/database";
import {
  createLegacyUploadSourceVerifier,
  readLegacyUploadR2Configuration,
} from "../services/legacy-upload-source-verification";
import {
  createLegacyUploadStorage,
  type LegacyUploadStorage,
} from "../services/legacy-upload-storage";
import { executeLegacyUploadMigration } from "../services/legacy-upload-migration";

export async function readMigrationInput(path: string) {
  if (!path || path.length > 4096 || path.includes("\0")) throw new Error("Invalid input path");
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (
      !stat.isFile() ||
      stat.size > 64 * 1024 ||
      (stat.mode & 0o777) !== 0o600 ||
      stat.uid !== process.getuid?.()
    )
      throw new Error("Invalid bounded input file");
    const buffer = Buffer.alloc(64 * 1024 + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > 64 * 1024) throw new Error("Input file exceeds limit");
    return {
      value: JSON.parse(buffer.subarray(0, length).toString("utf8")) as unknown,
      device: stat.dev,
      inode: stat.ino,
    };
  } finally {
    await file.close();
  }
}

export async function runLegacyUploadDryRun(
  verifier: ReturnType<typeof createLegacyUploadSourceVerifier>,
  storage: LegacyUploadStorage,
) {
  // Defence in depth: no call path from this command can create an object.
  const readOnly: LegacyUploadStorage = {
    bucketName: storage.bucketName,
    read: (key) => storage.read(key),
    createOnly: async () => {
      throw new Error("Dry run prohibits writes");
    },
  };
  const result = await executeLegacyUploadMigration({
    plan: verifier.plan,
    expectedSourceIdentity: verifier.approval.sourceIdentity,
    target: verifier.approval.target,
    storage: readOnly,
    apply: false,
    verifyOwnership: async () => {
      await verifier.verify();
    },
    readSourceRecord: async () => verifier.verify(),
    record: async () => {},
  });
  // Verify the authoritative row again after the bounded object reads as well.
  await verifier.verify();
  return {
    schemaVersion: 1,
    mode: "dry-run",
    planId: result.planId,
    complete: result.complete,
    objectCount: result.results.length,
    statuses: result.results.map((entry) => entry.status),
    sourceRecordVerified: true,
    writesPerformed: false,
  };
}

export async function main(args: string[], env: NodeJS.ProcessEnv) {
  let pool: pg.Pool | undefined;
  let client: S3Client | undefined;
  let databaseFailed = false;
  try {
    if (args.length !== 4 || args[0] !== "--plan" || args[2] !== "--approval")
      throw new Error("Usage: --plan <file> --approval <independent-file>");
    const plan = await readMigrationInput(args[1]);
    const approval = await readMigrationInput(args[3]);
    if (plan.device === approval.device && plan.inode === approval.inode)
      throw new Error("Approval must be independent input");
    // node-postgres URL options override explicit pool options; preserve the read-only session.
    if ([...new URL(env.DATABASE_URL || "").searchParams.keys()].some((key) => key !== "sslmode")) {
      throw new Error("Database URL session overrides are not allowed for verification");
    }
    // The verifier checks platform IDs before the lazy pool establishes a connection.
    pool = new pg.Pool({
      ...databasePoolConfig(env),
      max: 1,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 10_000,
      query_timeout: 15_000,
      options: "-c default_transaction_read_only=on",
    });
    pool.on("error", () => {
      databaseFailed = true;
    });
    const verifier = createLegacyUploadSourceVerifier({
      plan: plan.value,
      approval: approval.value,
      env,
      database: pool,
    });
    await verifier.verify();
    const storageConfig = await readLegacyUploadR2Configuration(
      pool,
      env.SESSION_SECRET,
      verifier.approval.target.bucketName,
    );
    client = new S3Client({
      region: "auto",
      endpoint: `https://${storageConfig.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: storageConfig.accessKeyId,
        secretAccessKey: storageConfig.secretAccessKey,
      },
      maxAttempts: 1,
    });
    const evidence = await runLegacyUploadDryRun(
      verifier,
      createLegacyUploadStorage(client, storageConfig.bucketName),
    );
    if (databaseFailed) throw new Error("Database connection failed");
    process.stdout.write(JSON.stringify(evidence) + "\n");
    return evidence.complete ? 0 : 1;
  } catch {
    // Never reflect SDK/SQL/decryption errors, rows, arguments, or connection strings.
    process.stdout.write(
      JSON.stringify({
        schemaVersion: 1,
        mode: "dry-run",
        complete: false,
        error: "Source verification or dry run failed; no writes were requested.",
      }) + "\n",
    );
    return 1;
  } finally {
    client?.destroy();
    if (pool) await pool.end().catch(() => undefined);
  }
}
function isDirectInvocation(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
if (isDirectInvocation()) {
  process.exitCode = await main(process.argv.slice(2), process.env);
}
