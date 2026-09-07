import { createHash, createDecipheriv } from "node:crypto";
import {
  validateLegacyUploadMigrationPlan,
  validateLegacyUploadSourceIdentity,
  type LegacyUploadMigrationPlan,
  type LegacyUploadSourceIdentity,
} from "./legacy-upload-migration-plan";

export interface LegacyUploadApproval {
  schemaVersion: 1;
  planId: string;
  ownershipReference: string;
  sourceIdentity: LegacyUploadSourceIdentity;
  target: { stackId: string; bucketName: string; uploadPrefix: string };
}
export interface SourceVerificationDatabase {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}
function object(input: unknown, keys: string[]): Record<string, unknown> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !keys.includes(key))
  )
    throw new Error("Invalid verification input");
  return input as Record<string, unknown>;
}
function string(input: unknown): string {
  if (typeof input !== "string" || !input || input.trim() !== input)
    throw new Error("Invalid verification value");
  return input;
}
export function validateLegacyUploadApproval(
  input: unknown,
  candidate: unknown,
): { approval: LegacyUploadApproval; plan: LegacyUploadMigrationPlan } {
  const plan = validateLegacyUploadMigrationPlan(candidate);
  if (plan.schemaVersion !== 2) throw new Error("Only v2 exact-object dry runs are supported");
  const data = object(input, [
    "schemaVersion",
    "planId",
    "ownershipReference",
    "sourceIdentity",
    "target",
  ]);
  const target = object(data.target, ["stackId", "bucketName", "uploadPrefix"]);
  const approval: LegacyUploadApproval = {
    schemaVersion: 1,
    planId: string(data.planId),
    ownershipReference: string(data.ownershipReference),
    sourceIdentity: validateLegacyUploadSourceIdentity(data.sourceIdentity),
    target: {
      stackId: string(target.stackId),
      bucketName: string(target.bucketName),
      uploadPrefix: string(target.uploadPrefix),
    },
  };
  if (
    data.schemaVersion !== 1 ||
    approval.planId !== plan.planId ||
    approval.ownershipReference !== plan.ownership.reference ||
    JSON.stringify(approval.sourceIdentity) !== JSON.stringify(plan.ownership.sourceIdentity) ||
    approval.target.stackId !== plan.stackId ||
    approval.target.bucketName !== plan.bucketName ||
    approval.target.uploadPrefix !== plan.destinationPrefix
  )
    throw new Error("Independent approval does not match plan");
  return { approval, plan };
}

/** Platform-injected environment is an operational trust boundary, not remote attestation. */
export function assertLegacyUploadRuntimeIdentity(
  env: NodeJS.ProcessEnv,
  expected: LegacyUploadSourceIdentity,
): string {
  const bindings = {
    railwayProjectId: "RAILWAY_PROJECT_ID",
    railwayEnvironmentId: "RAILWAY_ENVIRONMENT_ID",
    railwayServiceId: "RAILWAY_SERVICE_ID",
    deploymentId: "RAILWAY_DEPLOYMENT_ID",
    gitCommitSha: "RAILWAY_GIT_COMMIT_SHA",
  } as const;
  for (const [field, variable] of Object.entries(bindings))
    if (env[variable] !== expected[field as keyof typeof bindings])
      throw new Error("Runtime source identity mismatch");
  const url = new URL(string(env.DATABASE_URL));
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname)
    throw new Error("Invalid runtime database binding");
  for (const key of url.searchParams.keys())
    if (["host", "hostaddr"].includes(key.toLowerCase()))
      throw new Error("Database host override is forbidden");
  return url.hostname;
}

export function createLegacyUploadSourceVerifier(options: {
  plan: unknown;
  approval: unknown;
  env: NodeJS.ProcessEnv;
  database: SourceVerificationDatabase;
}) {
  const { plan, approval } = validateLegacyUploadApproval(options.approval, options.plan);
  assertLegacyUploadRuntimeIdentity(options.env, approval.sourceIdentity);
  const verify = async () => {
    const hostname = assertLegacyUploadRuntimeIdentity(options.env, approval.sourceIdentity);
    const database = await options.database.query("SELECT current_database() AS name");
    const name = string(database.rows[0]?.name);
    const reference =
      "sha256:" +
      createHash("sha256")
        .update(`${approval.sourceIdentity.railwayProjectId}|${hostname}|${name}`)
        .digest("hex");
    if (reference !== approval.sourceIdentity.databaseIdentityReference)
      throw new Error("Database source identity mismatch");
    const record = plan.ownership.record!;
    const response = await options.database.query(
      "SELECT id, r2_key, file_size FROM cms_media WHERE id = $1",
      [record.id],
    );
    const row = response.rows[0];
    if (
      response.rows.length !== 1 ||
      row.id !== record.id ||
      row.r2_key !== record.r2Key ||
      row.file_size !== record.byteLength
    )
      throw new Error("Authoritative source record mismatch");
    return { id: record.id, r2Key: record.r2Key, byteLength: record.byteLength };
  };
  return { plan, approval, verify };
}

/** Read the source installation's own R2 settings; never accept plan endpoint/credentials. */
export async function readLegacyUploadR2Configuration(
  database: SourceVerificationDatabase,
  sessionSecret: string | undefined,
  expectedBucket: string,
) {
  const result = await database.query(
    "SELECT key, value, is_secret FROM system_settings WHERE category = $1 AND key = ANY($2::text[])",
    [
      "cloudflare_r2",
      ["r2_account_id", "r2_access_key_id", "r2_secret_access_key", "r2_bucket_name"],
    ],
  );
  const settings = new Map<string, string>();
  for (const row of result.rows) {
    const key = string(row.key);
    let value = string(row.value);
    if (row.is_secret === true) {
      if (!sessionSecret) throw new Error("Runtime decryption secret is required");
      const parts = value.split(":");
      if (
        parts.length !== 2 ||
        !/^[a-f0-9]{32}$/i.test(parts[0]) ||
        !/^(?:[a-f0-9]{2})+$/i.test(parts[1])
      )
        throw new Error("Invalid encrypted runtime setting");
      const cipher = createDecipheriv(
        "aes-256-cbc",
        createHash("sha256").update(sessionSecret).digest(),
        Buffer.from(parts[0], "hex"),
      );
      value = cipher.update(parts[1], "hex", "utf8") + cipher.final("utf8");
    }
    if (settings.has(key)) throw new Error("Duplicate runtime storage setting");
    settings.set(key, value);
  }
  const accountId = string(settings.get("r2_account_id"));
  if (!/^[a-f0-9]{32}$/i.test(accountId) || settings.get("r2_bucket_name") !== expectedBucket)
    throw new Error("Runtime storage target mismatch");
  return {
    accountId,
    accessKeyId: string(settings.get("r2_access_key_id")),
    secretAccessKey: string(settings.get("r2_secret_access_key")),
    bucketName: expectedBucket,
  };
}
