import { estimateInquirySchema } from "../../shared/commercial-intake-contract";
import { p1EstimateSchema } from "./p1-estimate";

/** Snapshot only validated estimate fields; no fabricated commercial context. */
export function estimateInquirySnapshot(data: unknown) {
  const input = p1EstimateSchema.parse(data);
  return estimateInquirySchema.parse({
    inquiryType: "general",
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    company: input.company || null,
    address: input.address,
    acreage: input.acreage || null,
    propertyType: input.propertyType || null,
    services: input.services,
    message: input.message,
    attribution: input.attribution || {},
  });
}
