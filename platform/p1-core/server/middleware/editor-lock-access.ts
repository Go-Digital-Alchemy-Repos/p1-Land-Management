import type { Request } from "express";
import type { EditorLockResourceType } from "@shared/schema";
import { hasBusinessCapability } from "./auth";
import { AppError } from "./error-handler";

const resourceCapabilities: Record<EditorLockResourceType, string | null> = {
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

/** Reserving or enumerating edits requires the same canonical authority as editing. */
export function requireEditorLockAccess(req: Request, resourceType: EditorLockResourceType) {
  if (!req.user) throw new AppError("Unauthorized", 401);
  const capability = resourceCapabilities[resourceType];
  const identity = req.dashboardIdentity;
  const allowed = capability
    ? hasBusinessCapability(identity, capability)
    : identity?.active === true && identity.role === "owner" && identity.ownerAttested === true;
  if (!allowed) throw new AppError("Business Center permission required", 403);
}
