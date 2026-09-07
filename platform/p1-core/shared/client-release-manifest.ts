import { z } from "zod";
import { getDashboardOriginPolicyError } from "./client-origin-policy";

export const CLIENT_RELEASE_MANIFEST_SCHEMA_VERSION = "3.0" as const;
const RELEASE_GATE_IDS = [
  "identity",
  "topology",
  "database",
  "backup",
  "restore",
  "health",
  "security",
  "monitoring",
  "content",
  "transactions",
  "import",
] as const;

const stackId = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, "must be lowercase kebab-case");
const sha = z.string().regex(/^[0-9a-f]{40}$/, "must be a full lowercase Git commit SHA");
const evidenceReference = z.string().min(1).max(500);

const httpsOrigin = z.string().superRefine((value, context) => {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      value.endsWith("/")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "must be a credential-free HTTPS origin with no path, query, hash, or trailing slash",
      });
    }
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "must be a valid HTTPS origin" });
  }
});

const gateSchema = z
  .object({
    id: z.enum(RELEASE_GATE_IDS),
    required: z.boolean(),
    status: z.enum(["pending", "passed", "not-required"]),
    evidenceReference: evidenceReference.optional(),
  })
  .strict()
  .superRefine((gate, context) => {
    if (gate.required && gate.status === "not-required") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "required gates must be pending or passed",
      });
    }
    if (!gate.required && gate.status !== "not-required") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "non-required gates must be marked not-required",
      });
    }
    if (gate.status === "passed" && !gate.evidenceReference) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceReference"],
        message: "passed gates require an evidence reference",
      });
    }
  });

const approvalSchema = z
  .object({
    role: z.enum(["business", "technical", "operations"]),
    reference: evidenceReference,
  })
  .strict();

const clientReleaseManifestBaseSchema = z
  .object({
    schemaVersion: z.literal(CLIENT_RELEASE_MANIFEST_SCHEMA_VERSION),
    status: z.enum(["draft", "approved"]),
    clientStackId: stackId,
    candidate: z
      .object({
        coreRevision: sha,
        siteRevision: sha,
      })
      .strict(),
    origins: z
      .object({
        publicSite: httpsOrigin,
        admin: httpsOrigin,
      })
      .strict(),
    backup: z.union([
      z.object({ status: z.literal("pending") }).strict(),
      z
        .object({
          status: z.literal("verified"),
          objectKey: z.string().min(1).max(500),
          createdAt: z.string().datetime({ offset: true }),
          manifestStackId: stackId,
          identity: z.enum(["exact-match", "legacy-explicit"]),
          restoreDrill: z.enum(["pending", "passed"]),
          evidenceReference,
        })
        .strict(),
    ]),
    gates: z.array(gateSchema).min(1),
    approvals: z.array(approvalSchema),
  })
  .strict();

export const clientReleaseManifestSchema = clientReleaseManifestBaseSchema.superRefine(
  (manifest, context) => {
    if (manifest.origins.publicSite === manifest.origins.admin) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["origins", "admin"],
        message: "must differ from publicSite",
      });
    }
    const dashboardOriginError = getDashboardOriginPolicyError(
      manifest.origins.publicSite,
      manifest.origins.admin,
    );
    if (dashboardOriginError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["origins", "admin"],
        message: dashboardOriginError,
      });
    }

    const duplicateGate = manifest.gates.find(
      (gate, index) => manifest.gates.findIndex((candidate) => candidate.id === gate.id) !== index,
    );
    if (duplicateGate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gates"],
        message: `contains duplicate ${duplicateGate.id} gate`,
      });
    }

    for (const gateId of RELEASE_GATE_IDS) {
      if (!manifest.gates.some((gate) => gate.id === gateId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gates"],
          message: `must include the ${gateId} gate`,
        });
      }
    }

    const duplicateApproval = manifest.approvals.find(
      (approval, index) =>
        manifest.approvals.findIndex((candidate) => candidate.role === approval.role) !== index,
    );
    if (duplicateApproval) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approvals"],
        message: `contains duplicate ${duplicateApproval.role} approval`,
      });
    }

    if (manifest.status !== "approved") return;

    if (manifest.backup.status !== "verified") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["backup"],
        message: "approved releases require verified backup provenance",
      });
    } else {
      if (manifest.backup.manifestStackId !== manifest.clientStackId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["backup", "manifestStackId"],
          message: "must match clientStackId",
        });
      }
      if (manifest.backup.restoreDrill !== "passed") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["backup", "restoreDrill"],
          message: "approved releases require a passed restore drill",
        });
      }
      if (manifest.backup.identity !== "exact-match") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["backup", "identity"],
          message: "approved releases require exact-match backup provenance",
        });
      }
    }

    for (const gate of manifest.gates) {
      if (gate.required && gate.status !== "passed") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gates"],
          message: `required ${gate.id} gate must pass before approval`,
        });
      }
    }

    for (const role of ["business", "technical", "operations"] as const) {
      if (!manifest.approvals.some((approval) => approval.role === role)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["approvals"],
          message: `approved releases require a ${role} approval`,
        });
      }
    }
  },
);

export type ClientReleaseManifest = z.infer<typeof clientReleaseManifestSchema>;

export const CLIENT_RELEASE_APPROVAL_ROLES = ["business", "technical", "operations"] as const;

export type ClientReleaseReadiness = {
  ready: boolean;
  pendingRequiredGates: string[];
  missingApprovalRoles: string[];
  backupStatus: "pending" | "verified";
  blockers: string[];
};

export function evaluateClientReleaseReadiness(
  manifest: ClientReleaseManifest,
): ClientReleaseReadiness {
  const pendingRequiredGates = manifest.gates
    .filter((gate) => gate.required && gate.status !== "passed")
    .map((gate) => gate.id);
  const missingApprovalRoles = CLIENT_RELEASE_APPROVAL_ROLES.filter(
    (role) => !manifest.approvals.some((approval) => approval.role === role),
  );
  const blockers = [
    ...(manifest.status === "approved" ? [] : ["manifest-status-draft"]),
    ...(manifest.backup.status === "verified" ? [] : ["backup-provenance-pending"]),
    ...pendingRequiredGates.map((gate) => `required-gate-${gate}-pending`),
    ...missingApprovalRoles.map((role) => `approval-${role}-missing`),
  ];

  return {
    ready: blockers.length === 0,
    pendingRequiredGates,
    missingApprovalRoles,
    backupStatus: manifest.backup.status,
    blockers,
  };
}

export function validateClientReleaseManifest(input: unknown) {
  const result = clientReleaseManifestSchema.safeParse(input);
  if (result.success) return { success: true as const, data: result.data };

  return {
    success: false as const,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "$",
      code: issue.code,
      message: issue.message,
    })),
  };
}
