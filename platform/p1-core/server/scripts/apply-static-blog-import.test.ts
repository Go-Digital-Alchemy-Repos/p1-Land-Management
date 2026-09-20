import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { mkdtemp, realpath, writeFile, readFile, stat, symlink, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  runStaticBlogApply,
  BLOG_IMPORT_RUNTIME,
  type BlogApplyDependencies,
} from "./apply-static-blog-import";
import { createApplyLedger } from "./legacy-upload-apply-support";
import type { User } from "@shared/schema";
import type { MigrationObject } from "../services/legacy-upload-storage";
const digest = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
let root: string,
  artifact: any,
  deps: BlogApplyDependencies,
  args: string[],
  env: NodeJS.ProcessEnv,
  objects: Map<string, MigrationObject>;
const planHash = (plan: unknown, actorId: string) => digest(JSON.stringify({ plan, actorId }));
const fileHash = (files: any[]) =>
  digest(
    JSON.stringify(
      files.map(
        ({
          data: _data,
          path: _path,
          servedPaths: _served,
          relativePath: _relative,
          ...metadata
        }) => metadata,
      ),
    ),
  );
const key = (file: any) =>
  `cms/blog-static/${file.sha256}.${file.role === "original" ? "png" : "webp"}`;
beforeEach(async () => {
  root = await realpath(await mkdtemp(path.join(os.tmpdir(), "blog-runner-test-")));
  const files = [];
  for (let i = 0; i < 20; i++) {
    const data = Buffer.from(`reviewed fixture ${i}`),
      relativePath = `image${i}.png`;
    await writeFile(path.join(root, relativePath), data);
    files.push({
      sourceSlug: `fixture-${i}`,
      role: "original",
      sha256: digest(data),
      bytes: data.length,
      mime: "image/png",
      width: 1408,
      height: 768,
      quality: null,
      relativePath,
      path: `/private/old-workstation/${relativePath}`,
      servedPaths: [],
    });
  }
  const plan = { fileManifestSha256: fileHash(files) };
  artifact = {
    schemaVersion: 1,
    mode: "prepare-only",
    canApply: false,
    actorId: "admin-one",
    plan,
    expectedPlanSha256: planHash(plan, "admin-one"),
    files,
    audit: { externalDeploymentProof: false },
  };
  await writeFile(path.join(root, "plan.json"), JSON.stringify(artifact));
  args = [
    "--apply",
    "--plan",
    path.join(root, "plan.json"),
    "--expected-plan-sha",
    artifact.expectedPlanSha256,
    "--files-root",
    root,
    "--expected-bucket",
    "fixture-bucket",
    "--ledger",
    path.join(root, "ledger.jsonl"),
  ];
  env = {
    NODE_ENV: "production",
    RAILWAY_PROJECT_ID: BLOG_IMPORT_RUNTIME.project,
    RAILWAY_ENVIRONMENT_ID: BLOG_IMPORT_RUNTIME.environment,
    RAILWAY_SERVICE_ID: BLOG_IMPORT_RUNTIME.service,
  };
  objects = new Map();
  deps = {
    hashPlan: planHash,
    hashFiles: fileHash,
    keyForFile: key,
    prefix: BLOG_IMPORT_RUNTIME.prefix,
    freezeGuard: vi.fn(),
    createLedger: createApplyLedger,
    loadActor: vi.fn(async () => ({ id: "admin-one", role: "admin", isSuspended: false }) as User),
    storage: {
      bucketName: "fixture-bucket",
      read: vi.fn(async (physical) => objects.get(physical) || null),
      createOnly: vi.fn(async (physical, object) => {
        objects.set(physical, object);
        return "created" as const;
      }),
    },
    importArticles: vi.fn(async (_plan, _actor, files, storage, hash) => {
      for (const file of files)
        await storage.createOnly(key(file), { body: file.data, contentType: file.mime });
      return { planSha256: hash, replay: false, articles: [] };
    }),
  };
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});
async function rewrite() {
  await writeFile(path.join(root, "plan.json"), JSON.stringify(artifact));
}
it("requires separately approved actor-bound hash rather than trusting altered outer hash", async () => {
  artifact.actorId = "other-admin";
  artifact.expectedPlanSha256 = planHash(artifact.plan, artifact.actorId);
  await rewrite();
  await expect(runStaticBlogApply(args, env, deps)).rejects.toThrow("incomplete");
  expect(deps.importArticles).not.toHaveBeenCalled();
  expect(deps.storage.createOnly).not.toHaveBeenCalled();
});
it.each([
  "runtime",
  "bucket",
  "prefix",
  "frozen",
  "editor",
  "suspended",
  "missing-actor",
  "wrong-bytes",
  "traversal",
  "symlink",
  "bad-manifest",
])("rejects %s before writes", async (failure) => {
  if (failure === "runtime") env.RAILWAY_SERVICE_ID = "other";
  if (failure === "bucket") args[8] = "other-bucket";
  if (failure === "prefix") deps.prefix = "wrong";
  if (failure === "frozen") env.UPLOAD_MUTATIONS_FROZEN = "true";
  if (failure === "editor")
    deps.loadActor = vi.fn(
      async () => ({ id: "admin-one", role: "editor", isSuspended: false }) as User,
    );
  if (failure === "suspended")
    deps.loadActor = vi.fn(
      async () => ({ id: "admin-one", role: "admin", isSuspended: true }) as User,
    );
  if (failure === "missing-actor") deps.loadActor = vi.fn(async () => undefined);
  if (failure === "wrong-bytes") await writeFile(path.join(root, "image0.png"), "changed");
  if (failure === "traversal") {
    artifact.files[0].relativePath = "../outside.png";
    await rewrite();
  }
  if (failure === "symlink") {
    await symlink(path.join(root, "image0.png"), path.join(root, "linked.png"));
    artifact.files[0].relativePath = "linked.png";
    await rewrite();
  }
  if (failure === "bad-manifest") {
    artifact.files[0].width = 1;
    await rewrite();
  }
  await expect(runStaticBlogApply(args, env, deps)).rejects.toThrow("incomplete");
  expect(deps.importArticles).not.toHaveBeenCalled();
  expect(deps.storage.createOnly).not.toHaveBeenCalled();
});
it("qualifies physical prefix while importer keys remain logical and verifies all20 before completion", async () => {
  await runStaticBlogApply(args, env, deps);
  expect(objects.size).toBe(20);
  for (const file of artifact.files)
    expect(objects.has(`${BLOG_IMPORT_RUNTIME.prefix}/${key(file)}`)).toBe(true);
  expect(deps.storage.read).toHaveBeenCalledTimes(20);
  const ledger = await readFile(args[10], "utf8");
  expect(ledger.match(/object-verified/g)).toHaveLength(20);
  expect(ledger).toContain('"complete":true');
  expect((await stat(args[10])).mode & 0o777).toBe(0o600);
  await expect(runStaticBlogApply(args, env, deps)).rejects.toThrow("incomplete");
  expect(deps.importArticles).toHaveBeenCalledTimes(1);
});
it("marks uncertain provider write without leaking error details", async () => {
  deps.storage.createOnly = vi.fn(async () => {
    throw Error("SECRET_PROVIDER_DETAIL");
  });
  await expect(runStaticBlogApply(args, env, deps)).rejects.toThrow("incomplete");
  const ledger = await readFile(args[10], "utf8");
  expect(ledger).toContain('"possibleObjectWrite":true');
  expect(ledger).not.toContain("SECRET");
  expect(ledger).not.toContain('"complete":true');
});
it("does not call a receipt-only replay complete when an object is missing", async () => {
  deps.importArticles = vi.fn(async () => ({ planSha256: args[4], replay: true, articles: [] }));
  await expect(runStaticBlogApply(args, env, deps)).rejects.toThrow("incomplete");
  expect(deps.storage.createOnly).not.toHaveBeenCalled();
  expect(await readFile(args[10], "utf8")).toContain('"possibleDatabaseWrite":true');
});
it("rechecks freeze before provider dispatch", async () => {
  deps.importArticles = vi.fn(async (_p, _u, files, storage) => {
    env.UPLOAD_MUTATIONS_FROZEN = "true";
    await storage.createOnly(key(files[0]), { body: files[0].data });
    throw Error("unreachable");
  });
  await expect(runStaticBlogApply(args, env, deps)).rejects.toThrow("incomplete");
  expect(deps.storage.createOnly).not.toHaveBeenCalled();
});
it.each(["append", "close"])(
  "retains safe recovery flags when ledger %s fails",
  async (failure) => {
    const actual = deps.createLedger;
    deps.createLedger = async (filename) => {
      const ledger = await actual(filename);
      return {
        ...ledger,
        append: async (record) => {
          if (failure === "append" && record.event === "object-write-result")
            throw Error("PRIVATE_LEDGER_ERROR");
          await ledger.append(record);
        },
        close: async () => {
          await ledger.close();
          if (failure === "close") throw Error("PRIVATE_CLOSE_ERROR");
        },
      };
    };
    await expect(runStaticBlogApply(args, env, deps)).rejects.toMatchObject({
      code: "BLOG_APPLY_INCOMPLETE",
      recoveryRequired: true,
      possibleObjectWrite: true,
      possibleDatabaseWrite: true,
    });
  },
);
it("rejects a revoked administrator at final dispatch admission", async () => {
  const load = deps.loadActor;
  let calls = 0;
  deps.loadActor = async (id) => {
    calls++;
    return calls === 1 ? load(id) : undefined;
  };
  await expect(runStaticBlogApply(args, env, deps)).rejects.toMatchObject({
    code: "BLOG_APPLY_INCOMPLETE",
    possibleObjectWrite: false,
    possibleDatabaseWrite: false,
  });
  expect(deps.importArticles).not.toHaveBeenCalled();
});
