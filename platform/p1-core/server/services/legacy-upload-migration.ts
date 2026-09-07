import { createHash } from "node:crypto";
import {
  decideLegacyUploadCopy,
  validateLegacyUploadSourceIdentity,
  type LegacyUploadSourceIdentity,
  validateLegacyUploadMigrationPlan,
  type LegacyUploadMigrationPlan,
  type ObservedUploadIdentity,
} from "./legacy-upload-migration-plan";
import type { LegacyUploadStorage, MigrationObject } from "./legacy-upload-storage";
export type { LegacyUploadStorage } from "./legacy-upload-storage";
export interface LegacyUploadResult {
  planId: string;
  sourceKey: string;
  destinationKey: string;
  status: "would-copy" | "verified" | "source-changed" | "destination-conflict";
}

function observed(object: MigrationObject | null): ObservedUploadIdentity | null {
  if (!object) return null;
  return {
    sha256: createHash("sha256").update(object.body).digest("hex"),
    byteLength: object.body.byteLength,
    ...(object.etag === undefined ? {} : { etag: object.etag }),
    ...(object.versionId === undefined ? {} : { versionId: object.versionId }),
  };
}

/** No serving-path fallback. Callers supply a bucket-bound adapter and durable evidence sink. */
export async function executeLegacyUploadMigration(options: {
  plan: unknown;
  apply?: boolean;
  approvedPlanId?: string;
  target: { stackId: string; bucketName: string; uploadPrefix: string };
  storage: LegacyUploadStorage;
  /** v2: independently supplied deployment/database binding, never derived from the plan. */
  expectedSourceIdentity?: LegacyUploadSourceIdentity;
  /** v2: query the authoritative CMS row using an independently source-bound connection. */
  readSourceRecord?: (
    identity: LegacyUploadSourceIdentity,
    recordId: string,
  ) => Promise<{ id: string; r2Key: string; byteLength: number } | null>;
  /** Must establish same-stack source ownership from evidence independent of plan assertions. */
  verifyOwnership: (plan: LegacyUploadMigrationPlan) => Promise<void>;
  /** Await a durable append before continuing. Resume always re-reads storage, not old markers. */
  record: (result: LegacyUploadResult) => Promise<void>;
}): Promise<{
  planId: string;
  mode: "dry-run" | "apply";
  complete: boolean;
  results: LegacyUploadResult[];
}> {
  const plan = validateLegacyUploadMigrationPlan(options.plan);
  if (
    plan.stackId !== options.target.stackId ||
    plan.bucketName !== options.target.bucketName ||
    plan.bucketName !== options.storage.bucketName ||
    plan.destinationPrefix !== options.target.uploadPrefix
  )
    throw new Error("Migration plan does not match the active stack storage target");
  if (options.apply && options.approvedPlanId !== plan.planId) {
    throw new Error("Apply requires the separately approved exact plan ID");
  }
  let verifySourceRecord: (() => Promise<void>) | undefined;
  if (plan.schemaVersion === 2) {
    const expected = validateLegacyUploadSourceIdentity(options.expectedSourceIdentity);
    if (JSON.stringify(expected) !== JSON.stringify(plan.ownership.sourceIdentity))
      throw new Error("Source deployment/database identity mismatch");
    if (!options.readSourceRecord) throw new Error("Authoritative CMS record reader is required");
    const readSourceRecord = options.readSourceRecord;
    const evidence = plan.ownership.record!;
    verifySourceRecord = async () => {
      const current = await readSourceRecord(expected, evidence.id);
      if (
        !current ||
        current.id !== evidence.id ||
        current.r2Key !== evidence.r2Key ||
        current.byteLength !== evidence.byteLength
      )
        throw new Error("Authoritative CMS record no longer matches approved source");
    };
  }
  await options.verifyOwnership(plan);
  await verifySourceRecord?.();
  const results: LegacyUploadResult[] = [];
  for (const entry of plan.entries) {
    const source = await options.storage.read(entry.sourceKey);
    const sourceIdentity = observed(source);
    let decision = decideLegacyUploadCopy(plan, entry.sourceKey, sourceIdentity, null);
    let status: LegacyUploadResult["status"] = "source-changed";
    if (decision !== "source-changed") {
      const destination = await options.storage.read(entry.destinationKey);
      decision = decideLegacyUploadCopy(
        plan,
        entry.sourceKey,
        sourceIdentity,
        observed(destination),
      );
      if (decision === "destination-conflict") status = "destination-conflict";
      else if (decision === "copy" && !options.apply) status = "would-copy";
      else {
        if (decision === "copy") {
          // Snapshot the verified bytes. Atomic destination preconditions belong to the adapter.
          await verifySourceRecord?.();
          await options.storage.createOnly(entry.destinationKey, {
            ...source!,
            body: Buffer.from(source!.body),
          });
        }
        // A concurrent writer may have won create-only. Never infer success from the PUT response.
        const actualDestination = await options.storage.read(entry.destinationKey);
        const currentSource = await options.storage.read(entry.sourceKey);
        const verified = decideLegacyUploadCopy(
          plan,
          entry.sourceKey,
          observed(currentSource),
          observed(actualDestination),
        );
        status =
          verified === "already-verified"
            ? "verified"
            : verified === "source-changed"
              ? "source-changed"
              : "destination-conflict";
      }
    }
    const result = {
      planId: plan.planId,
      sourceKey: entry.sourceKey,
      destinationKey: entry.destinationKey,
      status,
    };
    await options.record(result);
    results.push(result);
    if (status === "source-changed" || status === "destination-conflict") {
      return {
        planId: plan.planId,
        mode: options.apply ? "apply" : "dry-run",
        complete: false,
        results,
      };
    }
  }
  return {
    planId: plan.planId,
    mode: options.apply ? "apply" : "dry-run",
    complete: true,
    results,
  };
}
