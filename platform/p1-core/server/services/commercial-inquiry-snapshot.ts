import { commercialInquirySchema } from "../../shared/commercial-intake-contract";
import { p1CommercialAssessmentSchema } from "./p1-commercial-assessment";

// One normalization contract for live acceptance and explicit historical backfill.
export function commercialInquirySnapshot(input: unknown) {
  const data = p1CommercialAssessmentSchema.parse(input);
  const optional = (
    key: "email" | "phone" | "title" | "propertyName" | "propertyType" | "acreage" | "message",
  ) => data[key] || null;
  return commercialInquirySchema.parse({
    inquiryType: data.inquiryType,
    name: data.name,
    company: data.company,
    email: optional("email"),
    phone: optional("phone"),
    title: optional("title"),
    propertyName: optional("propertyName"),
    address: data.address,
    propertyType: optional("propertyType"),
    acreage: optional("acreage"),
    services: data.services,
    projectStage: data.projectStage,
    serviceTiming: data.serviceTiming,
    message: optional("message"),
    attribution: data.attribution || {},
  });
}
