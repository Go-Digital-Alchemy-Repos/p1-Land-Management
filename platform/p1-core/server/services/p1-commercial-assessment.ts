import { z } from "zod";

export const COMMERCIAL_PROJECT_STAGES = [
  "development_construction",
  "turnover_establishment",
  "long_term_operations",
  "unknown",
] as const;
export const COMMERCIAL_SERVICE_TIMINGS = ["immediate", "recurring", "both"] as const;
const optionalText = (max: number) => z.string().trim().max(max).default("");
const email = z
  .string()
  .trim()
  .max(254)
  .refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "Enter a valid email address",
  )
  .default("");
const phone = z
  .string()
  .trim()
  .max(50)
  .refine(
    (value) =>
      !value || (/^\+?[0-9() .-]+$/.test(value) && /^[0-9]{7,15}$/.test(value.replace(/\D/g, ""))),
    "Enter a usable phone number",
  )
  .default("");

// Public intake is text-only. Unknown keys (including upload references) are rejected.
export const p1CommercialAssessmentSchema = z
  .object({
    inquiryType: z.literal("commercial_site_assessment"),
    name: z.string().trim().min(1).max(150),
    company: z.string().trim().min(1).max(300),
    email,
    phone,
    title: optionalText(150),
    propertyName: optionalText(300),
    address: z.string().trim().min(1).max(500),
    propertyType: optionalText(150),
    acreage: optionalText(100),
    services: z.array(z.string().trim().min(1).max(100)).min(1).max(12),
    projectStage: z.enum(COMMERCIAL_PROJECT_STAGES),
    serviceTiming: z.enum(COMMERCIAL_SERVICE_TIMINGS),
    message: optionalText(5000),
    attribution: z
      .record(z.string().max(2048))
      .refine(
        (value) =>
          Object.keys(value).length <= 12 &&
          Object.keys(value).every((key) => /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)),
      )
      .optional(),
    website: z.literal("").optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.email && !value.phone)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Provide an email address or phone number",
      });
  });
