import { createHash } from "node:crypto";
import { getClientStoragePrefix } from "../../shared/client-backup-policy";

export interface LegacyUploadSourceIdentity {
  readonly railwayProjectId: string;
  readonly railwayEnvironmentId: string;
  readonly railwayServiceId: string;
  readonly deploymentId: string;
  readonly gitCommitSha: string;
  readonly databaseIdentityReference: string;
}

export interface LegacyUploadRecordEvidence {
  readonly table: "cms_media";
  readonly id: string;
  readonly r2Key: string;
  readonly sha256: string;
  readonly byteLength: number;
}

export interface LegacyUploadSource {
  readonly sourceKey: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly versionId?: string;
  readonly etag?: string;
}

export interface LegacyUploadMigrationInput {
  readonly stackId: string;
  readonly publicSiteOrigin?: string;
  readonly bucketName: string;
  readonly ownership: {
    readonly reference: string;
    readonly scope: "dedicated-stack-bucket" | "stack-prefix" | "exact-object";
    readonly sourceIdentity?: LegacyUploadSourceIdentity;
    readonly record?: LegacyUploadRecordEvidence;
    readonly stackId: string;
    readonly sourcePrefix: string;
  };
  readonly sourcePrefix: string;
  readonly destinationPrefix: string;
  readonly entries: readonly LegacyUploadSource[];
}

export interface LegacyUploadMigrationPlan extends LegacyUploadMigrationInput {
  readonly schemaVersion: 1 | 2;
  readonly mode: "dry-run";
  readonly copyOnly: true;
  readonly preserveOriginals: true;
  readonly entries: readonly (LegacyUploadSource & { readonly destinationKey: string })[];
  readonly planId: string;
}

export interface ObservedUploadIdentity {
  readonly sha256: string;
  readonly byteLength: number;
  readonly versionId?: string;
  readonly etag?: string;
}

function record(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected an object");
  }
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((key) => !allowed.includes(key))) {
    throw new Error("Unexpected field");
  }
  return result;
}

function text(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.trim() !== value ||
    Array.from(value).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  ) {
    throw new Error("Expected a nonempty canonical string");
  }
  return value;
}

function objectPath(value: unknown, allowEmpty = false): string {
  if (value === "" && allowEmpty) return "";
  const path = text(value);
  if (
    path.includes("\\") ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("Unsafe object path");
  }
  return path;
}

function identity(value: unknown): ObservedUploadIdentity {
  const item = record(value, ["sha256", "byteLength", "versionId", "etag"]);
  const sha256 = text(item.sha256);
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Expected a lowercase SHA256 digest");
  if (!Number.isSafeInteger(item.byteLength) || (item.byteLength as number) < 0) {
    throw new Error("Expected a nonnegative safe byte length");
  }
  return {
    sha256,
    byteLength: item.byteLength as number,
    ...(item.versionId === undefined ? {} : { versionId: text(item.versionId) }),
    ...(item.etag === undefined ? {} : { etag: text(item.etag) }),
  };
}

const inputKeys = [
  "stackId",
  "publicSiteOrigin",
  "bucketName",
  "ownership",
  "sourcePrefix",
  "destinationPrefix",
  "entries",
] as const;

const sourceIdentityKeys = [
  "railwayProjectId",
  "railwayEnvironmentId",
  "railwayServiceId",
  "deploymentId",
  "gitCommitSha",
  "databaseIdentityReference",
] as const;

export function validateLegacyUploadSourceIdentity(input: unknown): LegacyUploadSourceIdentity {
  const value = record(input, sourceIdentityKeys);
  const result = Object.fromEntries(
    sourceIdentityKeys.map((key) => [key, text(value[key])]),
  ) as unknown as LegacyUploadSourceIdentity;
  if (!/^[a-f0-9]{40}$/.test(result.gitCommitSha))
    throw new Error("Expected an exact source revision");
  if (
    result.databaseIdentityReference.includes("://") ||
    /\s/.test(result.databaseIdentityReference)
  ) {
    throw new Error("Database identity must be an opaque reference, not a connection string");
  }
  return Object.freeze(result);
}

/** Validates and hashes metadata only. Ownership is an attestation, not verified access authority. */
export function buildLegacyUploadMigrationPlan(input: unknown): LegacyUploadMigrationPlan {
  const data = record(input, inputKeys);
  const stackId = text(data.stackId);
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(stackId)) throw new Error("Invalid stack ID");
  let publicSiteOrigin: string | undefined;
  if (data.publicSiteOrigin !== undefined) {
    publicSiteOrigin = text(data.publicSiteOrigin);
    const origin = new URL(publicSiteOrigin);
    if (!["https:", "http:"].includes(origin.protocol) || origin.origin !== publicSiteOrigin) {
      throw new Error("Expected an exact public HTTP(S) origin without credentials or path");
    }
  }
  const bucketName = text(data.bucketName);
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucketName))
    throw new Error("Invalid bucket name");
  const sourcePrefix = objectPath(data.sourcePrefix, true);
  const destinationPrefix = objectPath(data.destinationPrefix);
  if (destinationPrefix !== `${getClientStoragePrefix(stackId, publicSiteOrigin)}/uploads`) {
    throw new Error("Destination must match the current stack upload namespace");
  }
  const claim = record(data.ownership, [
    "reference",
    "scope",
    "stackId",
    "sourcePrefix",
    "sourceIdentity",
    "record",
  ]);
  const reference = text(claim.reference);
  if (claim.stackId !== stackId || claim.sourcePrefix !== sourcePrefix) {
    throw new Error("Ownership attestation must name this stack and exact source prefix");
  }
  if (
    claim.scope !== "dedicated-stack-bucket" &&
    claim.scope !== "stack-prefix" &&
    claim.scope !== "exact-object"
  ) {
    throw new Error("Invalid ownership scope");
  }
  if (!sourcePrefix && claim.scope !== "dedicated-stack-bucket" && claim.scope !== "exact-object") {
    throw new Error("Bucket-root sources require a dedicated same-stack bucket attestation");
  }
  if (!Array.isArray(data.entries) || data.entries.length === 0) {
    throw new Error("Explicit approved source entries are required");
  }
  let sourceIdentity: LegacyUploadSourceIdentity | undefined;
  let recordEvidence: LegacyUploadRecordEvidence | undefined;
  if (claim.scope === "exact-object") {
    if (sourcePrefix !== "" || data.entries.length !== 1)
      throw new Error("Exact-object migration requires one unprefixed legacy object");
    sourceIdentity = validateLegacyUploadSourceIdentity(claim.sourceIdentity);
    const evidence = record(claim.record, ["table", "id", "r2Key", "sha256", "byteLength"]);
    if (evidence.table !== "cms_media")
      throw new Error("Only a CMS media record can authorize exact-object migration");
    const content = identity({ sha256: evidence.sha256, byteLength: evidence.byteLength });
    recordEvidence = Object.freeze({
      table: "cms_media",
      id: text(evidence.id),
      r2Key: objectPath(evidence.r2Key),
      sha256: content.sha256,
      byteLength: content.byteLength,
    });
  } else if (claim.sourceIdentity !== undefined || claim.record !== undefined) {
    throw new Error("Record evidence requires the exact-object policy");
  }
  const sourceKeys = new Set<string>();
  const destinationKeys = new Set<string>();
  const entries = data.entries
    .map((value: unknown) => {
      const item = record(value, ["sourceKey", "sha256", "byteLength", "versionId", "etag"]);
      const sourceKey = objectPath(item.sourceKey);
      if (sourcePrefix && !sourceKey.startsWith(`${sourcePrefix}/`)) {
        throw new Error("Source is outside the exact approved prefix");
      }
      if (recordEvidence) {
        // Exact S3 keys are not decoded or case-folded. Reject reserved namespace spellings
        // conservatively as well as encoded separators that could be decoded by a later caller.
        if (
          /^(clients|system-backups)(?:\/|$)/i.test(sourceKey) ||
          /%(?:2f|5c|2e)/i.test(sourceKey)
        )
          throw new Error("Reserved or ambiguous legacy source namespace");
        if (
          recordEvidence.r2Key !== sourceKey ||
          recordEvidence.sha256 !== item.sha256 ||
          recordEvidence.byteLength !== item.byteLength
        )
          throw new Error("CMS evidence does not match the exact approved object");
      }
      const suffix = sourcePrefix ? sourceKey.slice(sourcePrefix.length + 1) : sourceKey;
      const destinationKey = `${destinationPrefix}/${suffix}`;
      if (
        sourceKey === destinationKey ||
        sourceKeys.has(sourceKey) ||
        destinationKeys.has(destinationKey)
      ) {
        throw new Error("Duplicate or unchanged object mapping");
      }
      sourceKeys.add(sourceKey);
      destinationKeys.add(destinationKey);
      return Object.freeze({
        sourceKey,
        ...identity({
          sha256: item.sha256,
          byteLength: item.byteLength,
          versionId: item.versionId,
          etag: item.etag,
        }),
        destinationKey,
      });
    })
    .sort((a, b) => (a.sourceKey < b.sourceKey ? -1 : a.sourceKey > b.sourceKey ? 1 : 0));
  // Prevent an earlier copy from replacing another approved source within the same bucket.
  if (entries.some((entry) => sourceKeys.has(entry.destinationKey))) {
    throw new Error("Destination overlaps an approved source object");
  }
  const payload = {
    schemaVersion: (claim.scope === "exact-object" ? 2 : 1) as 1 | 2,
    mode: "dry-run" as const,
    copyOnly: true as const,
    preserveOriginals: true as const,
    stackId,
    ...(publicSiteOrigin === undefined ? {} : { publicSiteOrigin }),
    bucketName,
    ownership: Object.freeze({
      reference,
      scope: claim.scope,
      stackId,
      sourcePrefix,
      ...(sourceIdentity ? { sourceIdentity, record: recordEvidence! } : {}),
    }),
    sourcePrefix,
    destinationPrefix,
    entries: Object.freeze(entries),
  };
  const planId = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return Object.freeze({ ...payload, planId });
}

/** Revalidate every serialized plan; freezing does not establish integrity or authorization. */
export function validateLegacyUploadMigrationPlan(input: unknown): LegacyUploadMigrationPlan {
  const data = record(input, [
    ...inputKeys,
    "schemaVersion",
    "mode",
    "copyOnly",
    "preserveOriginals",
    "planId",
  ]);
  if (
    (data.schemaVersion !== 1 && data.schemaVersion !== 2) ||
    data.mode !== "dry-run" ||
    data.copyOnly !== true ||
    data.preserveOriginals !== true
  ) {
    throw new Error("Unsupported migration plan policy");
  }
  if (!Array.isArray(data.entries)) throw new Error("Missing plan entries");
  const entries = data.entries.map((value: unknown) => {
    const entry = record(value, [
      "sourceKey",
      "destinationKey",
      "sha256",
      "byteLength",
      "versionId",
      "etag",
    ]);
    const { destinationKey: _destinationKey, ...source } = entry;
    return source;
  });
  const rebuilt = buildLegacyUploadMigrationPlan({
    stackId: data.stackId,
    publicSiteOrigin: data.publicSiteOrigin,
    bucketName: data.bucketName,
    ownership: data.ownership,
    sourcePrefix: data.sourcePrefix,
    destinationPrefix: data.destinationPrefix,
    entries,
  });
  if (data.schemaVersion !== rebuilt.schemaVersion)
    throw new Error("Plan version does not match ownership policy");
  if (data.planId !== rebuilt.planId) throw new Error("Plan digest mismatch");
  for (const original of data.entries) {
    const expected = rebuilt.entries.find((entry) => entry.sourceKey === original.sourceKey);
    if (!expected || original.destinationKey !== expected.destinationKey)
      throw new Error("Destination mapping mismatch");
  }
  return rebuilt;
}

/** Decision only; callers must bind observations to the exact bucket/key and close copy races. */
export function decideLegacyUploadCopy(
  input: unknown,
  sourceKey: string,
  observedSource: ObservedUploadIdentity | null,
  observedDestination: ObservedUploadIdentity | null,
): "copy" | "already-verified" | "source-changed" | "destination-conflict" {
  const plan = validateLegacyUploadMigrationPlan(input);
  const entry = plan.entries.find((candidate) => candidate.sourceKey === sourceKey);
  if (!entry) throw new Error("Source key is not approved in this plan");
  if (!observedSource) return "source-changed";
  const source = identity(observedSource);
  if (
    source.sha256 !== entry.sha256 ||
    source.byteLength !== entry.byteLength ||
    (entry.versionId !== undefined && source.versionId !== entry.versionId) ||
    (entry.etag !== undefined && source.etag !== entry.etag)
  )
    return "source-changed";
  if (!observedDestination) return "copy";
  const destination = identity(observedDestination);
  return destination.sha256 === entry.sha256 && destination.byteLength === entry.byteLength
    ? "already-verified"
    : "destination-conflict";
}
