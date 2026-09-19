import {
  validateRedirectCollection,
  validRedirectPath,
  type PublicRedirect,
} from "../../../../platform/p1-core/shared/public-redirects";

/** The browser consumes the same validated gateway snapshot as document requests. */
export function clientRedirectDestination(
  data: unknown,
  pathname: string,
  search: string,
): string | null {
  if (!validRedirectPath(pathname)) return null;
  if (!data || typeof data !== "object") return null;
  const projection = data as Record<string, unknown>;
  if (
    projection.schemaVersion !== 1 ||
    projection.stackId !== "p1-land-management" ||
    typeof projection.version !== "string" ||
    !/^[a-f0-9]{64}$/.test(projection.version) ||
    !Array.isArray(projection.redirects) ||
    projection.redirects.length > 1000
  )
    return null;
  if (
    !projection.redirects.every(
      (row) =>
        row &&
        typeof row === "object" &&
        Object.keys(row).sort().join(",") === "fromPath,statusCode,toPath",
    )
  )
    return null;
  try {
    const rules = validateRedirectCollection(
      projection.redirects as PublicRedirect[],
    );
    const rule = rules.find((row) => row.fromPath === pathname);
    // Search comes from window.location.search, never from the projection.
    if (search && (!search.startsWith("?") || /[\r\n#]/.test(search)))
      return null;
    return rule ? rule.toPath + search : null;
  } catch {
    return null;
  }
}

export async function checkClientRedirect(
  pathname: string,
  search: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  if (!validRedirectPath(pathname)) return null;
  try {
    const response = await fetcher("/api/p1/website-redirects", {
      signal,
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (
      !response.ok ||
      !/^application\/json(?:\s*;|$)/i.test(
        response.headers.get("content-type") || "",
      )
    )
      return null;
    const data: unknown = await response.json();
    return signal.aborted
      ? null
      : clientRedirectDestination(data, pathname, search);
  } catch {
    // An unavailable optional projection must not strand client navigation.
    return null;
  }
}
