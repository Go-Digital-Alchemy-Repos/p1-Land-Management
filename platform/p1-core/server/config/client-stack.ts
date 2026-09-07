import { getDashboardOriginPolicyError } from "../../shared/client-origin-policy";
import { getClientBackupPrefix } from "../../shared/client-backup-policy";

export interface ClientStackRequirements {
  ecommerce?: boolean;
  email?: boolean;
  backups?: boolean;
  observability?: boolean;
  clientFormProxy?: boolean;
  separatePublicAndAdminOrigins?: boolean;
}

export interface ClientStackValidationResult {
  stackId: string | null;
  corePlatformOrigin: string | null;
  errors: string[];
}

const STACK_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function present(env: NodeJS.ProcessEnv, key: string) {
  return Boolean(env[key]?.trim());
}

function requireVariables(env: NodeJS.ProcessEnv, keys: string[], errors: string[]) {
  for (const key of keys) {
    if (!present(env, key)) errors.push(`${key} is required`);
  }
}

function parseCanonicalOrigin(value: string | undefined, key: string, errors: string[]) {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") {
      errors.push(`${key} must use https`);
    }
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      errors.push(`${key} must be an origin only, without credentials, path, query, or fragment`);
    }
    if (value.trim() !== url.origin) {
      errors.push(`${key} must be canonical and must not include a trailing slash`);
    }
    return url.origin;
  } catch {
    errors.push(`${key} must be a valid absolute URL`);
    return null;
  }
}

export function validateClientStackEnvironment(
  env: NodeJS.ProcessEnv,
  requirements: ClientStackRequirements = {},
): ClientStackValidationResult {
  const errors: string[] = [];
  const stackId = env.CLIENT_STACK_ID?.trim() || null;

  requireVariables(
    env,
    ["CLIENT_STACK_ID", "DATABASE_URL", "SESSION_SECRET", "SETUP_TOKEN", "APP_URL"],
    errors,
  );

  if (stackId && !STACK_ID_PATTERN.test(stackId)) {
    errors.push("CLIENT_STACK_ID must be a lowercase kebab-case identifier");
  }

  const sessionSecret = env.SESSION_SECRET?.trim();
  if (sessionSecret && (sessionSecret === "dev-secret-change-me" || sessionSecret.length < 32)) {
    errors.push(
      "SESSION_SECRET must be unique to the stack, non-default, and at least 32 characters",
    );
  }

  if (env.DATABASE_URL?.trim()) {
    try {
      const databaseUrl = new URL(env.DATABASE_URL.trim());
      if (!(["postgres:", "postgresql:"] as string[]).includes(databaseUrl.protocol)) {
        errors.push("DATABASE_URL must use the postgres or postgresql protocol");
      }
    } catch {
      errors.push("DATABASE_URL must be a valid PostgreSQL URL");
    }
  }

  const corePlatformOrigin = parseCanonicalOrigin(env.APP_URL, "APP_URL", errors);
  let publicSiteOrigin: string | null = null;
  let adminOrigin: string | null = null;

  if (requirements.separatePublicAndAdminOrigins) {
    requireVariables(env, ["PUBLIC_SITE_ORIGIN", "CORE_PLATFORM_ADMIN_ORIGIN"], errors);
    publicSiteOrigin = parseCanonicalOrigin(env.PUBLIC_SITE_ORIGIN, "PUBLIC_SITE_ORIGIN", errors);
    adminOrigin = parseCanonicalOrigin(
      env.CORE_PLATFORM_ADMIN_ORIGIN,
      "CORE_PLATFORM_ADMIN_ORIGIN",
      errors,
    );
    if (publicSiteOrigin && adminOrigin) {
      const dashboardOriginError = getDashboardOriginPolicyError(publicSiteOrigin, adminOrigin);
      if (dashboardOriginError) {
        errors.push(`CORE_PLATFORM_ADMIN_ORIGIN ${dashboardOriginError}`);
      }
    }
    if (corePlatformOrigin && adminOrigin && corePlatformOrigin !== adminOrigin) {
      errors.push("APP_URL must exactly match CORE_PLATFORM_ADMIN_ORIGIN for this topology");
    }
  }

  const trustedOrigins = (env.TRUSTED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (trustedOrigins.length === 0) {
    errors.push("TRUSTED_ORIGINS must include APP_URL");
  } else {
    const normalized = trustedOrigins
      .map((origin, index) =>
        parseCanonicalOrigin(origin, `TRUSTED_ORIGINS entry ${index + 1}`, errors),
      )
      .filter((origin): origin is string => Boolean(origin));
    if (corePlatformOrigin && !normalized.includes(corePlatformOrigin)) {
      errors.push("TRUSTED_ORIGINS must include the exact APP_URL origin");
    }
    if (publicSiteOrigin && !normalized.includes(publicSiteOrigin)) {
      errors.push("TRUSTED_ORIGINS must include the exact PUBLIC_SITE_ORIGIN origin");
    }
    if (adminOrigin && !normalized.includes(adminOrigin)) {
      errors.push("TRUSTED_ORIGINS must include the exact CORE_PLATFORM_ADMIN_ORIGIN origin");
    }
    if (new Set(normalized).size !== normalized.length) {
      errors.push("TRUSTED_ORIGINS must not contain duplicate origins");
    }
  }

  if (requirements.ecommerce) {
    requireVariables(
      env,
      ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"],
      errors,
    );
  }

  if (requirements.email) {
    requireVariables(env, ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"], errors);
    const port = Number.parseInt(env.SMTP_PORT || "587", 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push("SMTP_PORT must be an integer between 1 and 65535");
    }
  }

  if (requirements.backups) {
    if (env.SYSTEM_BACKUPS_ENABLED !== "true") {
      errors.push("SYSTEM_BACKUPS_ENABLED must be true");
    }
    requireVariables(
      env,
      [
        "BACKUP_R2_ACCOUNT_ID",
        "BACKUP_R2_ACCESS_KEY_ID",
        "BACKUP_R2_SECRET_ACCESS_KEY",
        "BACKUP_R2_BUCKET_NAME",
      ],
      errors,
    );
    const prefix = env.BACKUP_R2_PREFIX?.trim();
    if (prefix) {
      const expectedPrefix = getClientBackupPrefix(
        stackId ?? undefined,
        publicSiteOrigin ?? undefined,
      );
      if (prefix.replace(/^\/+|\/+$/g, "") !== expectedPrefix) {
        errors.push(
          "BACKUP_R2_PREFIX must exactly match the client backup namespace derived from PUBLIC_SITE_ORIGIN",
        );
      }
    }
  }

  if (requirements.observability) {
    if (env.METRICS_ENABLED !== "true") {
      errors.push("METRICS_ENABLED must be true");
    }
    requireVariables(env, ["METRICS_BEARER_TOKEN"], errors);
    const metricsToken = env.METRICS_BEARER_TOKEN?.trim();
    if (metricsToken && metricsToken.length < 32) {
      errors.push("METRICS_BEARER_TOKEN must be at least 32 characters");
    }
  }

  if (requirements.clientFormProxy) {
    requireVariables(env, ["CLIENT_FORM_PROXY_TOKEN"], errors);
  }

  return { stackId, corePlatformOrigin, errors };
}
