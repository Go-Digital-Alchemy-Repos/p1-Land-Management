import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildLegacyUploadMigrationPlan } from "./legacy-upload-migration-plan";
import { executeLegacyUploadMigration, type LegacyUploadStorage } from "./legacy-upload-migration";

function fixture() {
  const body = Buffer.from("legacy image bytes");
  const hash = createHash("sha256").update(body).digest("hex");
  const plan = buildLegacyUploadMigrationPlan({
    stackId: "core-test",
    bucketName: "synthetic-media",
    sourcePrefix: "",
    destinationPrefix: "clients/core-test/uploads",
    ownership: {
      reference: "approved dedicated bucket evidence",
      scope: "dedicated-stack-bucket",
      stackId: "core-test",
      sourcePrefix: "",
    },
    entries: ["cms/a.jpg", "cms/b.jpg"].map((sourceKey) => ({
      sourceKey,
      sha256: hash,
      byteLength: body.length,
      etag: "original",
    })),
  });
  const objects = new Map(
    plan.entries.map((e) => [
      e.sourceKey,
      { body: Buffer.from(body), etag: "original", contentType: "image/jpeg" },
    ]),
  );
  const storage: LegacyUploadStorage = {
    bucketName: plan.bucketName,
    read: vi.fn(async (key) => {
      const o = objects.get(key);
      return o ? { ...o, body: Buffer.from(o.body) } : null;
    }),
    createOnly: vi.fn(async (key, object) => {
      if (objects.has(key)) return "already-exists";
      objects.set(key, {
        ...object,
        body: Buffer.from(object.body),
        etag: "copied",
        contentType: object.contentType ?? "application/octet-stream",
      });
      return "created";
    }),
  };
  const options = {
    plan,
    storage,
    target: {
      stackId: plan.stackId,
      bucketName: plan.bucketName,
      uploadPrefix: plan.destinationPrefix,
    },
    verifyOwnership: vi.fn(async () => {}),
    record: vi.fn(async () => {}),
  };
  return { options, objects, plan, storage };
}
describe("legacy upload migration execution", () => {
  it("defaults to read-only planning and requires independent ownership verification", async () => {
    const { options, storage } = fixture();
    const result = await executeLegacyUploadMigration(options);
    expect(result.mode).toBe("dry-run");
    expect(result.results.map((r) => r.status)).toEqual(["would-copy", "would-copy"]);
    expect(options.verifyOwnership).toHaveBeenCalledOnce();
    expect(storage.createOnly).not.toHaveBeenCalled();
  });
  it("rejects apply without exact approval, wrong active target, and wrong adapter before storage access", async () => {
    for (const variant of ["approval", "target", "adapter"]) {
      const { options, storage } = fixture();
      if (variant === "target") options.target.stackId = "other";
      if (variant === "adapter") options.storage = { ...storage, bucketName: "other-bucket" };
      await expect(
        executeLegacyUploadMigration({
          ...options,
          apply: true,
          approvedPlanId: variant === "approval" ? "wrong" : options.plan.planId,
        }),
      ).rejects.toThrow();
      expect(storage.read).not.toHaveBeenCalled();
      expect(options.verifyOwnership).not.toHaveBeenCalled();
    }
  });
  it("rejects failed ownership proof before object access", async () => {
    const { options, storage } = fixture();
    options.verifyOwnership.mockRejectedValue(new Error("ownership not established"));
    await expect(executeLegacyUploadMigration(options)).rejects.toThrow(
      "ownership not established",
    );
    expect(storage.read).not.toHaveBeenCalled();
  });
  it("copies verified bytes without removing originals and revalidates on resume", async () => {
    const { options, plan, objects, storage } = fixture();
    const apply = { ...options, apply: true, approvedPlanId: plan.planId };
    expect((await executeLegacyUploadMigration(apply)).results.map((r) => r.status)).toEqual([
      "verified",
      "verified",
    ]);
    expect(objects.size).toBe(4);
    expect(objects.get(plan.entries[0].destinationKey)?.contentType).toBe("image/jpeg");
    expect((await executeLegacyUploadMigration(apply)).complete).toBe(true);
    expect(storage.createOnly).toHaveBeenCalledTimes(2);
    objects.get(plan.entries[0].destinationKey)!.body = Buffer.from("corrupted");
    const result = await executeLegacyUploadMigration(apply);
    expect(result.complete).toBe(false);
    expect(result.results[0].status).toBe("destination-conflict");
    expect(storage.createOnly).toHaveBeenCalledTimes(2);
  });
  it("detects source changes even when an existing destination matches", async () => {
    const { options, plan, objects, storage } = fixture();
    objects.set(plan.entries[0].destinationKey, { ...objects.get(plan.entries[0].sourceKey)! });
    objects.get(plan.entries[0].sourceKey)!.etag = "replacement";
    const result = await executeLegacyUploadMigration({
      ...options,
      apply: true,
      approvedPlanId: plan.planId,
    });
    expect(result.results[0].status).toBe("source-changed");
    expect(storage.createOnly).not.toHaveBeenCalled();
  });
  it("does not bless a competing destination write after the absence check", async () => {
    const { options, plan, storage, objects } = fixture();
    vi.mocked(storage.createOnly).mockImplementation(async (key) => {
      objects.set(key, {
        body: Buffer.from("someone else's object"),
        etag: "racing",
        contentType: "text/plain",
      });
      return "already-exists";
    });
    const result = await executeLegacyUploadMigration({
      ...options,
      apply: true,
      approvedPlanId: plan.planId,
    });
    expect(result.results[0].status).toBe("destination-conflict");
    expect(result.results).toHaveLength(1);
  });
  it("detects a source replacement during copy and stops before another object", async () => {
    const { options, plan, storage, objects } = fixture();
    const original = storage.createOnly;
    storage.createOnly = vi.fn(async (key, object) => {
      const result = await original(key, object);
      objects.get(plan.entries[0].sourceKey)!.body = Buffer.from("changed");
      return result;
    });
    const result = await executeLegacyUploadMigration({
      ...options,
      apply: true,
      approvedPlanId: plan.planId,
    });
    expect(result.results[0].status).toBe("source-changed");
    expect(storage.createOnly).toHaveBeenCalledTimes(1);
  });
  it("stops after a durable evidence failure; resume can verify the completed copy", async () => {
    const { options, plan, storage } = fixture();
    options.record.mockRejectedValueOnce(new Error("ledger unavailable"));
    const apply = { ...options, apply: true, approvedPlanId: plan.planId };
    await expect(executeLegacyUploadMigration(apply)).rejects.toThrow("ledger unavailable");
    expect(storage.createOnly).toHaveBeenCalledTimes(1);
    expect((await executeLegacyUploadMigration(apply)).complete).toBe(true);
    expect(storage.createOnly).toHaveBeenCalledTimes(2);
  });
});

const exactSourceIdentity = {
  railwayProjectId: "project-core",
  railwayEnvironmentId: "environment-core",
  railwayServiceId: "service-core",
  deploymentId: "deployment-core",
  gitCommitSha: "a".repeat(40),
  databaseIdentityReference: "verified/core-db",
};
function exactObjectFixture() {
  const old = fixture();
  const plan = buildLegacyUploadMigrationPlan({
    stackId: old.plan.stackId,
    bucketName: old.plan.bucketName,
    sourcePrefix: "",
    destinationPrefix: old.plan.destinationPrefix,
    entries: old.plan.entries.slice(0, 1).map(({ destinationKey: _key, ...entry }) => entry),
    ownership: {
      ...old.plan.ownership,
      scope: "exact-object",
      sourceIdentity: exactSourceIdentity,
      record: {
        table: "cms_media",
        id: "media-1",
        r2Key: old.plan.entries[0].sourceKey,
        sha256: old.plan.entries[0].sha256,
        byteLength: old.plan.entries[0].byteLength,
      },
    },
  });
  return {
    ...old,
    plan,
    options: {
      ...old.options,
      plan,
      expectedSourceIdentity: exactSourceIdentity,
      readSourceRecord: vi.fn(async () => ({
        id: "media-1",
        r2Key: plan.entries[0].sourceKey,
        byteLength: plan.entries[0].byteLength,
      })),
    },
  };
}
describe("v2 authoritative exact object execution", () => {
  it("verifies record before reads and again immediately before copy; resumes with fresh verification", async () => {
    const { options, storage, plan } = exactObjectFixture();
    const result = await executeLegacyUploadMigration({
      ...options,
      apply: true,
      approvedPlanId: plan.planId,
    });
    expect(result.results[0].status).toBe("verified");
    expect(options.readSourceRecord).toHaveBeenCalledTimes(2);
    expect(options.readSourceRecord.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(storage.read).mock.invocationCallOrder[0],
    );
    expect(options.readSourceRecord.mock.invocationCallOrder[1]).toBeLessThan(
      vi.mocked(storage.createOnly).mock.invocationCallOrder[0],
    );
    expect(options.readSourceRecord).toHaveBeenCalledWith(exactSourceIdentity, "media-1");
    const resumed = await executeLegacyUploadMigration({
      ...options,
      apply: true,
      approvedPlanId: plan.planId,
    });
    expect(resumed.results[0].status).toBe("verified");
    expect(storage.createOnly).toHaveBeenCalledOnce();
    expect(options.readSourceRecord).toHaveBeenCalledTimes(3);
  });
  it.each(Object.keys(exactSourceIdentity))(
    "rejects independent source identity mismatch %s before any reads",
    async (key) => {
      const { options, storage } = exactObjectFixture();
      await expect(
        executeLegacyUploadMigration({
          ...options,
          expectedSourceIdentity: { ...exactSourceIdentity, [key]: "wrong" },
        }),
      ).rejects.toThrow();
      expect(options.readSourceRecord).not.toHaveBeenCalled();
      expect(storage.read).not.toHaveBeenCalled();
    },
  );
  it("requires independent identity and authoritative reader even for dry run", async () => {
    const { options, storage } = exactObjectFixture();
    await expect(
      executeLegacyUploadMigration({ ...options, expectedSourceIdentity: undefined }),
    ).rejects.toThrow();
    await expect(
      executeLegacyUploadMigration({ ...options, readSourceRecord: undefined }),
    ).rejects.toThrow();
    expect(storage.read).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { id: "different", r2Key: "cms/a.jpg", byteLength: 18 },
    { id: "media-1", r2Key: "clients/other/a.jpg", byteLength: 18 },
    { id: "media-1", r2Key: "cms/a.jpg", byteLength: 19 },
  ])("rejects absent, moved or changed authoritative records %#", async (current) => {
    const { options, storage } = exactObjectFixture();
    await expect(
      executeLegacyUploadMigration({ ...options, readSourceRecord: async () => current }),
    ).rejects.toThrow();
    expect(storage.read).not.toHaveBeenCalled();
    expect(storage.createOnly).not.toHaveBeenCalled();
  });
  it("refuses a record changed between dry inspection and write", async () => {
    const { options, storage, plan } = exactObjectFixture();
    options.readSourceRecord
      .mockImplementationOnce(async () => ({
        id: "media-1",
        r2Key: plan.entries[0].sourceKey,
        byteLength: plan.entries[0].byteLength,
      }))
      .mockImplementationOnce(async () => ({
        id: "media-1",
        r2Key: "changed",
        byteLength: plan.entries[0].byteLength,
      }));
    await expect(
      executeLegacyUploadMigration({ ...options, apply: true, approvedPlanId: plan.planId }),
    ).rejects.toThrow();
    expect(storage.createOnly).not.toHaveBeenCalled();
  });
  it("keeps a differing destination intact", async () => {
    const { options, storage, plan, objects } = exactObjectFixture();
    objects.set(plan.entries[0].destinationKey, {
      body: Buffer.from("different"),
      etag: "different",
      contentType: "image/jpeg",
    });
    const result = await executeLegacyUploadMigration({
      ...options,
      apply: true,
      approvedPlanId: plan.planId,
    });
    expect(result.results[0].status).toBe("destination-conflict");
    expect(storage.createOnly).not.toHaveBeenCalled();
  });
});
