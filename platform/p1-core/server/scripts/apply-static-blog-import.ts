import { constants, realpathSync } from "node:fs";
import { open, realpath, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { User } from "@shared/schema";
import type { ReviewedBlogMediaFile } from "../services/blog-media-staging.service";
import type { LegacyUploadStorage } from "../services/legacy-upload-storage";
import type { StaticBlogImportResult } from "../services/blog-static-import.service";
import type { ApplyLedger } from "./legacy-upload-apply-support";

export const BLOG_IMPORT_RUNTIME = {
  project: "e83f79dd-d901-4ab1-836b-bdf272b58dc2",
  environment: "6126e9ca-b071-4c41-b7c0-aa945fa37067",
  service: "45646c66-c173-4e23-81ab-64ca4d545bbe",
  prefix: "clients/p1landmanagement.com/uploads",
} as const;
const sha = (data: Buffer) => createHash("sha256").update(data).digest("hex");
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const fileSchema = z
  .object({
    sourceSlug: z.string(),
    role: z.enum(["original", "variant"]),
    sha256: digest,
    bytes: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
    mime: z.enum(["image/png", "image/webp"]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    quality: z.number().nullable(),
    relativePath: z.string().min(1).max(4096),
    path: z.string(),
    servedPaths: z.array(z.string()),
  })
  .strict();
const artifactSchema = z
  .object({
    schemaVersion: z.literal(1),
    mode: z.literal("prepare-only"),
    canApply: z.literal(false),
    actorId: z.string().trim().min(1),
    plan: z.unknown(),
    expectedPlanSha256: digest,
    files: z.array(fileSchema).length(20),
    audit: z.unknown(),
  })
  .strict();
export function parseBlogApplyArguments(args: string[]) {
  const flags = [
    "--apply",
    "--plan",
    "--expected-plan-sha",
    "--files-root",
    "--expected-bucket",
    "--ledger",
  ];
  if (
    args.length !== 11 ||
    args[0] !== flags[0] ||
    flags.slice(1).some((flag, i) => args[1 + i * 2] !== flag)
  )
    throw Error("Explicit Blog apply arguments required");
  const [, , planPath, , expectedPlanSha256, , filesRoot, , expectedBucket, , ledgerPath] = args;
  digest.parse(expectedPlanSha256);
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(expectedBucket))
    throw Error("Exact bucket required");
  return { planPath, expectedPlanSha256, filesRoot, expectedBucket, ledgerPath };
}
export function assertBlogApplyRuntime(env: NodeJS.ProcessEnv) {
  if (
    env.RAILWAY_PROJECT_ID !== BLOG_IMPORT_RUNTIME.project ||
    env.RAILWAY_ENVIRONMENT_ID !== BLOG_IMPORT_RUNTIME.environment ||
    env.RAILWAY_SERVICE_ID !== BLOG_IMPORT_RUNTIME.service ||
    env.NODE_ENV !== "production"
  )
    throw Error("Exact P1 Core production runtime required");
  if (env.UPLOAD_MUTATIONS_FROZEN === "true") throw Error("Upload mutations are frozen");
}
async function noSymlinkPath(filename: string) {
  if (
    !path.isAbsolute(filename) ||
    filename.includes("\0") ||
    filename.split(path.sep).some((segment) => segment === ".." || segment === ".")
  )
    throw Error("Absolute normalized path required");
  let current = path.parse(filename).root;
  for (const segment of filename.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if ((await lstat(current)).isSymbolicLink()) throw Error("Symlink paths are not accepted");
  }
}
export async function readBlogApplyFile(filename: string, maxBytes: number) {
  await noSymlinkPath(filename);
  const file = await open(
    filename,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const before = await file.stat();
    if (!before.isFile() || before.nlink !== 1 || before.size < 1 || before.size > maxBytes)
      throw Error("Invalid bounded input file");
    const bytes = Buffer.alloc(before.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const result = await file.read(bytes, length, bytes.length - length, null);
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    const after = await file.stat();
    if (
      length !== before.size ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    )
      throw Error("Input changed during read");
    return bytes.subarray(0, length);
  } finally {
    await file.close();
  }
}
export class BlogApplyIncompleteError extends Error {
  readonly code = "BLOG_APPLY_INCOMPLETE";
  readonly recoveryRequired: boolean;
  constructor(
    readonly possibleObjectWrite: boolean,
    readonly possibleDatabaseWrite: boolean,
  ) {
    super("Blog apply incomplete. Preserve ledger and objects; verify actual state before retry.");
    this.recoveryRequired = possibleObjectWrite || possibleDatabaseWrite;
  }
}

export type BlogApplyDependencies = {
  hashPlan: (plan: unknown, actorId: string) => string;
  hashFiles: (files: ReviewedBlogMediaFile[]) => string;
  loadActor: (id: string) => Promise<User | undefined>;
  importArticles: (
    plan: unknown,
    actor: User,
    files: ReviewedBlogMediaFile[],
    storage: LegacyUploadStorage,
    hash: string,
  ) => Promise<StaticBlogImportResult>;
  keyForFile: (file: ReviewedBlogMediaFile) => string;
  storage: LegacyUploadStorage;
  prefix: string;
  freezeGuard: () => void;
  createLedger: (filename: string) => Promise<ApplyLedger>;
};
/** Operator-only command. Injected adapters let tests prove admission without a DB/provider. */
export async function runStaticBlogApply(
  args: string[],
  env: NodeJS.ProcessEnv,
  deps: BlogApplyDependencies,
) {
  let ledger: ApplyLedger | undefined;
  let objectWriteDispatched = false,
    importerDispatched = false;
  const runtime = () => {
    assertBlogApplyRuntime(env);
    deps.freezeGuard();
  };
  try {
    const options = parseBlogApplyArguments(args);
    runtime();
    if (
      deps.storage.bucketName !== options.expectedBucket ||
      deps.prefix !== BLOG_IMPORT_RUNTIME.prefix
    )
      throw Error("Exact P1 upload bucket and prefix required");
    const artifactBytes = await readBlogApplyFile(options.planPath, 16 * 1024 * 1024);
    const artifact = artifactSchema.parse(JSON.parse(artifactBytes.toString("utf8")));
    if (
      artifact.expectedPlanSha256 !== options.expectedPlanSha256 ||
      deps.hashPlan(artifact.plan, artifact.actorId) !== options.expectedPlanSha256
    )
      throw Error("Reviewed actor-bound plan hash mismatch");
    await noSymlinkPath(options.filesRoot);
    const root = await realpath(options.filesRoot);
    if (!(await lstat(root)).isDirectory()) throw Error("Files root must be a directory");
    const files: ReviewedBlogMediaFile[] = [];
    const paths = new Set<string>();
    let total = 0;
    for (const item of artifact.files) {
      if (
        path.isAbsolute(item.relativePath) ||
        item.relativePath.includes("\\") ||
        item.relativePath.split("/").some((p) => !p || p === "." || p === "..")
      )
        throw Error("Unsafe relative media path");
      const filename = path.resolve(root, item.relativePath);
      if (!filename.startsWith(root + path.sep) || paths.has(filename))
        throw Error("Duplicate or escaped media path");
      paths.add(filename);
      const data = await readBlogApplyFile(filename, 10 * 1024 * 1024);
      if (data.length !== item.bytes || sha(data) !== item.sha256)
        throw Error("Reviewed media bytes changed");
      total += data.length;
      if (total > 50 * 1024 * 1024) throw Error("Total media byte limit exceeded");
      const { relativePath: _relative, path: _path, servedPaths: _served, ...metadata } = item;
      files.push({ ...metadata, data });
    }
    const plan = artifact.plan as { fileManifestSha256?: unknown };
    if (deps.hashFiles(files) !== plan.fileManifestSha256)
      throw Error("Reviewed file metadata changed");
    const actor = async () => {
      runtime();
      const user = await deps.loadActor(artifact.actorId);
      if (
        !user ||
        user.id !== artifact.actorId ||
        user.role !== "admin" ||
        user.isSuspended !== false
      )
        throw Error("An active reviewed local administrator is required");
      return user;
    };
    const user = await actor();
    await noSymlinkPath(path.dirname(options.ledgerPath));
    ledger = await deps.createLedger(options.ledgerPath);
    await ledger.append({
      event: "apply-start",
      schemaVersion: 1,
      planSha256: options.expectedPlanSha256,
      artifactSha256: sha(artifactBytes),
      actorId: user.id,
      websiteDeploymentVerifiedByCommand: false,
    });
    const physical = (key: string) => {
      if (!/^cms\/blog-static\/[a-f0-9]{64}\.(png|webp)$/.test(key))
        throw Error("Unexpected Blog staging key");
      return `${deps.prefix}/${key}`;
    };
    const storage: LegacyUploadStorage = {
      bucketName: deps.storage.bucketName,
      read: async (key) => {
        await actor();
        return deps.storage.read(physical(key));
      },
      createOnly: async (key, object) => {
        await actor();
        const physicalKey = physical(key);
        await ledger!.append({ event: "object-write-intent", logicalKey: key, physicalKey });
        runtime();
        objectWriteDispatched = true;
        const result = await deps.storage.createOnly(physicalKey, object);
        await ledger!.append({ event: "object-write-result", logicalKey: key, result });
        return result;
      },
    };
    const currentActor = await actor();
    importerDispatched = true;
    const result = await deps.importArticles(
      artifact.plan,
      currentActor,
      files,
      storage,
      options.expectedPlanSha256,
    );
    if (result.planSha256 !== options.expectedPlanSha256)
      throw Error("Import result identity changed");
    // Exact receipt replay does not itself prove that provider objects still exist.
    for (const file of files) {
      const key = deps.keyForFile(file),
        object = await storage.read(key);
      if (
        !object ||
        object.body.length !== file.bytes ||
        sha(object.body) !== file.sha256 ||
        object.contentType !== file.mime
      )
        throw Error("Post-import object verification failed");
      await ledger.append({
        event: "object-verified",
        logicalKey: key,
        sha256: file.sha256,
        bytes: file.bytes,
      });
    }
    runtime();
    await ledger.append({
      event: "apply-finished",
      planSha256: result.planSha256,
      replay: result.replay,
      complete: true,
      websiteDeploymentVerifiedByCommand: false,
    });
    return result;
  } catch {
    await ledger
      ?.append({
        event: "apply-incomplete",
        possibleObjectWrite: objectWriteDispatched,
        possibleDatabaseWrite: importerDispatched,
        message:
          "Preserve objects and ledger; inspect actual receipts and storage before any retry.",
      })
      .catch(() => undefined);
    throw new BlogApplyIncompleteError(objectWriteDispatched, importerDispatched);
  } finally {
    try {
      await ledger?.close();
    } catch {
      throw new BlogApplyIncompleteError(objectWriteDispatched, importerDispatched);
    }
  }
}

export async function main(args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  let client: { destroy: () => void } | undefined;
  let closeDb: (() => Promise<void>) | undefined;
  try {
    parseBlogApplyArguments(args);
    assertBlogApplyRuntime(env);
    const { getEnvironmentS3Config } = await import("../services/r2.service");
    const config = getEnvironmentS3Config();
    if (
      !config ||
      config.prefix !== BLOG_IMPORT_RUNTIME.prefix ||
      config.bucketName !== parseBlogApplyArguments(args).expectedBucket
    )
      throw Error("Dedicated environment upload configuration required");
    const { S3Client } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
    client = s3;
    const { createLegacyUploadStorage } = await import("../services/legacy-upload-storage");
    const { createApplyLedger } = await import("./legacy-upload-apply-support");
    const { assertUploadMutationsAllowed } = await import("../services/upload-mutation-policy");
    const { db, pool } = await import("../db");
    closeDb = () => pool.end();
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const { hashStaticBlogImportPlan, hashStaticBlogFileManifest, importStaticBlogArticles } =
      await import("../services/blog-static-import.service");
    const result = await runStaticBlogApply(args, env, {
      hashPlan: hashStaticBlogImportPlan,
      hashFiles: hashStaticBlogFileManifest,
      loadActor: async (id) => (await db.select().from(users).where(eq(users.id, id)))[0],
      importArticles: importStaticBlogArticles,
      keyForFile: (file) =>
        `cms/blog-static/${file.sha256}.${file.role === "original" ? "png" : "webp"}`,
      storage: createLegacyUploadStorage(s3, config.bucketName, 10 * 1024 * 1024),
      prefix: config.prefix,
      freezeGuard: assertUploadMutationsAllowed,
      createLedger: createApplyLedger,
    });
    console.log(
      JSON.stringify({
        complete: true,
        planSha256: result.planSha256,
        replay: result.replay,
        articles: result.articles.length,
        websiteDeploymentVerifiedByCommand: false,
      }),
    );
    return 0;
  } catch (error) {
    const status =
      error instanceof BlogApplyIncompleteError
        ? error
        : new BlogApplyIncompleteError(false, false);
    console.error(
      JSON.stringify({
        code: status.code,
        complete: false,
        recoveryRequired: status.recoveryRequired,
        possibleObjectWrite: status.possibleObjectWrite,
        possibleDatabaseWrite: status.possibleDatabaseWrite,
        message: status.message,
      }),
    );
    return 1;
  } finally {
    client?.destroy();
    await closeDb?.().catch(() => undefined);
  }
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url))
  void main(process.argv.slice(2), process.env).then((code) => {
    process.exitCode = code;
  });
