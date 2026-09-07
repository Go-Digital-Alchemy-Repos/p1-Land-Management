import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadClientSiteManifest } from "../services/client-site-manifest.service";
import { buildClientSitePreviewMessage } from "../services/client-site-preview.service";

const fixturePath = fileURLToPath(
  new URL("../../docs/pilots/better-farms/client-site-manifest.example.json", import.meta.url),
);

describe("client site preview bridge", () => {
  it("builds a bounded message from manifest-declared route and component metadata", async () => {
    const manifest = await loadClientSiteManifest(fixturePath, "1.0.0");
    const message = buildClientSitePreviewMessage(manifest, {
      routeId: "fund-a-farm",
      componentKey: "fund-a-farm-page",
      revision: 3,
      content: { heading: "Preview heading" },
    });

    expect(message).toMatchObject({
      protocolVersion: "1.0",
      clientStackId: "better-farms-foundation",
      routeId: "fund-a-farm",
      componentKey: "fund-a-farm-page",
      revision: 3,
    });
  });

  it("rejects undeclared routes and components", async () => {
    const manifest = await loadClientSiteManifest(fixturePath, "1.0.0");
    expect(() =>
      buildClientSitePreviewMessage(manifest, {
        routeId: "home",
        componentKey: "fund-a-farm-page",
        revision: 1,
        content: {},
      }),
    ).toThrow("not allowed");
    expect(() =>
      buildClientSitePreviewMessage(manifest, {
        routeId: "fund-a-farm",
        componentKey: "arbitrary-jsx",
        revision: 1,
        content: {},
      }),
    ).toThrow("not declared");
  });
});
