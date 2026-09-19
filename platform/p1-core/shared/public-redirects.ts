export type PublicRedirect = { fromPath: string; toPath: string; statusCode: 301 | 302 };
export class RedirectPolicyError extends Error {
  constructor(
    public status: 400 | 409,
    message: string,
  ) {
    super(message);
  }
}
export const reservedRedirectPaths = [
  "/admin",
  "/api",
  "/uploads",
  "/r2",
  "/assets",
  "/cms-preview",
  "/healthz",
  "/robots.txt",
  "/sitemap.xml",
  "/setup",
  "/favicon.ico",
  "/favicon.svg",
  "/p1-symbol.svg",
  "/apple-touch-icon.png",
  "/favicon-32.png",
  "/testimonials",
  "/commercial-snow-ice-management",
  "/services/commercial-property-management",
  "/service-areas/charlotte-nc",
];
export function validRedirectPath(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !/^\/[A-Za-z0-9/_.~-]*$/.test(value) ||
    value.includes("//") ||
    value.split("/").some((p) => p === "." || p === "..") ||
    (value !== "/" && value.endsWith("/")) ||
    value.endsWith(".html") ||
    value.endsWith("/index")
  )
    return false;
  return !reservedRedirectPaths.some((p) => value === p || value.startsWith(p + "/"));
}
export function validateRedirectCollection(
  rows: readonly { fromPath: string; toPath: string; statusCode: number; isActive?: boolean }[],
): PublicRedirect[] {
  const active = rows.filter((r) => r.isActive !== false);
  if (active.length > 1000)
    throw new RedirectPolicyError(400, "At most 1000 active redirects are supported.");
  const rules = new Map<string, PublicRedirect>();
  for (const row of active) {
    if (
      !validRedirectPath(row.fromPath) ||
      !validRedirectPath(row.toPath) ||
      ![301, 302].includes(row.statusCode)
    )
      throw new RedirectPolicyError(
        400,
        "Active redirects require canonical same-site paths without queries, fragments or reserved routes. Review or deactivate invalid rules.",
      );
    if (rules.has(row.fromPath))
      throw new RedirectPolicyError(409, "An active redirect for this path already exists.");
    rules.set(row.fromPath, {
      fromPath: row.fromPath,
      toPath: row.toPath,
      statusCode: row.statusCode as 301 | 302,
    });
  }
  for (const start of rules.keys()) {
    const seen = new Set<string>();
    let next: string | undefined = start;
    while (next && rules.has(next)) {
      if (seen.has(next)) throw new RedirectPolicyError(409, "Redirect cycles are not permitted.");
      seen.add(next);
      next = rules.get(next)?.toPath;
    }
  }
  return [...rules.values()].sort((a, b) => a.fromPath.localeCompare(b.fromPath));
}
