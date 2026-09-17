const publicPaths = new Set([
  "/api/branding",
  "/api/cms/team",
  "/api/blog",
  "/api/events",
  "/api/events/all",
  "/api/events/recordings",
  "/api/careers/jobs",
  "/api/careers/filters",
  "/api/therapists/featured",
]);

/** Install only in the dedicated preview document, before mounting renderers.
 * Explicit query functions in retained dynamic blocks use global fetch, so a
 * QueryClient default alone cannot enforce the anonymous, read-only boundary.
 */
export function createBuilderPreviewFetch(origin: string, transport: typeof fetch): typeof fetch {
  const base = new URL(origin);
  if (base.origin !== origin || !["https:", "http:"].includes(base.protocol))
    throw new Error("Invalid preview origin");
  return async (input, init) => {
    const request = new Request(
      typeof input === "string" || input instanceof URL ? new URL(input, origin) : input,
      init,
    );
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== origin || url.username || url.password)
      throw new Error("This request is unavailable in a draft preview");
    // Recording blocks inspect authentication. Always render their public state;
    // never send an account lookup or consult the editor's Core session cookie.
    if (url.pathname === "/api/auth/me" && !url.search)
      return new Response("null", { headers: { "Content-Type": "application/json" } });
    const reference = /^\/api\/(?:cms\/galleries|forms)\/[a-zA-Z0-9_-]+$/.test(url.pathname);
    if (!publicPaths.has(url.pathname) && !reference)
      throw new Error("This request is unavailable in a draft preview");
    return transport(url.href, {
      method: "GET",
      credentials: "omit",
      redirect: "error",
      mode: "same-origin",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: request.signal,
      headers: { Accept: "application/json" },
    });
  };
}
