import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const EXCLUDED_P1_API_PATHS = [
  "/api/ecommerce",
  "/api/admin/ecommerce/orders",
  "/api/membership",
  "/api/membership-tiers",
  "/api/directory",
  "/api/directory-settings",
  "/api/therapists",
  "/api/stripe",
  "/api/portfolio",
  "/api/applications",
  "/api/reference",
  "/api/specializations",
  "/api/contact-professional",
];

describe("P1 excluded Core modules", () => {
  it.each(EXCLUDED_P1_API_PATHS)("keeps %s in the API exclusion boundary", (path) => {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    const segment = path.replace("/api/", "").replace("/admin/", "").split("/")[0];

    expect(source).toContain(segment);
  });
});
