import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ClientSiteContent } from "@shared/schema";
import { loadClientSiteManifest } from "../services/client-site-manifest.service";
import {
  parseComponentContent,
  publishedContentEtag,
  serializeAdminContent,
} from "../services/client-site-content.service";
import { planDraftSave, planPublish } from "../services/client-site-content-workflow";

const fixturePath = fileURLToPath(
  new URL("../../docs/pilots/better-farms/client-site-manifest.example.json", import.meta.url),
);

describe("client site runtime content", () => {
  it("generates the initial editor from validated manifest defaults", async () => {
    const manifest = await loadClientSiteManifest(fixturePath, "1.0.0");
    const editor = serializeAdminContent(manifest, "fund-a-farm", "fund-a-farm-page");
    expect(editor.draftRevision).toBe(0);
    expect(editor.component.fields.map((field) => field.path)).toContain("cta.target");
    expect(editor.draftContent.heading).toBe("Fund a Farm Today");
  });

  it("rejects unknown, incomplete, and unsafe content", async () => {
    const manifest = await loadClientSiteManifest(fixturePath, "1.0.0");
    const defaults = serializeAdminContent(
      manifest,
      "fund-a-farm",
      "fund-a-farm-page",
    ).draftContent;
    expect(() =>
      parseComponentContent(manifest, "fund-a-farm", "fund-a-farm-page", {
        ...defaults,
        behavior: "override",
      }),
    ).toThrow("not editable");
    expect(() =>
      parseComponentContent(manifest, "fund-a-farm", "fund-a-farm-page", {
        ...defaults,
        behavior: {},
      }),
    ).toThrow("not editable");
    expect(() =>
      parseComponentContent(manifest, "fund-a-farm", "fund-a-farm-page", {
        ...defaults,
        heading: "",
      }),
    ).toThrow("required");
    expect(() =>
      parseComponentContent(manifest, "fund-a-farm", "fund-a-farm-page", {
        ...defaults,
        cta: { label: "Donate", target: "javascript:alert(1)" },
      }),
    ).toThrow("credential-free HTTPS");
  });

  it("publishes a stable snapshot and restores history as a new draft revision", () => {
    const draft = { heading: "Approved" };
    expect(planDraftSave(null, 0)).toEqual({ nextRevision: 1 });
    expect(planPublish({ draftContent: draft, draftRevision: 1 }, 1)).toEqual({
      nextRevision: 2,
      publishedContent: draft,
    });
    expect(planDraftSave(2, 2)).toEqual({ nextRevision: 3 });
    expect(() => planDraftSave(3, 2)).toThrow("Draft revision changed");
  });

  it("builds a content-sensitive quoted ETag", () => {
    const base = {
      stackId: "better-farms-foundation",
      routeId: "fund-a-farm",
      componentKey: "fund-a-farm-page",
      publishedRevision: 2,
      publishedContent: { heading: "One" },
    } as ClientSiteContent;
    expect(publishedContentEtag(base)).toMatch(/^"[A-Za-z0-9_-]+"$/);
    expect(publishedContentEtag({ ...base, publishedContent: { heading: "Two" } })).not.toBe(
      publishedContentEtag(base),
    );
  });
});
