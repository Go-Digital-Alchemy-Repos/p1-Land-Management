import { describe, expect, it } from "vitest";
import {
  buildCorePlatformAdminUrl,
  buildPublicSiteUrl,
  getEffectivePublicSiteOrigin,
  getCorePlatformAdminOrigin,
  getPublicSiteOrigin,
} from "./client-stack-origins";

describe("client stack origins", () => {
  it("uses separate canonical public and admin origins", () => {
    const env = {
      APP_URL: "https://dashboard.example.com",
      PUBLIC_SITE_ORIGIN: "https://www.example.com",
      CORE_PLATFORM_ADMIN_ORIGIN: "https://dashboard.example.com",
    } as NodeJS.ProcessEnv;

    expect(getPublicSiteOrigin(env)).toBe("https://www.example.com");
    expect(getCorePlatformAdminOrigin(env)).toBe("https://dashboard.example.com");
    expect(buildPublicSiteUrl("/orders/status?token=abc", env)).toBe(
      "https://www.example.com/orders/status?token=abc",
    );
    expect(buildCorePlatformAdminUrl("/admin/ecommerce/orders", env)).toBe(
      "https://dashboard.example.com/admin/ecommerce/orders",
    );
  });

  it("falls back to a canonical legacy APP_URL and rejects unsafe overrides", () => {
    const env = {
      APP_URL: "https://legacy.example.com",
      PUBLIC_SITE_ORIGIN: "https://user:secret@public.example.com",
      CORE_PLATFORM_ADMIN_ORIGIN: "https://admin.example.com/path",
    } as NodeJS.ProcessEnv;

    expect(getPublicSiteOrigin(env)).toBe("https://legacy.example.com");
    expect(getCorePlatformAdminOrigin(env)).toBe("https://legacy.example.com");
  });

  it("uses the configured public origin before persisted SEO settings", () => {
    const env = {
      APP_URL: "https://dashboard.example.com",
      PUBLIC_SITE_ORIGIN: "https://preview.example.com",
    } as NodeJS.ProcessEnv;

    expect(getEffectivePublicSiteOrigin("https://previous-client.example.com", env)).toBe(
      "https://preview.example.com",
    );
    expect(getEffectivePublicSiteOrigin("https://previous-client.example.com", {})).toBe(
      "https://previous-client.example.com",
    );
  });
});
