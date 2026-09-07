import { describe, expect, it } from "vitest";
import { getBlockDef, normalizeBlockType } from "@/features/admin/cms/builder/block-registry";
import { createFallbackBlockDef } from "@/features/admin/cms/builder/block-editor";

describe("block registry compatibility helpers", () => {
  it("normalizes known legacy block aliases to current block types", () => {
    expect(normalizeBlockType("call-to-action")).toBe("cta");
    expect(normalizeBlockType("blog-feed")).toBe("blog-post-feed");
    expect(getBlockDef("call-to-action")?.type).toBe("cta");
    expect(getBlockDef("blog-feed")?.type).toBe("blog-post-feed");
  });

  it("creates a compatibility editor definition from primitive block props", () => {
    const fallbackDef = createFallbackBlockDef("legacy-cta", {
      heading: "Join us",
      primaryLink: "/join",
      enableHoverMotion: true,
      limit: 5,
    });

    expect(fallbackDef.label).toContain("Compatibility Mode");
    expect(fallbackDef.propDefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "heading", type: "text" }),
        expect.objectContaining({ key: "primaryLink", type: "url" }),
        expect.objectContaining({ key: "enableHoverMotion", type: "boolean" }),
        expect.objectContaining({ key: "limit", type: "number" }),
      ]),
    );
  });
});
