import type { PoolConfig } from "pg";
import { checkServerIdentity } from "node:tls";

/** One TLS authority: remove URL SSL options before node-postgres parses them. */
export function databasePoolConfig(env: NodeJS.ProcessEnv): PoolConfig {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname) {
    throw new Error("DATABASE_URL must be a PostgreSQL URL with a hostname");
  }
  // URL host overrides would invalidate the private-network destination check.
  for (const key of url.searchParams.keys()) {
    const lower = key.toLowerCase();
    if (
      ["host", "hostaddr", "uselibpqcompat"].includes(lower) ||
      (lower.startsWith("ssl") && key !== "sslmode")
    ) {
      throw new Error(
        "DATABASE_URL contains unsupported connection overrides; use DATABASE_TLS_MODE and DATABASE_TLS_CA",
      );
    }
  }
  if (env.PGSSLMODE) {
    throw new Error("Use DATABASE_TLS_MODE instead of PGSSLMODE");
  }
  const modes = url.searchParams.getAll("sslmode");
  if (modes.length > 1) throw new Error("DATABASE_URL contains duplicate sslmode options");
  const urlMode = modes[0];
  if (urlMode && !["disable", "require", "verify-full"].includes(urlMode)) {
    throw new Error("DATABASE_URL sslmode must be disable, require, or verify-full");
  }
  if (urlMode === "") throw new Error("DATABASE_URL sslmode cannot be empty");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const privateRailway =
    url.hostname.endsWith(".railway.internal") &&
    Boolean(env.RAILWAY_PROJECT_ID && env.RAILWAY_ENVIRONMENT_ID);
  const production = env.NODE_ENV === "production";
  const mode =
    env.DATABASE_TLS_MODE ||
    (urlMode === "disable"
      ? privateRailway
        ? "private"
        : "local"
      : !urlMode && local && !production
        ? "local"
        : "verify-full");
  if (!["verify-full", "private", "local"].includes(mode)) {
    throw new Error("DATABASE_TLS_MODE must be verify-full, private, or local");
  }
  if (
    urlMode &&
    ((urlMode === "disable" && mode === "verify-full") ||
      (urlMode !== "disable" && mode !== "verify-full"))
  ) {
    throw new Error("DATABASE_TLS_MODE conflicts with DATABASE_URL sslmode");
  }
  if (mode === "private" && !privateRailway) {
    throw new Error(
      "Private database mode requires a Railway internal hostname and Railway environment identity",
    );
  }
  if (mode === "local" && (!local || production)) {
    throw new Error("Local database mode is only allowed for loopback development/test databases");
  }
  if (env.DATABASE_TLS_CA && mode !== "verify-full") {
    throw new Error("DATABASE_TLS_CA requires verify-full mode");
  }
  url.searchParams.delete("sslmode");
  return {
    connectionString: url.toString(),
    ssl:
      mode === "verify-full"
        ? {
            rejectUnauthorized: true,
            // pg omits SNI for IP hosts; bind certificate identity to the URL,
            // rather than allowing TLS to fall back to a socket/default host.
            checkServerIdentity: (_hostname, certificate) =>
              checkServerIdentity(url.hostname.replace(/^\[|\]$/g, ""), certificate),
            ...(env.DATABASE_TLS_CA ? { ca: env.DATABASE_TLS_CA } : {}),
          }
        : false,
  };
}
