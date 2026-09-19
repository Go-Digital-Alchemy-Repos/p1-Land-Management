import { marketingConnection } from "./marketing-reporting.transport";
import type { Capability } from "@workspace/api-zod/business-access";
import { HttpError } from "./policy";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export interface CmsOperation {
  method: Method;
  path: string;
  capabilities: readonly Capability[];
  force?: boolean;
  ownerOnly?: boolean;
  multipart?: boolean;
  binary?: boolean;
}
/** Explicit method/path pairs. Adding a Core route never exposes it automatically. */
export const cmsOperations: CmsOperation[] = [];
for (const [method, path] of [
  ["GET", "/website-system/backups/status"],
  ["POST", "/website-system/backups/run"],
  ["GET", "/website-system/integrations"],
  ["PUT", "/website-system/integrations/:provider"],
  ["POST", "/website-system/integrations/:provider/test"],
  ["GET", "/website-system/email-templates"],
  ["PUT", "/website-system/email-templates/:slug"],
  ["POST", "/website-system/email-templates/restore"],
  ["POST", "/website-system/email-templates/:slug/preview"],
  ["POST", "/website-system/email-templates/:slug/test"],
  ["POST", "/website-system/onboarding/domain-plan"],
  ["POST", "/website-system/onboarding/dns-verification"],
  ["POST", "/website-system/onboarding/readiness"],
  ["GET", "/website-system/onboarding/:stackId/evidence"],
  ["GET", "/website-system/docs"], ["POST", "/website-system/docs"],
  ["POST", "/website-system/docs/sync"], ["PUT", "/website-system/docs/:id"],
  ["DELETE", "/website-system/docs/:id"],
] as const) cmsOperations.push({method, path, capabilities:[], ownerOnly:true});
cmsOperations.push({method:"POST",path:"/design/branding/assets",capabilities:["marketing.design.branding"],multipart:true});
for (const method of ["GET", "PUT"] as const) cmsOperations.push({method,path:"/design/branding",capabilities:["marketing.design.branding"]});
for (const path of ["/website-system/head-tags", "/website-system/features"]) {
  for (const method of ["GET", "PUT"] as const) cmsOperations.push({method,path,capabilities:[],ownerOnly:true});
}
for (const method of ["GET", "PUT"] as const) cmsOperations.push({method,path:"/design/colors",capabilities:["marketing.design.colors"]});
for (const method of ["GET", "PUT"] as const) cmsOperations.push({method,path:"/design/typography",capabilities:["marketing.design.typography"]});
for (const method of ["GET", "PUT"] as const) cmsOperations.push({method,path:"/design/social-media",capabilities:["marketing.design.social-media"]});
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
add("sidebars", "GET", "/sidebar-references");
add("sections", "GET", "/section-builder");
add("pages", "GET", "/page-builder");
add("forms", "GET", "/form-builder");
for (const path of ["/events", "/events/venues", "/events/organizers"]) {
  add("events", "GET", path);
  add("events", "POST", path);
}
for (const path of [
  "/events/:id",
  "/events/venues/:venueId",
  "/events/organizers/:organizerId",
]) {
  add("events", "PUT", path);
  add("events", "DELETE", path);
}
add("events", "GET", "/events/registration-forms");
add("events", "GET", "/events/:id");
add("events", "GET", "/events/:id/analytics");
add("events", "GET", "/events/:eventId/attendees");
add("events", "PUT", "/events/:eventId/attendees/:id/checkin");
add("events", "POST", "/events/:id/duplicate");
add("events", "POST", "/events/:id/notify");

for (const path of [
  "/careers/jobs",
  "/careers/jobs/:id",
  "/careers/applications",
  "/careers/applications/:id",
])
  add("careers", "GET", path);
add("careers", "POST", "/careers/jobs");
add("careers", "PUT", "/careers/jobs/:id");
add("careers", "DELETE", "/careers/jobs/:id");
add("careers", "PUT", "/careers/applications/:id");
cmsOperations.push({
  method: "GET",
  path: "/careers/applications/:id/resume",
  capabilities: ["marketing.content.careers"],
  binary: true,
});
for (const method of ["GET", "PUT"] as const)
  cmsOperations.push({
    method,
    path: "/careers/settings",
    capabilities: [],
    ownerOnly: true,
  });

add("website", "GET", "/website");
add("website", "GET", "/website/:routeId/:componentKey");
add("website", "PUT", "/website/:routeId/:componentKey/draft");
add("website", "POST", "/website/:routeId/:componentKey/publish");
add("website", "GET", "/website/:routeId/:componentKey/revisions");
add(
  "website",
  "POST",
  "/website/:routeId/:componentKey/revisions/:revision/restore",
);

add("media", "GET", "/media");
add("media", "PATCH", "/media/:id");
add("media", "PATCH", "/media/:id/alt");
add("media", "DELETE", "/media/:id");
for (const path of ["/upload", "/media/:id/replace"])
  cmsOperations.push({
    method: "POST",
    path,
    capabilities: ["marketing.content.media"],
    multipart: true,
  });
cmsOperations.push({
  method: "GET",
  path: "/media/:id/source",
  capabilities: ["marketing.content.media"],
  binary: true,
});

for (const method of ["GET", "POST"] as const) add("blog", method, "/blog");
for (const method of ["GET", "POST"] as const)
  add("blog", method, "/blog/publications");
add("blog", "GET", "/blog/publications/:id");
for (const action of ["adopt", "actions"])
  add("blog", "POST", `/blog/publications/:id/${action}`);
for (const action of ["revisions", "preview"])
  add("blog", "GET", `/blog/publications/:id/${action}`);
add("blog", "GET", "/blog/references");
for (const method of ["GET", "POST"] as const)
  add("blog", method, "/blog/settings/taxonomies");
for (const method of ["PUT", "DELETE"] as const)
  add("blog", method, "/blog/settings/taxonomies/:id");
for (const method of ["GET", "PUT"] as const)
  add("blog", method, "/blog/settings/comments");
add("blog", "GET", "/blog/comments");
add("blog", "PATCH", "/blog/comments/:id/status");
for (const method of ["PUT", "DELETE"] as const)
  add("blog", method, "/blog/comments/:id");

for (const method of ["GET", "PUT", "DELETE"] as const)
  add("blog", method, "/blog/:id");

cmsOperations.push({
  method: "GET",
  path: "/notification-forms",
  capabilities: [],
  ownerOnly: true,
});

for (const method of ["GET", "POST"] as const) add("forms", method, "/forms");
for (const method of ["GET", "PUT", "DELETE"] as const)
  add("forms", method, "/forms/:id");
add("forms", "GET", "/forms/:id/submissions");
add("forms", "DELETE", "/forms/:id/submissions/:submissionId");
add("forms", "GET", "/form-delivery-jobs");
add("forms", "POST", "/form-delivery-jobs/:id/retry");
cmsOperations.push({
  method: "POST",
  path: "/form-delivery-jobs/commercial-backfill",
  capabilities: ["marketing.content.forms"],
  ownerOnly: true,
});

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
  if (operation.method === "GET" && operation.path === "/blog/publications/:id/preview") {
    if (
      Object.keys(query).some((key) => key !== "revisionId") ||
      (query.revisionId !== undefined &&
        (typeof query.revisionId !== "string" ||
          !/^[A-Za-z0-9_-]{1,160}$/.test(query.revisionId)))
    ) throw new HttpError(400, "Invalid Blog preview query");
    return path + (query.revisionId === undefined ? "" : `?revisionId=${query.revisionId}`);
  }
  if (operation.method === "GET" && operation.path === "/blog/comments") {
    if (
      Object.keys(query).some((key) => key !== "status") ||
      (query.status !== undefined &&
        (typeof query.status !== "string" ||
          !["pending", "approved", "spam", "rejected"].includes(query.status)))
    )
      throw new HttpError(400, "Invalid comment filters");
    return path + (query.status === undefined ? "" : `?status=${query.status}`);
  }
  if (operation.method === "GET" && operation.path === "/form-delivery-jobs") {
    if (
      Object.keys(query).some(
        (key) => !["limit", "status", "cursor"].includes(key),
      ) ||
      Object.values(query).some((value) => typeof value !== "string") ||
      (query.limit !== undefined &&
        (!/^[0-9]{1,3}$/.test(String(query.limit)) ||
          Number(query.limit) < 1 ||
          Number(query.limit) > 200)) ||
      (query.status !== undefined &&
        !["actionable", "completed", "all"].includes(String(query.status))) ||
      (query.cursor !== undefined &&
        !/^[A-Za-z0-9_-]{1,1024}$/.test(String(query.cursor)))
    )
      throw new HttpError(400, "Invalid form delivery filters");
    const search = new URLSearchParams(query as Record<string, string>);
    return path + (search.size ? `?${search}` : "");
  }
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

async function boundedBytes(response: Response, limit: number) {
  const reader = response.body?.getReader();
  if (!reader) throw Error();
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw Error();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
async function boundedJson(response: Response) {
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw Error();
  return JSON.parse(
    (await boundedBytes(response, 8 * 1024 * 1024)).toString("utf8"),
  );
}
export async function callCms(
  connection: { origin: string; key: string },
  operation: CmsOperation,
  params: Record<string, unknown>,
  query: Record<string, unknown>,
  body: unknown,
  grantId: string,
  transport: typeof fetch = fetch,
  requestContentType?: string,
) {
  const path = cmsDestination(operation, params, query);
  if (
    operation.multipart &&
    (!Buffer.isBuffer(body) ||
      !requestContentType ||
      !/^multipart\/form-data;\s*boundary=(?:[A-Za-z0-9'()+_,.\/:=?-]{1,70}|"[A-Za-z0-9'()+_,.\/:=?-]{1,70}")$/.test(
        requestContentType,
      ))
  )
    throw new HttpError(400, "A multipart file upload is required");
  const payload = operation.multipart
    ? (body as Buffer)
    : operation.method === "POST" ||
        operation.method === "PUT" ||
        operation.method === "PATCH" ||
        (operation.method === "DELETE" && ["/careers/jobs/:id", "/website-system/docs/:id", "/pages/:id", "/menus/:id"].includes(operation.path))
      ? JSON.stringify(body ?? {})
      : undefined;
  if (
    payload &&
    Buffer.byteLength(payload) > (operation.multipart ? 11 : 8) * 1024 * 1024
  )
    throw new HttpError(413, "CMS content is too large");
  try {
    const response = await transport(
      `${connection.origin}/api/integrations/business-center/cms${path}`,
      {
        method: operation.method,
        redirect: "error",
        signal: AbortSignal.timeout(30000),
        headers: {
          "content-type": operation.multipart
            ? requestContentType!
            : "application/json",
          authorization: `Bearer ${connection.key}`,
          "x-p1-user-grant": grantId,
        },
        body: payload as NonNullable<Parameters<typeof fetch>[1]>["body"],
      },
    );
    // Preserve domain validation/conflict payloads (e.g. linked menu references).
    // Never pass cookies, upstream response headers or internal failures to the browser.
    if (![200, 201, 400, 404, 409, 422].includes(response.status)) {
      await response.body?.cancel();
      throw new HttpError(
        [401, 403, 413, 429].includes(response.status) ? response.status : 503,
        "Website operation unavailable. Refresh before retrying any change.",
      );
    }
    if (operation.binary && response.status === 200) {
      const contentType =
        response.headers
          .get("content-type")
          ?.split(";")[0]
          .trim()
          .toLowerCase() || "application/octet-stream";
      const safeType = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
      ].includes(contentType)
        ? contentType
        : "application/octet-stream";
      return {
        status: 200,
        body: await boundedBytes(response, 11 * 1024 * 1024),
        contentType: safeType,
      };
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

/** Framing follows the same validated Core connection as CMS requests. */
export function marketingPreviewFrameSources(env = process.env): string[] {
  const sources = new Set(["https://www.p1landmanagement.com"]);
  try {
    const origin = marketingConnection(env).origin;
    if (!new URL(origin).hostname.includes("*")) sources.add(origin);
  } catch {
    /* Unconfigured CMS stays closed. */
  }
  return [...sources];
}
