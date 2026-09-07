function parseOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function getPublicSiteOrigin(env: NodeJS.ProcessEnv = process.env): string | null {
  return parseOrigin(env.PUBLIC_SITE_ORIGIN) ?? parseOrigin(env.APP_URL);
}

/** The environment owns the deployed public origin; stored SEO data is only a legacy fallback. */
export function getEffectivePublicSiteOrigin(
  seoSiteUrl?: string | null,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return getPublicSiteOrigin(env) ?? parseOrigin(seoSiteUrl ?? undefined);
}

export function getCorePlatformAdminOrigin(env: NodeJS.ProcessEnv = process.env): string | null {
  return parseOrigin(env.CORE_PLATFORM_ADMIN_ORIGIN) ?? parseOrigin(env.APP_URL);
}

export function buildPublicSiteUrl(
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const origin = getPublicSiteOrigin(env);
  return origin ? new URL(path, origin).toString() : null;
}

export function buildCorePlatformAdminUrl(
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const origin = getCorePlatformAdminOrigin(env);
  return origin ? new URL(path, origin).toString() : null;
}
