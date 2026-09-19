import { z } from "zod";
export const emailTemplateVersionSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const emailTemplateEditSchema = z
  .object({
    subject: z.string().min(1).max(1000).optional(),
    htmlBody: z.string().max(500000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one template field is required");
export const emailTemplateSaveSchema = z
  .object({
    template: emailTemplateEditSchema,
    expectedVersion: emailTemplateVersionSchema,
  })
  .strict();
export const emailTemplateRestoreSchema = z
  .object({ expectedVersion: emailTemplateVersionSchema })
  .strict();
