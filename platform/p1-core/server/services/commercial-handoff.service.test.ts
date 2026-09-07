import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, createHmac } from "node:crypto";
import { commercialSignatureInput } from "../../shared/commercial-intake-contract";
const mocks = vi.hoisted(() => ({ freeze: vi.fn() }));
vi.mock("../storage", () => ({ storage: { forms: { freezeCommercialDelivery: mocks.freeze } } }));
import { deliverCommercialHandoff } from "./commercial-handoff.service";
import type { CmsFormEffectJob } from "@shared/schema";
const id = "f25d7702-9ad3-4c18-a7a1-b3f0e419b125",
  source = "8bc79bdf-70b9-47a4-8088-24f71b725765",
  receipt = "cd116e44-3d4f-49df-9cf3-a915d10db7e2";
const event = {
  eventType: "p1.commercial_inquiry.accepted",
  schemaVersion: 1,
  eventId: id,
  source: "p1-core",
  sourceInstanceId: source,
  submissionId: receipt,
  acceptedAt: "2026-09-07T00:00:00.000Z",
  formSlug: "p1-commercial-assessment",
  inquiry: {
    inquiryType: "commercial_site_assessment",
    name: "Pat",
    company: "Example",
    email: null,
    phone: "7045550100",
    title: null,
    propertyName: null,
    address: "Region",
    propertyType: null,
    acreage: null,
    services: ["general_site_assessment"],
    projectStage: "unknown",
    serviceTiming: "both",
    message: null,
    attribution: {},
  },
};
const result = {
  schemaVersion: 1,
  eventId: id,
  submissionId: receipt,
  leadId: "b04d63af-6048-4a1a-91d0-7e2f19a62f51",
  receivedAt: "2026-09-07T00:00:00.000Z",
  duplicate: false,
};
const job = { id, processingToken: "claim" } as CmsFormEffectJob;
const net = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", net);
  vi.stubEnv("COMMERCIAL_HANDOFF_KEY_ID", "test-key");
  vi.stubEnv("COMMERCIAL_HANDOFF_SECRET_HEX", "ab".repeat(32));
  vi.stubEnv("COMMERCIAL_HANDOFF_SOURCE_INSTANCE_ID", source);
  vi.stubEnv(
    "COMMERCIAL_HANDOFF_URL",
    "https://dashboard.example.test/api/integrations/core/v1/commercial-inquiries",
  );
  vi.stubEnv("COMMERCIAL_HANDOFF_ALLOWED_HOST", "dashboard.example.test");
  mocks.freeze.mockResolvedValue(JSON.stringify(event));
  net.mockResolvedValue(new Response(JSON.stringify(result), { status: 201 }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("Core commercial signed handoff", () => {
  it("signs the exact persisted bytes and validates receipt before completion", async () => {
    expect(await deliverCommercialHandoff(job)).toEqual(result);
    const request = net.mock.calls[0][1];
    expect(request.redirect).toBe("error");
    expect(request.body).toBe(JSON.stringify(event));
    const headers = request.headers;
    expect(headers["x-p1-signature"]).toBe(
      createHmac("sha256", Buffer.from("ab".repeat(32), "hex"))
        .update(
          commercialSignatureInput(
            "test-key",
            headers["x-p1-sent-at"],
            createHash("sha256").update(request.body).digest("hex"),
          ),
        )
        .digest("hex"),
    );
    expect(headers).not.toHaveProperty("cookie");
  });
  it("missing credentials leave the accepted job recoverable without network calls", async () => {
    vi.stubEnv("COMMERCIAL_HANDOFF_SECRET_HEX", "");
    await expect(deliverCommercialHandoff(job)).rejects.toThrow("commercial_handoff_unconfigured");
    expect(net).not.toHaveBeenCalled();
  });
  it.each([
    "http://dashboard.example.test/api/integrations/core/v1/commercial-inquiries",
    "https://evil.example/api/integrations/core/v1/commercial-inquiries",
    "https://dashboard.example.test/api/integrations/core/v1/commercial-inquiries?redirect=elsewhere",
  ])("rejects unsafe destination %s", async (url) => {
    vi.stubEnv("COMMERCIAL_HANDOFF_URL", url);
    await expect(deliverCommercialHandoff(job)).rejects.toThrow("commercial_destination_invalid");
    expect(net).not.toHaveBeenCalled();
  });
  it("preserves retryable and contract failures as sanitized codes", async () => {
    net.mockResolvedValueOnce(new Response("private provider detail", { status: 429 }));
    await expect(deliverCommercialHandoff(job)).rejects.toThrow("commercial_http_429");
    net.mockResolvedValueOnce(
      new Response(JSON.stringify({ ...result, submissionId: id }), { status: 200 }),
    );
    await expect(deliverCommercialHandoff(job)).rejects.toThrow("commercial_response_mismatch");
  });
});
