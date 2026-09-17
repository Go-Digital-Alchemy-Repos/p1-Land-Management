import { expect, it } from "vitest";
import { validWebsiteIdentityValue as valid, isWebsiteIdentityKey } from "./website-identity";
it("accepts bounded company text and safe absolute URLs while preserving write boundaries", () => {
  expect(valid("company_address", "First line\nSecond line")).toBe(true);
  expect(valid("company_name", "x".repeat(255))).toBe(true);
  expect(valid("company_name", "x".repeat(256))).toBe(false);
  expect(valid("company_phone_numbers", "555\0bad")).toBe(false);
  for (const key of ["frontend_logo_url", "favicon_url", "company_google_business_url"] as const) {
    for (const url of ["", "https://example.test/image.png", "http://example.test/logo"])
      expect(valid(key, url)).toBe(true);
    for (const url of [
      "/logo",
      "//evil.test",
      "data:image/png;base64,abc",
      "javascript:bad()",
      "https://user:secret@example.test",
      "https://example.test/\\bad",
    ])
      expect(valid(key, url)).toBe(false);
  }
  expect(isWebsiteIdentityKey("company_name")).toBe(true);
  expect(isWebsiteIdentityKey("social_icon_style")).toBe(false);
});

it("allows only rooted local CMS image paths for image settings", () => {
  expect(valid("frontend_logo_url", "/uploads/cms/branding/logo.webp")).toBe(true);
  for (const url of [
    "/uploads/cms/../private",
    "/uploads/cms/%2e%2e/private",
    "/uploads/cms//bad",
    "/uploads/cms/image.png?x=1",
  ])
    expect(valid("favicon_url", url)).toBe(false);
  expect(valid("company_google_business_url", "/uploads/cms/image.png")).toBe(false);
});
