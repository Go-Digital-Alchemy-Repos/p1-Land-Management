import { describe, expect, it } from "vitest";
import {
  buildLegacyUploadMigrationPlan as build,
  validateLegacyUploadMigrationPlan as validate,
  decideLegacyUploadCopy as decide,
} from "./legacy-upload-migration-plan";

const digest = "a".repeat(64);
const identity = { sha256: digest, byteLength: 25, etag: '"object-etag"', versionId: "v1" };
function fixture() {
  return {
    stackId: "core-stack",
    publicSiteOrigin: "https://core.example",
    bucketName: "core-media",
    ownership: {
      reference: "review/owned-bucket-1",
      scope: "dedicated-stack-bucket",
      stackId: "core-stack",
      sourcePrefix: "",
    },
    sourcePrefix: "",
    destinationPrefix: "clients/core.example/uploads",
    entries: [{ sourceKey: "cms/images/example.jpg", ...identity }],
  };
}

describe("legacy upload migration planning", () => {
  it("produces a deterministic immutable copy-only dry-run plan, independent of source order", () => {
    const input = fixture();
    input.entries.push({ sourceKey: "attachments/a.pdf", ...identity });
    const plan = build(input);
    expect(build({ ...input, entries: [...input.entries].reverse() }).planId).toBe(plan.planId);
    expect(plan.entries[1].destinationKey).toBe(
      "clients/core.example/uploads/cms/images/example.jpg",
    );
    expect(plan).toMatchObject({ mode: "dry-run", copyOnly: true, preserveOriginals: true });
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.ownership)).toBe(true);
    expect(Object.isFrozen(plan.entries)).toBe(true);
    expect(Object.isFrozen(plan.entries[0])).toBe(true);
    expect(validate(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
  });

  it("supports an explicitly attested historical domain prefix for the same stack", () => {
    const input = fixture();
    input.sourcePrefix = "clients/old.example/uploads";
    input.ownership = {
      ...input.ownership,
      scope: "stack-prefix",
      sourcePrefix: input.sourcePrefix,
    };
    input.entries[0].sourceKey = `${input.sourcePrefix}/cms/example.jpg`;
    expect(build(input).entries[0].destinationKey).toBe(
      "clients/core.example/uploads/cms/example.jpg",
    );
  });

  it("supports stack-derived destinations before domain assignment", () => {
    const { publicSiteOrigin: _origin, ...input } = fixture();
    expect(
      build({ ...input, destinationPrefix: "clients/core-stack/uploads" }).destinationPrefix,
    ).toBe("clients/core-stack/uploads");
  });

  it.each([
    { ownership: { ...fixture().ownership, scope: "stack-prefix" } },
    { ownership: { ...fixture().ownership, stackId: "another-stack" } },
    { ownership: { ...fixture().ownership, reference: "" } },
    { destinationPrefix: "clients/another.example/uploads" },
    { publicSiteOrigin: "https://core.example/" },
    { publicSiteOrigin: "https://user:pass@core.example" },
    { stackId: "" },
    { sourcePrefix: "/" },
    { entries: [] },
    { secretAccessKey: "not-allowed" },
  ])("rejects malformed or unscoped plan input %#", (change) => {
    expect(() => build({ ...fixture(), ...change })).toThrow();
  });

  it.each(["../escape", "/root", "a//b", "a/./b", "a/../b", "a\\b", "a\nkey", "a/"])(
    "rejects unsafe key %j",
    (sourceKey) => {
      expect(() => build({ ...fixture(), entries: [{ ...identity, sourceKey }] })).toThrow();
    },
  );

  it("rejects prefix lookalikes and duplicate/overlapping source mappings", () => {
    const input = fixture();
    expect(() => build({ ...input, entries: [input.entries[0], input.entries[0]] })).toThrow();
    const prefix = "clients/old/uploads";
    expect(() =>
      build({
        ...input,
        sourcePrefix: prefix,
        ownership: { ...input.ownership, sourcePrefix: prefix },
        entries: [{ ...identity, sourceKey: `${prefix}-other/a` }],
      }),
    ).toThrow();
    expect(() =>
      build({
        ...input,
        entries: [
          ...input.entries,
          { ...identity, sourceKey: `${input.destinationPrefix}/${input.entries[0].sourceKey}` },
        ],
      }),
    ).toThrow();
  });

  it.each([
    { sha256: "etag" },
    { sha256: "A".repeat(64) },
    { byteLength: -1 },
    { byteLength: Number.MAX_SAFE_INTEGER + 1 },
  ])("requires content identity %#", (change) => {
    expect(() =>
      build({ ...fixture(), entries: [{ ...fixture().entries[0], ...change }] }),
    ).toThrow();
  });

  it("rejects serialized tampering with policy, approved content, mapping or fields", () => {
    const plan = build(fixture());
    for (const change of [
      { mode: "apply" },
      { preserveOriginals: false },
      { planId: "0".repeat(64) },
      { extra: true },
    ]) {
      expect(() => validate({ ...plan, ...change })).toThrow();
    }
    expect(() =>
      validate({ ...plan, entries: [{ ...plan.entries[0], sha256: "b".repeat(64) }] }),
    ).toThrow();
    expect(() =>
      validate({ ...plan, entries: [{ ...plan.entries[0], destinationKey: "other-stack/key" }] }),
    ).toThrow();
  });

  it("copies only unchanged sources and resumes only matching destination content", () => {
    const plan = build(fixture());
    const key = plan.entries[0].sourceKey;
    expect(decide(plan, key, identity, null)).toBe("copy");
    expect(
      decide(plan, key, identity, {
        ...identity,
        etag: "different-copy-etag",
        versionId: "copy-version",
      }),
    ).toBe("already-verified");
    expect(decide(plan, key, identity, { ...identity, sha256: "b".repeat(64) })).toBe(
      "destination-conflict",
    );
    for (const changed of [
      null,
      { ...identity, versionId: "v2" },
      { ...identity, etag: "changed" },
      { ...identity, byteLength: 26 },
      { ...identity, sha256: "b".repeat(64) },
    ]) {
      expect(decide(plan, key, changed, identity)).toBe("source-changed");
    }
    expect(() => decide(plan, "not-approved", identity, null)).toThrow();
  });
});

const sourceIdentity = {
  railwayProjectId: "project-core",
  railwayEnvironmentId: "environment-core",
  railwayServiceId: "service-core",
  deploymentId: "deployment-core",
  gitCommitSha: "a".repeat(40),
  databaseIdentityReference: "verified/core-db",
};
function exactFixture() {
  const input = fixture();
  return {
    ...input,
    ownership: {
      ...input.ownership,
      scope: "exact-object",
      sourceIdentity,
      record: {
        table: "cms_media",
        id: "media-1",
        r2Key: input.entries[0].sourceKey,
        sha256: digest,
        byteLength: 25,
      },
    },
  };
}
describe("v2 exact CMS object ownership", () => {
  it("preserves the existing v1 canonical hash", () => {
    expect(
      build({
        stackId: "core-test",
        bucketName: "synthetic-media",
        sourcePrefix: "",
        destinationPrefix: "clients/core-test/uploads",
        ownership: {
          reference: "owned",
          scope: "dedicated-stack-bucket",
          stackId: "core-test",
          sourcePrefix: "",
        },
        entries: [{ sourceKey: "cms/a.jpg", sha256: "a".repeat(64), byteLength: 3 }],
      }).planId,
    ).toBe("a339b1c7569dfcfe584b9245e831346c4ac932b259080fbd86245a8bf9b5928e");
  });
  it("binds one object to immutable source/record evidence and roundtrips", () => {
    const plan = build(exactFixture());
    expect(plan.schemaVersion).toBe(2);
    expect(Object.isFrozen(plan.ownership.sourceIdentity)).toBe(true);
    expect(Object.isFrozen(plan.ownership.record)).toBe(true);
    expect(validate(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
    expect(() => validate({ ...plan, schemaVersion: 1 })).toThrow();
  });
  it.each([
    { table: "system_settings" },
    { id: "" },
    { r2Key: "cms/other.jpg" },
    { sha256: "b".repeat(64) },
    { byteLength: 26 },
    { connectionString: "forbidden" },
  ])("rejects invalid or mismatched record %#", (change) => {
    const input = exactFixture();
    expect(() =>
      build({
        ...input,
        ownership: { ...input.ownership, record: { ...input.ownership.record, ...change } },
      }),
    ).toThrow();
  });
  it.each([
    "clients/other/uploads/a",
    "Clients/other/uploads/a",
    "system-backups/db/a",
    "SYSTEM-BACKUPS/a",
    "clients",
    "cms%2fimages/a",
    "cms/%2E%2E/a",
    "cms%5cimage/a",
    "cms/../a",
    "cms//a",
  ])("rejects reserved or ambiguous key %s", (sourceKey) => {
    const input = exactFixture();
    expect(() =>
      build({
        ...input,
        entries: [{ ...input.entries[0], sourceKey }],
        ownership: { ...input.ownership, record: { ...input.ownership.record, r2Key: sourceKey } },
      }),
    ).toThrow();
  });
  it("does not lowercase ordinary S3 object keys", () => {
    const input = exactFixture();
    const sourceKey = "CMS/Images/IMAGE.jpg";
    expect(
      build({
        ...input,
        entries: [{ ...input.entries[0], sourceKey }],
        ownership: { ...input.ownership, record: { ...input.ownership.record, r2Key: sourceKey } },
      }).entries[0].sourceKey,
    ).toBe(sourceKey);
  });
  it("rejects extra keys, nonempty prefix and missing or secret-bearing identity", () => {
    const input = exactFixture();
    expect(() =>
      build({
        ...input,
        entries: [...input.entries, { ...input.entries[0], sourceKey: "cms/extra.jpg" }],
      }),
    ).toThrow();
    expect(() =>
      build({
        ...input,
        sourcePrefix: "cms",
        ownership: { ...input.ownership, sourcePrefix: "cms" },
      }),
    ).toThrow();
    for (const identity of [
      undefined,
      { ...sourceIdentity, gitCommitSha: "short" },
      { ...sourceIdentity, databaseIdentityReference: "" },
      { ...sourceIdentity, databaseIdentityReference: "postgresql://not-allowed" },
      { ...sourceIdentity, databaseUrl: "forbidden" },
    ]) {
      expect(() =>
        build({ ...input, ownership: { ...input.ownership, sourceIdentity: identity } }),
      ).toThrow();
    }
  });
});
