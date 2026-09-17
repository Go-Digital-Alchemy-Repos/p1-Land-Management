import type { Capability } from "@workspace/api-zod/business-access";
import { HttpError } from "./policy";

type Method = "GET" | "POST" | "PUT" | "DELETE";
export interface CmsOperation {
  method: Method;
  path: string;
  capabilities: readonly Capability[];
  force?: boolean;
  ownerOnly?: boolean;
}
/** Explicit method/path pairs. Adding a Core route never exposes it automatically. */
export const cmsOperations: CmsOperation[] = [];
function add(
  tool: string,
  method: Method,
  path: string,
  extra: Capability[] = [],
  force = false,
) {
  cmsOperations.push({
    method,
    path,
    capabilities: [`marketing.content.${tool}` as Capability, ...extra],
    force,
  });
}
for (const tool of [
  "pages",
  "sections",
  "galleries",
  "menus",
  "sidebars",
  "redirects",
]) {
  const capability = tool === "redirects" ? "seo" : tool;
  add(capability, "GET", `/${tool}`);
  add(capability, "POST", `/${tool}`);
  if (tool !== "redirects") add(capability, "GET", `/${tool}/:id`);
  add(capability, "PUT", `/${tool}/:id`);
  add(capability, "DELETE", `/${tool}/:id`, [], tool === "pages");
}
for (const action of ["duplicate", "publish", "schedule", "unpublish"])
  add("pages", "POST", `/pages/:id/${action}`, [], action === "unpublish");
for (const action of ["relationships", "preview-link", "revisions"])
  add("pages", "GET", `/pages/:id/${action}`);
add("pages", "POST", "/pages/:id/relationships/remove-menu-items", [
  "marketing.content.menus",
]);
add("pages", "POST", "/pages/:pageId/revisions/:revisionId/restore");
add("sections", "POST", "/sections/system/starter-library");
for (const action of ["duplicate", "publish", "unpublish"])
  add("galleries", "POST", `/galleries/:id/${action}`);
for (const path of ["/seo", "/seo/robots-txt"]) {
  add("seo", "GET", path);
  add("seo", "PUT", path);
}
add("seo", "GET", "/seo-audit");
add("team", "GET", "/team");
add("team", "POST", "/team");
add("team", "PUT", "/team/:id");
add("menus", "GET", "/menu-references");
add("website", "GET", "/website");
add("website", "GET", "/website/:routeId/:componentKey");
add("website", "PUT", "/website/:routeId/:componentKey/draft");
add("website", "POST", "/website/:routeId/:componentKey/publish");
add("website", "GET", "/website/:routeId/:componentKey/revisions");
add("website", "POST", "/website/:routeId/:componentKey/revisions/:revision/restore");

const lockCapabilities: Record<string, Capability | null> = {
  cms_page: "marketing.content.pages",
  blog_post: "marketing.content.blog",
  event: "marketing.content.events",
  form: "marketing.content.forms",
  cms_section: "marketing.content.sections",
  cms_menu: "marketing.content.menus",
  cms_sidebar: "marketing.content.sidebars",
  doc: null,
  email_template: null,
};
for (const [resource, capability] of Object.entries(lockCapabilities)) {
  const access = {
    capabilities: capability ? [capability] : [],
    ownerOnly: capability === null,
  };
  cmsOperations.push({
    method: "GET",
    path: `/editor-locks/resource/${resource}`,
    ...access,
  });
  cmsOperations.push({
    method: "GET",
    path: `/editor-locks/${resource}/:id`,
    ...access,
  });
  for (const action of ["acquire", "heartbeat", "release"])
    cmsOperations.push({
      method: "POST",
      path: `/editor-locks/${resource}/:id/${action}`,
      ...access,
    });
}

export function cmsDestination(
  operation: CmsOperation,
  params: Record<string, unknown>,
  query: Record<string, unknown>,
) {
  if (!cmsOperations.includes(operation))
    throw new HttpError(404, "CMS operation not found");
  const path = operation.path.replace(/:([A-Za-z]+)/g, (_match, key) => {
    const value = params[key];
    // IDs/slugs are single segments. Do not allow encoded traversal, separators or URLs.
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(value))
      throw new HttpError(400, "Invalid CMS record identifier");
    return value;
  });
  if (operation.method === "GET" && operation.path === "/galleries") {
    if (
      Object.keys(query).some(
        (key) => !["search", "status", "sort"].includes(key),
      ) ||
      (query.search !== undefined &&
        (typeof query.search !== "string" || query.search.length > 500)) ||
      (query.status !== undefined &&
        !["draft", "published", "archived"].includes(String(query.status))) ||
      (query.sort !== undefined &&
        !["created", "title", "updated"].includes(String(query.sort))) ||
      Object.values(query).some((value) => typeof value !== "string")
    )
      throw new HttpError(400, "Invalid gallery filters");
    const search = new URLSearchParams(query as Record<string, string>);
    return path + (search.size ? `?${search}` : "");
  }
  if (
    Object.keys(query).some((key) => key !== "force" || !operation.force) ||
    (query.force !== undefined &&
      query.force !== "true" &&
      query.force !== "false")
  )
    throw new HttpError(400, "Invalid CMS query");
  return path + (query.force === undefined ? "" : `?force=${query.force}`);
}

async function boundedJson(response: Response) {
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw Error();
  const reader = response.body?.getReader();
  if (!reader) throw Error();
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8 * 1024 * 1024) {
      await reader.cancel();
      throw Error();
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function callCms(
  connection: { origin: string; key: string },
  operation: CmsOperation,
  params: Record<string, unknown>,
  query: Record<string, unknown>,
  body: unknown,
  grantId: string,
  transport: typeof fetch = fetch,
) {
  const path = cmsDestination(operation, params, query);
  const payload =
    operation.method === "POST" || operation.method === "PUT"
      ? JSON.stringify(body ?? {})
      : undefined;
  if (payload && Buffer.byteLength(payload) > 8 * 1024 * 1024)
    throw new HttpError(413, "CMS content is too large");
  try {
    const response = await transport(
      `${connection.origin}/api/integrations/business-center/cms${path}`,
      {
        method: operation.method,
        redirect: "error",
        signal: AbortSignal.timeout(30000),
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${connection.key}`,
          "x-p1-user-grant": grantId,
        },
        body: payload,
      },
    );
    // Preserve domain validation/conflict payloads (e.g. linked menu references).
    // Never pass cookies, upstream response headers or internal failures to the browser.
    if (![200, 201, 400, 404, 409, 422].includes(response.status)) {
      await response.body?.cancel();
      throw new HttpError(
        [401, 403, 429].includes(response.status) ? response.status : 503,
        "Website operation unavailable. Refresh before retrying any change.",
      );
    }
    return { status: response.status, body: await boundedJson(response) };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      503,
      "Website operation unavailable. Refresh before retrying any change.",
    );
  }
}
