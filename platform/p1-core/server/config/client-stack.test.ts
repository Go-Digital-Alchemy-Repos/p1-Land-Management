import { describe, expect, it } from "vitest";
import { validateClientStackEnvironment } from "./client-stack";

function completeEnvironment(): NodeJS.ProcessEnv {
  return {
    CLIENT_STACK_ID: "pilot-acme",
    DATABASE_URL: "postgresql://app:secret@postgres.railway.internal:5432/railway",
    SESSION_SECRET: "a-unique-session-secret-that-is-long-enough",
    SETUP_TOKEN: "a-unique-setup-token-that-is-long-enough",
    APP_URL: "https://shop.example.com",
    TRUSTED_ORIGINS: "https://shop.example.com",
    STRIPE_SECRET_KEY: "sk_test_placeholder",
    STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_USER: "mailer",
    SMTP_PASS: "placeholder",
    SMTP_FROM: "Shop <orders@example.com>",
    SYSTEM_BACKUPS_ENABLED: "true",
    BACKUP_R2_ACCOUNT_ID: "account",
    BACKUP_R2_ACCESS_KEY_ID: "access",
    BACKUP_R2_SECRET_ACCESS_KEY: "secret",
    BACKUP_R2_BUCKET_NAME: "client-backups",
    BACKUP_R2_PREFIX: "clients/pilot-acme/backups",
    METRICS_ENABLED: "true",
    METRICS_BEARER_TOKEN: "a-dedicated-metrics-token-that-is-long-enough",
    CLIENT_FORM_PROXY_TOKEN: "client-form-proxy-token-placeholder",
  };
}

describe("validateClientStackEnvironment", () => {
  it("accepts an isolated ecommerce stack with all operational dependencies", () => {
    const result = validateClientStackEnvironment(completeEnvironment(), {
      ecommerce: true,
      email: true,
      backups: true,
      observability: true,
    });

    expect(result).toEqual({
      stackId: "pilot-acme",
      corePlatformOrigin: "https://shop.example.com",
      errors: [],
    });
  });

  it("rejects non-canonical origins, weak secrets, and an incorrect backup namespace", () => {
    const env = completeEnvironment();
    env.SESSION_SECRET = "short";
    env.APP_URL = "https://shop.example.com/store";
    env.TRUSTED_ORIGINS = "https://other.example.com/,https://other.example.com/";
    env.BACKUP_R2_PREFIX = "clients/other-client/backups";

    const result = validateClientStackEnvironment(env, { backups: true });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("SESSION_SECRET"),
        expect.stringContaining("APP_URL must be an origin only"),
        expect.stringContaining("TRUSTED_ORIGINS must include the exact APP_URL"),
        expect.stringContaining("duplicate origins"),
        expect.stringContaining("BACKUP_R2_PREFIX must exactly match"),
      ]),
    );
  });

  it("uses the same lowercase kebab-case stack identifier as release records", () => {
    const env = completeEnvironment();
    env.CLIENT_STACK_ID = "9-invalid-stack";

    expect(validateClientStackEnvironment(env).errors).toContain(
      "CLIENT_STACK_ID must be a lowercase kebab-case identifier",
    );
  });

  it("requires feature credentials only when their launch gates are selected", () => {
    const env = completeEnvironment();
    delete env.STRIPE_WEBHOOK_SECRET;
    delete env.SMTP_PASS;
    delete env.BACKUP_R2_BUCKET_NAME;
    delete env.METRICS_BEARER_TOKEN;
    delete env.CLIENT_FORM_PROXY_TOKEN;
    env.SYSTEM_BACKUPS_ENABLED = "false";

    expect(validateClientStackEnvironment(env).errors).toEqual([]);
    expect(
      validateClientStackEnvironment(env, {
        ecommerce: true,
        email: true,
        backups: true,
        observability: true,
        clientFormProxy: true,
      }).errors,
    ).toEqual(
      expect.arrayContaining([
        "STRIPE_WEBHOOK_SECRET is required",
        "SMTP_PASS is required",
        "SYSTEM_BACKUPS_ENABLED must be true",
        "BACKUP_R2_BUCKET_NAME is required",
        "METRICS_BEARER_TOKEN is required",
        "CLIENT_FORM_PROXY_TOKEN is required",
      ]),
    );
  });

  it("requires explicit opt-in and a sufficiently strong metrics credential", () => {
    const env = completeEnvironment();
    env.METRICS_ENABLED = "false";
    env.METRICS_BEARER_TOKEN = "too-short";

    expect(validateClientStackEnvironment(env, { observability: true }).errors).toEqual(
      expect.arrayContaining([
        "METRICS_ENABLED must be true",
        "METRICS_BEARER_TOKEN must be at least 32 characters",
      ]),
    );
  });

  it("requires distinct, exact public and admin origins when the split topology is selected", () => {
    const env = completeEnvironment();
    env.APP_URL = "https://dashboard.example.com";
    env.PUBLIC_SITE_ORIGIN = "https://www.example.com";
    env.CORE_PLATFORM_ADMIN_ORIGIN = "https://dashboard.example.com";
    env.TRUSTED_ORIGINS = "https://www.example.com,https://dashboard.example.com";

    expect(
      validateClientStackEnvironment(env, { separatePublicAndAdminOrigins: true }).errors,
    ).toEqual([]);
  });

  it("requires the backup namespace to use the configured public client domain", () => {
    const env = completeEnvironment();
    env.APP_URL = "https://dashboard.example.com";
    env.PUBLIC_SITE_ORIGIN = "https://www.example.com";
    env.CORE_PLATFORM_ADMIN_ORIGIN = "https://dashboard.example.com";
    env.TRUSTED_ORIGINS = "https://www.example.com,https://dashboard.example.com";
    env.BACKUP_R2_PREFIX = "clients/pilot-acme/backups";

    expect(
      validateClientStackEnvironment(env, {
        backups: true,
        separatePublicAndAdminOrigins: true,
      }).errors,
    ).toContain(
      "BACKUP_R2_PREFIX must exactly match the client backup namespace derived from PUBLIC_SITE_ORIGIN",
    );

    env.BACKUP_R2_PREFIX = "clients/example.com/backups";
    expect(
      validateClientStackEnvironment(env, {
        backups: true,
        separatePublicAndAdminOrigins: true,
      }).errors,
    ).toEqual([]);
  });

  it("rejects ambiguous or untrusted split origins", () => {
    const env = completeEnvironment();
    env.APP_URL = "https://legacy.example.com";
    env.PUBLIC_SITE_ORIGIN = "https://dashboard.example.com";
    env.CORE_PLATFORM_ADMIN_ORIGIN = "https://dashboard.example.com";
    env.TRUSTED_ORIGINS = "https://legacy.example.com";

    expect(
      validateClientStackEnvironment(env, { separatePublicAndAdminOrigins: true }).errors,
    ).toEqual(
      expect.arrayContaining([
        "APP_URL must exactly match CORE_PLATFORM_ADMIN_ORIGIN for this topology",
        "TRUSTED_ORIGINS must include the exact PUBLIC_SITE_ORIGIN origin",
        "TRUSTED_ORIGINS must include the exact CORE_PLATFORM_ADMIN_ORIGIN origin",
      ]),
    );
  });

  it("requires the dashboard subdomain for split client stacks", () => {
    const env = completeEnvironment();
    env.APP_URL = "https://admin.example.com";
    env.PUBLIC_SITE_ORIGIN = "https://www.example.com";
    env.CORE_PLATFORM_ADMIN_ORIGIN = "https://admin.example.com";
    env.TRUSTED_ORIGINS = "https://www.example.com,https://admin.example.com";

    expect(
      validateClientStackEnvironment(env, { separatePublicAndAdminOrigins: true }).errors,
    ).toEqual(
      expect.arrayContaining([
        "CORE_PLATFORM_ADMIN_ORIGIN must use the dashboard hostname dashboard.example.com",
      ]),
    );
  });
});
