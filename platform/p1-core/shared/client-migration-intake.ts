import { z } from "zod";

export const CLIENT_MIGRATION_INTAKE_SCHEMA_VERSION = "1.0" as const;

const identifier = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, "must be lowercase kebab-case");
const decisionStatus = z.enum(["pending", "approved"]);

const clientMigrationIntakeSchemaBase = z
  .object({
    schemaVersion: z.literal(CLIENT_MIGRATION_INTAKE_SCHEMA_VERSION),
    status: z.enum(["draft", "approved"]),
    client: z
      .object({
        stackId: identifier,
        displayName: z.string().trim().min(1),
      })
      .strict(),
    sourceAccess: z
      .object({
        system: z.enum(["woocommerce", "wordpress", "other", "none"]),
        ownerReference: z.string().trim().min(1),
        accessMode: z.enum(["pending", "protected-export", "read-only-api", "not-applicable"]),
        reference: z.string().trim().min(1),
        credentialsStored: z.literal(false),
      })
      .strict(),
    pilotScope: z
      .object({
        routeIds: z.array(identifier).min(1),
        excludedCapabilities: z.array(z.string().trim().min(1)).min(1),
        successMeasures: z.array(z.string().trim().min(1)).min(1),
        status: decisionStatus,
      })
      .strict(),
    dataMigration: z
      .object({
        entities: z
          .array(
            z
              .object({
                id: z.enum(["categories", "products", "customers", "orders", "media", "other"]),
                disposition: z.enum(["included", "excluded", "decision-required"]),
                rationale: z.string().trim().min(1),
              })
              .strict(),
          )
          .min(1),
        historyPolicy: z.enum(["none", "catalog-only", "approved-history", "decision-required"]),
        reconciliationOwner: z.string().trim().min(1),
        status: decisionStatus,
      })
      .strict(),
    operations: z
      .object({
        dnsOperator: z.string().trim().min(1),
        releaseOwner: z.string().trim().min(1),
        recovery: z
          .object({
            status: decisionStatus,
            rpoMinutes: z.number().int().positive().nullable(),
            rtoMinutes: z.number().int().positive().nullable(),
          })
          .strict(),
        release: z
          .object({
            status: z.enum(["blocked", "ready", "approved"]),
            approverRoles: z.array(z.enum(["business", "technical", "operations"])).min(1),
            blockers: z.array(z.string().trim().min(1)),
          })
          .strict(),
      })
      .strict(),
  })
  .strict()
  .superRefine((intake, context) => {
    addDuplicateIssues(intake.pilotScope.routeIds, ["pilotScope", "routeIds"], "route ID", context);
    addDuplicateIssues(
      intake.dataMigration.entities.map((entity) => entity.id),
      ["dataMigration", "entities"],
      "entity",
      context,
    );
    addDuplicateIssues(
      intake.operations.release.approverRoles,
      ["operations", "release", "approverRoles"],
      "approver role",
      context,
    );

    if (intake.status !== "approved") return;
    if (intake.sourceAccess.accessMode === "pending") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceAccess", "accessMode"],
        message: "must define protected source access before approval",
      });
    }
    if (intake.pilotScope.status !== "approved") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pilotScope", "status"],
        message: "must be approved before the intake is approved",
      });
    }
    if (
      intake.dataMigration.status !== "approved" ||
      intake.dataMigration.historyPolicy === "decision-required" ||
      intake.dataMigration.entities.some((entity) => entity.disposition === "decision-required")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dataMigration"],
        message: "must resolve entity dispositions and history policy before approval",
      });
    }
    if (
      intake.operations.recovery.status !== "approved" ||
      !intake.operations.recovery.rpoMinutes ||
      !intake.operations.recovery.rtoMinutes
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["operations", "recovery"],
        message: "must define approved RPO and RTO before approval",
      });
    }
    if (intake.operations.release.status !== "approved") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["operations", "release", "status"],
        message: "must be approved before the intake is approved",
      });
    }
    for (const requiredRole of ["business", "technical", "operations"] as const) {
      if (!intake.operations.release.approverRoles.includes(requiredRole)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["operations", "release", "approverRoles"],
          message: `must include the ${requiredRole} approver role before approval`,
        });
      }
    }
    if (intake.operations.release.blockers.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["operations", "release", "blockers"],
        message: "must be empty before approval",
      });
    }
  });

function addDuplicateIssues(
  values: string[],
  path: (string | number)[],
  label: string,
  context: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, index],
        message: `duplicate ${label}: ${value}`,
      });
    }
    seen.add(value);
  });
}

export type ClientMigrationIntake = z.infer<typeof clientMigrationIntakeSchemaBase>;
export type ClientMigrationIntakeError = { path: string; code: string; message: string };
export type ClientMigrationIntakeValidation =
  | { success: true; data: ClientMigrationIntake; errors: [] }
  | { success: false; errors: ClientMigrationIntakeError[] };

export const clientMigrationIntakeSchema = clientMigrationIntakeSchemaBase;

export function validateClientMigrationIntake(input: unknown): ClientMigrationIntakeValidation {
  const parsed = clientMigrationIntakeSchema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data, errors: [] };
  return {
    success: false,
    errors: parsed.error.issues.map((issue) => ({
      path: issue.path.length ? issue.path.join(".") : "$",
      code: issue.code,
      message: issue.message,
    })),
  };
}
