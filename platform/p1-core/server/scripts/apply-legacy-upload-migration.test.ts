import { createHash } from "node:crypto";
import { mkdtemp, readFile, stat, symlink, link, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { describe, expect, it, vi } from "vitest";
import { buildLegacyUploadMigrationPlan } from "../services/legacy-upload-migration-plan";
import { createLegacyUploadSourceVerifier } from "../services/legacy-upload-source-verification";
import { main, runLegacyUploadApply } from "./apply-legacy-upload-migration";
import {
  createApplyLedger,
  readApplyInput,
  validateApplyInputs,
} from "./legacy-upload-apply-support";

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
    createOnly: vi.fn(async (_key: string, _object: { body: Buffer }) => "created" as const),
  };
  const drain = {
    schemaVersion: 1 as const,
    id: "drain-1",
    planId: plan.planId,
    sourceIdentity: identity,
    target: approval.target,
    operatorReference: "approved-operator-reference",
    attestedAt: "2026-09-05T12:00:00Z",
    statement: "writers-drained-and-frozen" as const,
  };
  const applyApproval = {
    schemaVersion: 1,
    action: "copy-exact-object",
    sourceApproval: approval,
    writerDrainAttestationId: drain.id,
  };
  const objects = new Map([[row.r2_key, { body }]]);
  storage.read.mockImplementation(async (key) => objects.get(key) ?? null);
  storage.createOnly.mockImplementation(async (...args: unknown[]) => {
    const [key, object] = args as [string, { body: Buffer }];
    objects.set(key, object);
    return "created";
  });
  return { env, plan, approval, database, storage, row, drain, applyApproval, objects };
}

function runFixture(f = fixture()) {
  const records: Record<string, unknown>[] = [];
  const ledger = {
    append: vi.fn(async (record: Record<string, unknown>) => {
      records.push(record);
    }),
    close: vi.fn(async () => {}),
  };
  return {
    f,
    records,
    ledger,
    options: {
      verifier: createLegacyUploadSourceVerifier(f),
      storage: f.storage,
      ledger,
      drain: f.drain,
      assertRuntime: vi.fn(),
    },
  };
}
describe("exact-object apply preparation", () => {
  it("requires distinct explicit apply authorization bound to plan/source/target/drain", () => {
    const f = fixture();
    expect(validateApplyInputs(f.plan, f.applyApproval, f.drain).plan.planId).toBe(f.plan.planId);
    expect(() => validateApplyInputs(f.plan, f.approval, f.drain)).toThrow();
    for (const drain of [
      { ...f.drain, id: "other" },
      { ...f.drain, planId: "other" },
      { ...f.drain, sourceIdentity: { ...f.drain.sourceIdentity, deploymentId: "other" } },
      { ...f.drain, target: { ...f.drain.target, bucketName: "other" } },
    ])
      expect(() => validateApplyInputs(f.plan, f.applyApproval, drain)).toThrow();
  });
  it("persists header and intent before create; resume rechecks objects and never recopies", async () => {
    const r = runFixture();
    r.f.storage.createOnly.mockImplementation(async (key, object) => {
      expect(r.records.map((entry) => entry.event)).toEqual([
        "apply-start",
        "copy-dispatch-intent",
      ]);
      r.f.objects.set(key, object);
      return "created";
    });
    expect((await runLegacyUploadApply(r.options)).complete).toBe(true);
    expect(r.records.map((entry) => entry.event)).toEqual([
      "apply-start",
      "copy-dispatch-intent",
      "object-result",
      "apply-finished",
    ]);
    const resumed = runFixture(r.f);
    await runLegacyUploadApply(resumed.options);
    expect(resumed.records[0]).toMatchObject({ event: "apply-start" });
    expect(resumed.records.some((record) => record.event === "copy-dispatch-intent")).toBe(false);
    expect(r.f.storage.createOnly).toHaveBeenCalledOnce();
    r.f.objects.get(r.f.plan.entries[0].destinationKey)!.body = Buffer.from("changed");
    expect((await runLegacyUploadApply(r.options)).complete).toBe(false);
    expect(r.f.storage.createOnly).toHaveBeenCalledOnce();
  });
  it.each(["apply-start", "copy-dispatch-intent"])(
    "ledger failure at %s blocks object creation",
    async (failure) => {
      const r = runFixture();
      r.ledger.append.mockImplementation(async (record) => {
        if (record.event === failure) throw new Error("fsync failed");
      });
      await expect(runLegacyUploadApply(r.options)).rejects.toThrow("Apply did not complete");
      expect(r.f.storage.createOnly).not.toHaveBeenCalled();
    },
  );
  it("preserves ambiguous remote copies and records uncertainty, then verifies a retry", async () => {
    const r = runFixture();
    r.f.storage.createOnly.mockImplementation(async (key, object) => {
      r.f.objects.set(key, object);
      throw new Error("secret provider credentials");
    });
    await expect(runLegacyUploadApply(r.options)).rejects.toThrow("Apply did not complete");
    expect(r.records.at(-1)).toMatchObject({ event: "apply-failed", possibleRemoteWrite: true });
    expect(JSON.stringify(r.records)).not.toContain("secret provider credentials");
    expect((await runLegacyUploadApply(r.options)).complete).toBe(true);
    expect(r.f.storage.createOnly).toHaveBeenCalledOnce();
  });
  it("refuses changed runtime or authoritative record before dispatch", async () => {
    const r = runFixture();
    r.options.assertRuntime.mockImplementation(() => {
      throw new Error("freeze removed");
    });
    await expect(runLegacyUploadApply(r.options)).rejects.toThrow();
    expect(r.f.storage.read).not.toHaveBeenCalled();
    expect(r.f.storage.createOnly).not.toHaveBeenCalled();
  });
  it("rechecks freeze after the durable dispatch intent before PUT", async () => {
    const r = runFixture();
    let frozen = true;
    r.options.assertRuntime.mockImplementation(() => {
      if (!frozen) throw new Error("freeze removed");
    });
    r.ledger.append.mockImplementation(async (record) => {
      r.records.push(record);
      if (record.event === "copy-dispatch-intent") frozen = false;
    });
    await expect(runLegacyUploadApply(r.options)).rejects.toThrow();
    expect(r.f.storage.createOnly).not.toHaveBeenCalled();
    expect(r.records.at(-1)).toMatchObject({ possibleRemoteWrite: false });
  });
  it("rejects an authoritative source change after reading source bytes", async () => {
    const r = runFixture();
    r.f.storage.read.mockImplementation(async (key) => {
      r.f.row.r2_key = "cms/replaced.webp";
      return r.f.objects.get(key) ?? null;
    });
    await expect(runLegacyUploadApply(r.options)).rejects.toThrow();
    expect(r.f.storage.createOnly).not.toHaveBeenCalled();
  });
  it("rejects hard-linked inputs before constructing a database pool", async () => {
    const directory = await mkdtemp(join(tmpdir(), "apply-independent-test-"));
    const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const pool = vi.spyOn(pg, "Pool");
    try {
      const path = join(directory, "plan");
      await writeFile(path, JSON.stringify(fixture().plan), { mode: 0o600 });
      await link(path, join(directory, "approval"));
      await writeFile(join(directory, "drain"), "{}", { mode: 0o600 });
      expect(
        await main(
          [
            "--apply",
            "--plan",
            path,
            "--approval",
            join(directory, "approval"),
            "--writer-drain",
            join(directory, "drain"),
            "--ledger",
            join(directory, "ledger"),
          ],
          {
            UPLOAD_MUTATIONS_FROZEN: "true",
            DATABASE_URL: "postgresql://synthetic:synthetic@localhost/core",
          },
        ),
      ).toBe(1);
      expect(pool).not.toHaveBeenCalled();
    } finally {
      output.mockRestore();
      pool.mockRestore();
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("creates owned0600 ledger with durable readable lines and refuses existing files/symlinks", async () => {
    const directory = await mkdtemp(join(tmpdir(), "apply-ledger-test-"));
    try {
      const path = join(directory, "ledger.jsonl");
      const ledger = await createApplyLedger(path);
      try {
        await ledger.append({ event: "header" });
        await ledger.append({ event: "result" });
      } finally {
        await ledger.close();
      }
      expect((await stat(path)).mode & 0o777).toBe(0o600);
      expect(
        (await readFile(path, "utf8"))
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line).event),
      ).toEqual(["header", "result"]);
      await expect(createApplyLedger(path)).rejects.toThrow();
      await symlink(path, join(directory, "link"));
      await expect(createApplyLedger(join(directory, "link"))).rejects.toThrow();
      expect((await readFile(path, "utf8")).includes("header")).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("bounds owned input reading and refuses symlinks/unsafe modes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "apply-input-test-"));
    try {
      const path = join(directory, "input");
      await writeFile(path, "{}", { mode: 0o600 });
      expect((await readApplyInput(path)).value).toEqual({});
      await symlink(path, join(directory, "link"));
      await expect(readApplyInput(join(directory, "link"))).rejects.toThrow();
      await chmod(path, 0o644);
      await expect(readApplyInput(path)).rejects.toThrow();
      await chmod(path, 0o600);
      await writeFile(path, " ".repeat(65537));
      await expect(readApplyInput(path)).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("rejects missing apply/freeze and databaseoptions before connecting with sanitized output", async () => {
    const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const pool = vi.spyOn(pg, "Pool");
    try {
      expect(await main([], {})).toBe(1);
      const args = [
        "--apply",
        "--plan",
        "secret",
        "--approval",
        "secret2",
        "--writer-drain",
        "secret3",
        "--ledger",
        "secret4",
      ];
      expect(await main(args, {})).toBe(1);
      expect(
        await main(args, {
          UPLOAD_MUTATIONS_FROZEN: "true",
          DATABASE_URL: "postgresql://user:secret@localhost/db?options=bad",
        }),
      ).toBe(1);
      expect(
        await main(args, {
          UPLOAD_MUTATIONS_FROZEN: "true",
          DATABASE_URL: "postgresql://user:secret@localhost/db?statement_timeout=0&query_timeout=0",
        }),
      ).toBe(1);
      expect(pool).not.toHaveBeenCalled();
      expect(JSON.stringify(output.mock.calls)).not.toContain("secret");
    } finally {
      output.mockRestore();
      pool.mockRestore();
    }
  });
});
