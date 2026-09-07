// Versioned wire contract; mirrored verbatim in dashboard/commercial-intake-contract.ts.
import { z } from "zod";
export const COMMERCIAL_INGRESS_PATH = "/api/integrations/core/v1/commercial-inquiries";
const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable();
export const commercialInquirySchema = z
  .object({
    inquiryType: z.literal("commercial_site_assessment"),
    name: z.string().trim().min(1).max(150),
    company: z.string().trim().min(1).max(300),
    email: z.string().trim().email().max(254).nullable(),
    phone: nullableText(50).refine(
      (value) =>
        value === null ||
        (/^\+?[0-9() .-]+$/.test(value) && /^[0-9]{7,15}$/.test(value.replace(/\D/g, ""))),
    ),
    title: nullableText(150),
    propertyName: nullableText(300),
    address: z.string().trim().min(1).max(500),
    propertyType: nullableText(150),
    acreage: nullableText(100),
    services: z.array(z.string().trim().min(1).max(100)).min(1).max(12),
    projectStage: z.enum([
      "development_construction",
      "turnover_establishment",
      "long_term_operations",
      "unknown",
    ]),
    serviceTiming: z.enum(["immediate", "recurring", "both"]),
    message: nullableText(5000),
    attribution: z
      .record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/), z.string().max(2048))
      .refine((value) => Object.keys(value).length <= 12),
  })
  .strict()
  .refine((value) => Boolean(value.email || value.phone), "Contact channel required");
export const commercialIntakeEventSchema = z
  .object({
    eventType: z.literal("p1.commercial_inquiry.accepted"),
    schemaVersion: z.literal(1),
    eventId: z.string().uuid(),
    source: z.literal("p1-core"),
    sourceInstanceId: z.string().uuid(),
    submissionId: z.string().uuid(),
    acceptedAt: z.string().datetime(),
    formSlug: z.literal("p1-commercial-assessment"),
    inquiry: commercialInquirySchema,
  })
  .strict();
export const commercialIntakeResultSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: z.string().uuid(),
    submissionId: z.string().uuid(),
    leadId: z.string().uuid(),
    receivedAt: z.string().datetime(),
    duplicate: z.boolean(),
  })
  .strict();
export type CommercialInquiry = z.infer<typeof commercialInquirySchema>;
export type CommercialIntakeEvent = z.infer<typeof commercialIntakeEventSchema>;
export type CommercialIntakeResult = z.infer<typeof commercialIntakeResultSchema>;
export function commercialSignatureInput(keyId: string, sentAt: string, bodySha256: string) {
  return ["POST", COMMERCIAL_INGRESS_PATH, keyId, sentAt, bodySha256].join("\n");
}
