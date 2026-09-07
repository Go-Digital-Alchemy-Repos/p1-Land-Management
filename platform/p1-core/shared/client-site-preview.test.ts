import { describe, expect, it } from "vitest";
import {
  clientSitePreviewMessageSchema,
  clientSitePreviewReadySchema,
} from "./client-site-preview";

const validMessage = {
  type: "core-platform:client-site-preview",
  protocolVersion: "1.0",
  clientStackId: "better-farms-foundation",
  routeId: "fund-a-farm",
  componentKey: "fund-a-farm-page",
  revision: 1,
  content: { heading: "Fund a Farm Today" },
};

describe("client site preview protocol", () => {
  it("accepts a versioned bounded preview message", () => {
    expect(clientSitePreviewMessageSchema.parse(validMessage)).toEqual(validMessage);
  });

  it("rejects unknown versions and transport behavior", () => {
    expect(
      clientSitePreviewMessageSchema.safeParse({
        ...validMessage,
        protocolVersion: "2.0",
        script: "alert(1)",
      }).success,
    ).toBe(false);
  });

  it("validates the iframe readiness handshake", () => {
    expect(
      clientSitePreviewReadySchema.parse({
        type: "core-platform:client-site-preview-ready",
        protocolVersion: "1.0",
        clientStackId: "better-farms-foundation",
        routeId: "fund-a-farm",
        componentKey: "fund-a-farm-page",
      }),
    ).toMatchObject({ type: "core-platform:client-site-preview-ready" });
  });
});
