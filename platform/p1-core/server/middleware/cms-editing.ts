import type { RequestHandler } from "express";
import { requireBusinessCapability } from "./auth";

// The flag is resolved once per Core process. A CMS restart is required to
// reopen editing after the copy release has been reviewed.
export const cmsEditingEnabled = process.env.P1_CMS_EDITING === "enabled";
console.info(`cms.editing=${cmsEditingEnabled ? "enabled" : "paused"}`);

export const cmsEditingStatus = Object.freeze({
  editing: cmsEditingEnabled ? "enabled" : "paused",
});

export const requireCmsEditing: RequestHandler = (req, res, next) => {
  if (cmsEditingEnabled || ["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  res.status(423).json({
    error: "cms_paused",
    message: "Website editing is paused while the site copy is being updated.",
  });
};

// Only page-copy collections are paused. Media, redirects, forms, head tags,
// colors, typography, social links and analytics remain operational.
export const requireCmsEditingForContent: RequestHandler = (req, res, next) => {
  const tool = /^\/(pages|sections|galleries|menus|sidebars)(?:\/|$)/.exec(req.path)?.[1];
  if (!tool || ["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  requireBusinessCapability(`marketing.content.${tool}`)(req, res, () =>
    requireCmsEditing(req, res, next),
  );
};
