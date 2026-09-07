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
