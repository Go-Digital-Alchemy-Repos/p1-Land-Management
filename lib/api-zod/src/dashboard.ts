import { z } from "zod";
export const fieldEventSchema = z
  .object({
    id: z.string().uuid(),
    workOrderId: z.string().uuid(),
    baseVersion: z.number().int().positive(),
    kind: z.enum(["note", "issue", "time", "checklist", "complete"]),
    payload: z
      .object({
        text: z.string().max(10000).optional(),
        action: z.enum(["start", "stop", "break", "travel"]).optional(),
        items: z
          .array(
            z.object({
              label: z.string().min(1).max(10000),
              done: z.boolean(),
            }),
          )
          .max(100)
          .optional(),
      })
      .strict(),
    capturedAt: z.string().datetime(),
  })
  .superRefine((event, ctx) => {
    if (["note", "issue"].includes(event.kind) && !event.payload.text?.trim())
      ctx.addIssue({
        code: "custom",
        path: ["payload", "text"],
        message: "A note is required",
      });
    if (event.kind === "time" && !event.payload.action)
      ctx.addIssue({
        code: "custom",
        path: ["payload", "action"],
        message: "A time action is required",
      });
    if (event.kind === "checklist" && !event.payload.items)
      ctx.addIssue({
        code: "custom",
        path: ["payload", "items"],
        message: "Checklist items are required",
      });
  });
export type FieldOperation = z.infer<typeof fieldEventSchema>;

export const projectPhasePrerequisiteSchema = z.object({
  label: z.string().trim().min(1).max(500),
  done: z.boolean(),
});
export const projectPhaseDetailsSchema = z.object({
  title: z.string().trim().min(1).max(500),
  scope: z.string().trim().max(10000).default(""),
  plannedStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  plannedEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  prerequisites: z.array(projectPhasePrerequisiteSchema).max(100).default([]),
});
export const projectPhaseTransitionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  status: z.enum(["planned", "ready", "in_progress", "manager_review", "accepted", "blocked", "cancelled", "archived"]),
  reason: z.string().trim().min(1).max(10000),
  overrideReason: z.string().trim().min(1).max(10000).optional(),
});
export const projectPhasePublicationSchema = z.object({
  expectedVersion: z.number().int().positive(),
  summary: z.string().trim().min(1).max(10000),
});
export const projectPhaseBillingIntentSchema = z.object({
  operationId: z.string().uuid(),
  expectedPhaseVersion: z.number().int().positive(),
  estimateId: z.string().uuid(),
  title: z.string().trim().min(1).max(10000),
  amountCents: z.number().int().positive().max(1e10),
  kind: z.enum(["deposit", "progress", "final"]),
});
