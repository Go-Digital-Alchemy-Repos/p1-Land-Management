import { createHash, createCipheriv } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildLegacyUploadMigrationPlan } from "./legacy-upload-migration-plan";
import {
  createLegacyUploadSourceVerifier,
  readLegacyUploadR2Configuration,
} from "./legacy-upload-source-verification";
import { runLegacyUploadDryRun } from "../scripts/verify-legacy-upload-migration";

function fixture() {
  const env = {
    RAILWAY_PROJECT_ID: "project",
    RAILWAY_ENVIRONMENT_ID: "environment",
    RAILWAY_SERVICE_ID: "service",
    RAILWAY_DEPLOYMENT_ID: "deployment",
    RAILWAY_GIT_COMMIT_SHA: "a".repeat(40),
    DATABASE_URL: "postgresql://synthetic:synthetic@db.railway.internal/core",
  };
  const identity = {
    railwayProjectId: "project",
    railwayEnvironmentId: "environment",
    railwayServiceId: "service",
    deploymentId: "deployment",
    gitCommitSha: "a".repeat(40),
    databaseIdentityReference:
      "sha256:" + createHash("sha256").update("project|db.railway.internal|core").digest("hex"),
  };
  const body = Buffer.from("synthetic");
  const hash = createHash("sha256").update(body).digest("hex");
  const plan = buildLegacyUploadMigrationPlan({
    stackId: "core-platform",
    bucketName: "core-media",
    sourcePrefix: "",
    destinationPrefix: "clients/core-platform/uploads",
    entries: [{ sourceKey: "cms/image.webp", sha256: hash, byteLength: body.length }],
    ownership: {
      scope: "exact-object",
      reference: "independent-review-1",
      stackId: "core-platform",
      sourcePrefix: "",
      sourceIdentity: identity,
      record: {
        table: "cms_media",
        id: "media-1",
        r2Key: "cms/image.webp",
        sha256: hash,
        byteLength: body.length,
      },
    },
  });
  const approval = {
    schemaVersion: 1,
    planId: plan.planId,
    ownershipReference: "independent-review-1",
    sourceIdentity: identity,
    target: {
      stackId: plan.stackId,
      bucketName: plan.bucketName,
      uploadPrefix: plan.destinationPrefix,
    },
  };
  const row = { id: "media-1", r2_key: "cms/image.webp", file_size: body.length };
  const database = {
    query: vi.fn(async (query: string) => ({
      rows: query.includes("current_database") ? [{ name: "core" }] : [row],
    })),
  };
  const storage = {
    bucketName: plan.bucketName,
    read: vi.fn(async (key: string) => (key === row.r2_key ? { body } : null)),
    createOnly: vi.fn(async () => "created" as const),
  };
  return { env, plan, approval, database, storage, row };
}
describe("independent legacy source verification", () => {
  it("verifies runtime/database/record, dry-runs exact reads and never creates objects", async () => {
    const f = fixture();
    const verifier = createLegacyUploadSourceVerifier(f);
    const evidence = await runLegacyUploadDryRun(verifier, f.storage);
    expect(evidence).toMatchObject({
      complete: true,
      mode: "dry-run",
      writesPerformed: false,
      statuses: ["would-copy"],
    });
    expect(f.storage.createOnly).not.toHaveBeenCalled();
    expect(f.storage.read.mock.calls.map(([key]) => key)).toEqual([
      "cms/image.webp",
      "clients/core-platform/uploads/cms/image.webp",
    ]);
    expect(
      f.database.query.mock.calls.filter(([query]) => query.includes("FROM cms_media")),
    ).toHaveLength(3);
    expect(JSON.stringify(evidence)).not.toContain("cms/image.webp");
  });
  it.each([
    "RAILWAY_PROJECT_ID",
    "RAILWAY_ENVIRONMENT_ID",
    "RAILWAY_SERVICE_ID",
    "RAILWAY_DEPLOYMENT_ID",
    "RAILWAY_GIT_COMMIT_SHA",
  ])("rejects mismatched %s before database/storage", (field) => {
    const f = fixture();
    expect(() =>
      createLegacyUploadSourceVerifier({ ...f, env: { ...f.env, [field]: "wrong" } }),
    ).toThrow();
    expect(f.database.query).not.toHaveBeenCalled();
    expect(f.storage.read).not.toHaveBeenCalled();
  });
  it("rejects wrong current database before record or storage reads", async () => {
    const f = fixture();
    f.database.query.mockResolvedValueOnce({ rows: [{ name: "other-db" }] });
    await expect(
      runLegacyUploadDryRun(createLegacyUploadSourceVerifier(f), f.storage),
    ).rejects.toThrow();
    expect(f.database.query).toHaveBeenCalledOnce();
    expect(f.storage.read).not.toHaveBeenCalled();
  });
  it.each([
    [],
    [{ id: "media-1", r2_key: "changed", file_size: 9 }],
    [{ id: "media-1", r2_key: "cms/image.webp", file_size: 10 }],
  ])("rejects absent/stale rows before storage %#", async (rows) => {
    const f = fixture();
    f.database.query.mockImplementation(async (query) => ({
      rows: query.includes("current_database") ? [{ name: "core" }] : rows,
    }));
    await expect(
      runLegacyUploadDryRun(createLegacyUploadSourceVerifier(f), f.storage),
    ).rejects.toThrow();
    expect(f.storage.read).not.toHaveBeenCalled();
  });
  it("rejects a record changing after object inspection", async () => {
    const f = fixture();
    let reads = 0;
    f.database.query.mockImplementation(async (query) => ({
      rows: query.includes("current_database") ? [{ name: "core" }] : ++reads < 3 ? [f.row] : [],
    }));
    await expect(
      runLegacyUploadDryRun(createLegacyUploadSourceVerifier(f), f.storage),
    ).rejects.toThrow();
    expect(f.storage.createOnly).not.toHaveBeenCalled();
  });
  it("requires exact independent approval and forbids connection fields", () => {
    const f = fixture();
    for (const change of [
      { planId: "wrong" },
      { ownershipReference: "wrong" },
      { databaseUrl: "forbidden" },
    ])
      expect(() =>
        createLegacyUploadSourceVerifier({ ...f, approval: { ...f.approval, ...change } }),
      ).toThrow();
    expect(f.database.query).not.toHaveBeenCalled();
  });
  it("rejects runtime host overrides", () => {
    const f = fixture();
    expect(() =>
      createLegacyUploadSourceVerifier({
        ...f,
        env: { ...f.env, DATABASE_URL: f.env.DATABASE_URL + "?host=other" },
      }),
    ).toThrow();
  });
  it("decrypts supplied runtime settings with no plaintext fallback and validates bucket", async () => {
    const secret = "synthetic-session-only";
    const iv = Buffer.alloc(16, 1);
    const cipher = createCipheriv("aes-256-cbc", createHash("sha256").update(secret).digest(), iv);
    const encrypted =
      iv.toString("hex") +
      ":" +
      cipher.update("synthetic-key", "utf8", "hex") +
      cipher.final("hex");
    const database = {
      query: vi.fn(async () => ({
        rows: [
          { key: "r2_account_id", value: "a".repeat(32), is_secret: false },
          { key: "r2_access_key_id", value: "synthetic-access", is_secret: false },
          { key: "r2_secret_access_key", value: encrypted, is_secret: true },
          { key: "r2_bucket_name", value: "core-media", is_secret: false },
        ],
      })),
    };
    expect(
      (await readLegacyUploadR2Configuration(database, secret, "core-media")).secretAccessKey,
    ).toBe("synthetic-key");
    await expect(
      readLegacyUploadR2Configuration(database, undefined, "core-media"),
    ).rejects.toThrow();
    await expect(
      readLegacyUploadR2Configuration(database, "wrong-secret", "core-media"),
    ).rejects.toThrow();
    await expect(readLegacyUploadR2Configuration(database, secret, "different")).rejects.toThrow();
    expect(database.query.mock.calls[0][0]).toContain("SELECT");
  });
});
