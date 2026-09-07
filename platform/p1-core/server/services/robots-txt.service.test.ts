import { describe, expect, it } from "vitest";
import type { SeoSettings } from "@shared/schema";
import { buildDefaultRobotsTxt } from "./robots-txt.service";

describe("robots.txt", () => {
  it("uses the configured public origin over persisted SEO data", () => {
    const original = process.env.PUBLIC_SITE_ORIGIN;
    process.env.PUBLIC_SITE_ORIGIN = "https://temporary-client.up.railway.app";
    try {
      expect(
        buildDefaultRobotsTxt({ siteUrl: "https://previous-client.example.com" } as SeoSettings),
      ).toContain("Sitemap: https://temporary-client.up.railway.app/sitemap.xml");
    } finally {
      if (original === undefined) delete process.env.PUBLIC_SITE_ORIGIN;
      else process.env.PUBLIC_SITE_ORIGIN = original;
    }
  });
});
