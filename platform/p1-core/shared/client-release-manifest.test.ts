import { describe, expect, it } from "vitest";
import {
  evaluateClientReleaseReadiness,
  validateClientReleaseManifest,
} from "./client-release-manifest";

const sha = "a".repeat(40);
const release = {
  schemaVersion: "3.0",
  status: "draft",
  clientStackId: "better-farms-foundation",
  candidate: { coreRevision: sha, siteRevision: sha },
  origins: {
    publicSite: "https://better-farms.example",
    admin: "https://dashboard.better-farms.example",
  },
  backup: { status: "pending" },
  gates: [
    { id: "identity", required: true, status: "passed", evidenceReference: "intake-review" },
    { id: "topology", required: true, status: "passed", evidenceReference: "topology-review" },
    { id: "database", required: true, status: "pending" },
    { id: "backup", required: true, status: "pending" },
    { id: "restore", required: true, status: "pending" },
    { id: "health", required: true, status: "pending" },
    { id: "security", required: true, status: "pending" },
    { id: "monitoring", required: true, status: "pending" },
    { id: "content", required: true, status: "pending" },
    { id: "transactions", required: false, status: "not-required" },
    { id: "import", required: true, status: "pending" },
  ],
  approvals: [],
};

describe("client release manifest", () => {
  it("accepts a transparent draft with pending required gates", () => {
    expect(validateClientReleaseManifest(release)).toMatchObject({ success: true });
  });

  it("lists every missing release requirement for a valid draft", () => {
    const parsed = validateClientReleaseManifest(release);
    if (!parsed.success) throw new Error("release fixture must be valid");

    expect(evaluateClientReleaseReadiness(parsed.data)).toEqual({
      ready: false,
      pendingRequiredGates: [
        "database",
        "backup",
        "restore",
        "health",
        "security",
        "monitoring",
        "content",
        "import",
      ],
      missingApprovalRoles: ["business", "technical", "operations"],
      backupStatus: "pending",
      blockers: [
        "manifest-status-draft",
        "backup-provenance-pending",
        "required-gate-database-pending",
        "required-gate-backup-pending",
        "required-gate-restore-pending",
        "required-gate-health-pending",
        "required-gate-security-pending",
        "required-gate-monitoring-pending",
        "required-gate-content-pending",
        "required-gate-import-pending",
        "approval-business-missing",
        "approval-technical-missing",
        "approval-operations-missing",
      ],
    });
  });

  it("rejects a shared public and admin origin", () => {
    expect(
      validateClientReleaseManifest({
        ...release,
        origins: { ...release.origins, admin: release.origins.publicSite },
      }),
    ).toMatchObject({ success: false, errors: expect.arrayContaining([expect.any(Object)]) });
  });

  it("requires the dashboard hostname to match the public-site domain", () => {
    expect(
      validateClientReleaseManifest({
        ...release,
        origins: { ...release.origins, admin: "https://admin.better-farms.example" },
      }),
    ).toMatchObject({ success: false, errors: expect.arrayContaining([expect.any(Object)]) });
  });

  it("requires every standard gate to be recorded", () => {
    expect(
      validateClientReleaseManifest({
        ...release,
        gates: release.gates.filter((gate) => gate.id !== "import"),
      }),
    ).toMatchObject({ success: false, errors: expect.arrayContaining([expect.any(Object)]) });
  });

  it("requires an explicit content gate", () => {
    expect(
      validateClientReleaseManifest({
        ...release,
        gates: release.gates.filter((gate) => gate.id !== "content"),
      }),
    ).toMatchObject({ success: false, errors: expect.arrayContaining([expect.any(Object)]) });
  });

  it("fails closed on the pre-content release-manifest schema", () => {
    expect(validateClientReleaseManifest({ ...release, schemaVersion: "2.0" })).toMatchObject({
      success: false,
      errors: expect.arrayContaining([expect.any(Object)]),
    });
  });

  it("requires verified provenance, passed gates, and three approvals for approval", () => {
    expect(validateClientReleaseManifest({ ...release, status: "approved" })).toMatchObject({
      success: false,
      errors: expect.arrayContaining([expect.any(Object)]),
    });

    const approved = validateClientReleaseManifest({
      ...release,
      status: "approved",
      backup: {
        status: "verified",
        objectKey: "db/2026-09-04-manual.json.gz",
        createdAt: "2026-09-04T00:00:00.000Z",
        manifestStackId: "better-farms-foundation",
        identity: "exact-match",
        restoreDrill: "passed",
        evidenceReference: "duplicate-restore-drill",
      },
      gates: release.gates.map((gate) =>
        gate.required
          ? { ...gate, status: "passed", evidenceReference: gate.evidenceReference ?? "evidence" }
          : gate,
      ),
      approvals: [
        { role: "business", reference: "business-approval" },
        { role: "technical", reference: "technical-approval" },
        { role: "operations", reference: "operations-approval" },
      ],
    });
    expect(approved).toMatchObject({ success: true });
    if (!approved.success) throw new Error("approved fixture must be valid");
    expect(evaluateClientReleaseReadiness(approved.data)).toEqual({
      ready: true,
      pendingRequiredGates: [],
      missingApprovalRoles: [],
      backupStatus: "verified",
      blockers: [],
    });
  });
});
