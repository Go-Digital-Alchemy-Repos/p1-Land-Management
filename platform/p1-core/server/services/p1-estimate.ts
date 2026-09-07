import { z } from "zod";

const short = z.string().trim().max(300).default("");
export const p1EstimateSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    email: z.string().trim().email().max(254),
    phone: short,
    company: short,
    address: z.string().trim().min(1).max(500),
    acreage: short,
    propertyType: short,
    services: z.array(z.string().trim().min(1).max(100)).max(12).default([]),
    message: z.string().trim().min(1).max(5000),
    attribution: z
      .record(z.string().max(2048))
      .refine((value) => Object.keys(value).length <= 12)
      .optional(),
    website: z.literal("").optional(),
  })
  .strict();
