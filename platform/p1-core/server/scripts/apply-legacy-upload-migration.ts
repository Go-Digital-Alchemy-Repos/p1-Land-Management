import { realpathSync } from "node:fs";
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
import {
  createApplyLedger,
  readApplyInput,
  validateApplyInputs,
  type ApplyLedger,
} from "./legacy-upload-apply-support";

export async function runLegacyUploadApply(options: {
  verifier: ReturnType<typeof createLegacyUploadSourceVerifier>;
  storage: LegacyUploadStorage;
  ledger: ApplyLedger;
  drain: ReturnType<typeof validateApplyInputs>["drain"];
  assertRuntime: () => void;
}) {
  let dispatchStarted = false;
  const { verifier, ledger } = options;
  try {
    options.assertRuntime();
    await verifier.verify();
    await ledger.append({
      event: "apply-start",
      schemaVersion: 1,
      planId: verifier.plan.planId,
      sourceIdentity: verifier.approval.sourceIdentity,
      target: verifier.approval.target,
      writerDrain: options.drain,
      writerDrainVerifiedByCommand: false,
    });
    const result = await executeLegacyUploadMigration({
      plan: verifier.plan,
      expectedSourceIdentity: verifier.approval.sourceIdentity,
      target: verifier.approval.target,
      apply: true,
      approvedPlanId: verifier.approval.planId,
      verifyOwnership: async () => {
        options.assertRuntime();
        await verifier.verify();
      },
      readSourceRecord: async () => {
        options.assertRuntime();
        return verifier.verify();
      },
      storage: {
        bucketName: options.storage.bucketName,
        read: (key) => options.storage.read(key),
        createOnly: async (key, object) => {
          options.assertRuntime();
          await verifier.verify();
          await ledger.append({
            event: "copy-dispatch-intent",
            planId: verifier.plan.planId,
            destinationKey: key,
          });
          options.assertRuntime();
          // Any rejection after this point may follow a remotely accepted write.
          dispatchStarted = true;
          return options.storage.createOnly(key, object);
        },
      },
      record: async (result) => {
        await ledger.append({ event: "object-result", ...result });
      },
    });
    options.assertRuntime();
    await verifier.verify();
    await ledger.append({
      event: "apply-finished",
      planId: result.planId,
      complete: result.complete,
    });
    return {
      schemaVersion: 1,
      mode: "apply",
      planId: result.planId,
      complete: result.complete,
      statuses: result.results.map((result) => result.status),
      writerDrainVerifiedByCommand: false,
    };
  } catch {
    await ledger
      .append({
        event: "apply-failed",
        possibleRemoteWrite: dispatchStarted,
        message: "Apply did not complete; preserve objects and verify actual state before retry.",
      })
      .catch(() => undefined);
    throw new Error(
      "Apply did not complete; preserve objects and verify actual state before retry.",
    );
  }
}

export async function main(args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  let pool: pg.Pool | undefined;
  let client: S3Client | undefined;
  let ledger: ApplyLedger | undefined;
  let databaseFailed = false;
  try {
    if (
      args.length !== 9 ||
      args[0] !== "--apply" ||
      args[1] !== "--plan" ||
      args[3] !== "--approval" ||
      args[5] !== "--writer-drain" ||
      args[7] !== "--ledger"
    )
      throw new Error("Explicit apply arguments required");
    const assertRuntime = () => {
      if (env.UPLOAD_MUTATIONS_FROZEN !== "true" || databaseFailed)
        throw new Error("Frozen healthy source required");
    };
    assertRuntime();
    if ([...new URL(env.DATABASE_URL || "").searchParams.keys()].some((key) => key !== "sslmode"))
      throw new Error("Database options override forbidden");
    const inputs = await Promise.all([
      readApplyInput(args[2]),
      readApplyInput(args[4]),
      readApplyInput(args[6]),
    ]);
    if (new Set(inputs.map((input) => `${input.device}:${input.inode}`)).size !== inputs.length)
      throw new Error("Independent inputs required");
    const verified = validateApplyInputs(inputs[0].value, inputs[1].value, inputs[2].value);
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
      plan: verified.plan,
      approval: verified.approval,
      env,
      database: pool,
    });
    await verifier.verify();
    const config = await readLegacyUploadR2Configuration(
      pool,
      env.SESSION_SECRET,
      verified.approval.target.bucketName,
    );
    ledger = await createApplyLedger(args[8]);
    client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      maxAttempts: 1,
    });
    const evidence = await runLegacyUploadApply({
      verifier,
      storage: createLegacyUploadStorage(client, config.bucketName),
      ledger,
      drain: verified.drain,
      assertRuntime,
    });
    process.stdout.write(JSON.stringify(evidence) + "\n");
    return evidence.complete ? 0 : 1;
  } catch {
    process.stdout.write(
      JSON.stringify({
        schemaVersion: 1,
        mode: "apply",
        complete: false,
        error:
          "Apply failed or was rejected. Writes may have occurred; preserve objects and inspect the ledger before a verified retry.",
      }) + "\n",
    );
    return 1;
  } finally {
    client?.destroy();
    if (ledger) await ledger.close().catch(() => undefined);
    if (pool) await pool.end().catch(() => undefined);
  }
}
function isDirectInvocation() {
  try {
    return (
      Boolean(process.argv[1]) &&
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}
if (isDirectInvocation())
  void main(process.argv.slice(2), process.env).then((code) => {
    process.exitCode = code;
  });
