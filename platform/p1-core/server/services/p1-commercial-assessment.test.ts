import { describe, expect, it } from "vitest";
import { p1CommercialAssessmentSchema } from "./p1-commercial-assessment";
export const commercialFixture = {
  inquiryType: "commercial_site_assessment",
  name: "Pat",
  company: "Example Site",
  email: "pat@example.test",
  address: "York County",
  services: ["general_site_assessment"],
  projectStage: "unknown",
  serviceTiming: "both",
  attribution: { utm_source: "website", landingPath: "/commercial" },
};
describe("commercial assessment boundary", () => {
  it("accepts email-only and phone-only without inventing contact details", () => {
    expect(p1CommercialAssessmentSchema.parse(commercialFixture).phone).toBe("");
    const phone = p1CommercialAssessmentSchema.parse({
      ...commercialFixture,
      email: "  ",
      phone: "  (704) 555-0100  ",
      title: " ",
      propertyName: "",
      message: " ",
    });
    expect(phone).toMatchObject({
      email: "",
      phone: "(704) 555-0100",
      title: "",
      propertyName: "",
      message: "",
    });
  });
  it("retains qualification and attribution independently from a free-text message", () => {
    expect(
      p1CommercialAssessmentSchema.parse({
        ...commercialFixture,
        acreage: "10–20",
        propertyType: "industrial",
        propertyName: "Project A",
      }),
    ).toMatchObject({
      acreage: "10–20",
      propertyType: "industrial",
      propertyName: "Project A",
      attribution: commercialFixture.attribution,
    });
  });
  it.each([
    { email: "", phone: " " },
    { email: "invalid", phone: "7045550100" },
    { phone: "call me" },
    { services: [] },
    { projectStage: "made-up" },
    { serviceTiming: "emergency_dispatch" },
    { inquiryType: "other" },
    { company: " " },
    { address: " " },
    { website: "spam" },
    { attribution: { nested: { email: "private" } } },
    { attribution: Object.fromEntries(Array.from({ length: 13 }, (_, i) => ["key" + i, "x"])) },
    { message: "x".repeat(5001) },
    { attachments: ["https://public.example/plan.pdf"] },
  ])("rejects malformed/spam/unbounded intake %#", (change) => {
    expect(
      p1CommercialAssessmentSchema.safeParse({ ...commercialFixture, ...change }).success,
    ).toBe(false);
  });
});
