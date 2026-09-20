import { describe, it, expect } from "vitest";
import { estimateInquirySnapshot } from "./estimate-inquiry-snapshot";
import { websiteIntakeEventSchema } from "../../shared/commercial-intake-contract";
const input = {
  name: "Pat",
  email: "pat@example.test",
  address: "Test site",
  message: "Drainage estimate",
  website: "",
};
describe("estimate dashboard snapshot", () => {
  it("preserves an ordinary estimate without manufacturing commercial fields", () => {
    const inquiry = estimateInquirySnapshot(input);
    expect(inquiry).toMatchObject({
      inquiryType: "general",
      company: null,
      phone: null,
      services: [],
    });
    expect(inquiry).not.toHaveProperty("website");
    expect(inquiry).not.toHaveProperty("projectStage");
    const event = {
      eventType: "p1.estimate_inquiry.accepted",
      schemaVersion: 1,
      eventId: "11111111-1111-4111-8111-111111111111",
      source: "p1-core",
      sourceInstanceId: "22222222-2222-4222-8222-222222222222",
      submissionId: "33333333-3333-4333-8333-333333333333",
      acceptedAt: "2026-09-19T12:00:00.000Z",
      formSlug: "p1-estimate",
      inquiry,
    };
    expect(websiteIntakeEventSchema.safeParse(event).success).toBe(true);
    expect(
      websiteIntakeEventSchema.safeParse({ ...event, formSlug: "p1-commercial-assessment" })
        .success,
    ).toBe(false);
  });
  it("retains accepted legacy-length optional fields and attribution without accepting invalid email", () => {
    const result = estimateInquirySnapshot({
      ...input,
      phone: "x".repeat(300),
      acreage: "x".repeat(300),
      attribution: { utm_source: "test" },
    });
    expect(result.phone?.length).toBe(300);
    expect(result.attribution).toEqual({ utm_source: "test" });
    expect(() => estimateInquirySnapshot({ ...input, email: "invalid" })).toThrow();
  });
});

it("rejects oversized keys and UTF-8 payloads before a delivery can be queued", () => {
  expect(() =>
    estimateInquirySnapshot({ ...input, attribution: { ["k".repeat(70000)]: "value" } }),
  ).toThrow();
  const attribution = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => ["key" + i, "界".repeat(2048)]),
  );
  expect(() => estimateInquirySnapshot({ ...input, attribution })).toThrow("delivery capacity");
});
