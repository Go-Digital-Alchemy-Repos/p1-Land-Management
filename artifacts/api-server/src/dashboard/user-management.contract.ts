import { z } from "zod";
import { CAPABILITIES, isCapability } from "@workspace/api-zod/business-access";

const capabilities = z
  .array(z.string().refine(isCapability, "Unknown permission"))
  .max(CAPABILITIES.length)
  .refine(
    (values) => new Set(values).size === values.length,
    "Duplicate permission",
  );
const names = {
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
};
export const invitationInput = z
  .object({
    ...names,
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    role: z.enum([
      "member",
      "manager",
      "dispatch",
      "sales",
      "finance",
      "crew",
      "client",
    ]),
    clientId: z.string().uuid().optional(),
    capabilities,
    formNotificationIds: z.array(z.string().uuid()).max(200).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.role === "client" &&
      (!value.clientId ||
        value.capabilities.length ||
        value.formNotificationIds.length)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Client invitations require a client and cannot include staff permissions or form notifications",
      });
    }
    if (value.role !== "client" && value.clientId)
      ctx.addIssue({
        code: "custom",
        message: "Client grants belong to client accounts only",
      });
  });
export const accountUpdateInput = z
  .object({
    ...names,
    version: z.number().int().positive(),
    active: z.boolean(),
    capabilities,
    formNotificationIds: z.array(z.string().uuid()).max(200),
  })
  .strict();

export type AccountUpdate = z.infer<typeof accountUpdateInput>;
export type InvitationInput = z.infer<typeof invitationInput>;
